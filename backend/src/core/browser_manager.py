import asyncio
from contextlib import asynccontextmanager, contextmanager
import inspect
import logging
import os
import threading
from typing import Any, Dict, Set

logger = logging.getLogger(__name__)


class SessionBusyError(RuntimeError):
    """Indica que o diretório de perfil do Chromium já está em uso por outra operação."""
    pass


class BrowserManager:
    """
    Gerenciador thread-safe centralizado para instâncias de navegadores e contextos do Playwright.
    - Garante exclusão mútua por (user_id, plataforma) evitando colisão de SingletonLock no user_data_dir.
    - Remove arquivos SingletonLock/SingletonSocket/SingletonCookie órfãos deixados por crashes ou reinícios de container Docker.
    - Permite interromper e fechar navegadores ativos quando o usuário faz logout.
    """
    _lock = threading.Lock()
    _active_browsers: Dict[str, Set[Any]] = {}
    _cancelled_users: Set[str] = set()
    _session_locks: Dict[str, threading.RLock] = {}

    DEFAULT_CHROMIUM_ARGS = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
    ]

    SINGLETON_FILES = ("SingletonLock", "SingletonSocket", "SingletonCookie")

    @classmethod
    def get_session_lock(cls, user_id: str, platform: str = "default") -> threading.RLock:
        """Retorna o lock exclusivo associado ao par (user_id, platform)."""
        key = f"{user_id}:{platform.lower().strip()}"
        with cls._lock:
            if key not in cls._session_locks:
                cls._session_locks[key] = threading.RLock()
            return cls._session_locks[key]

    @classmethod
    def cleanup_profile_locks(cls, session_dir: str | None):
        """
        Remove arquivos de trava órfãos do Chromium (SingletonLock, SingletonSocket, SingletonCookie)
        do diretório de perfil. Deve ser chamado apenas quando o lock de sessão estiver adquirido.
        """
        if not session_dir or not os.path.exists(session_dir):
            return

        for fname in cls.SINGLETON_FILES:
            fpath = os.path.join(session_dir, fname)
            try:
                # lexists retorna True mesmo para symlinks quebrados (como SingletonLock do Chromium)
                if os.path.lexists(fpath):
                    os.unlink(fpath)
                    logger.debug(f"[BrowserManager] Removido arquivo de lock órfão: {fpath}")
            except FileNotFoundError:
                pass
            except Exception as e:
                logger.warning(f"[BrowserManager] Não foi possível remover {fpath}: {e}")

    @classmethod
    @contextmanager
    def session_guard(
        cls,
        user_id: str,
        platform: str,
        session_dir: str | None = None,
        blocking: bool = True,
        timeout: float = 60.0,
    ):
        """
        Context manager síncrono que serializa o acesso ao user_data_dir de (user_id, platform)
        e limpa travas órfãs antes e depois da execução.
        """
        lock = cls.get_session_lock(user_id, platform)
        if blocking:
            acquired = lock.acquire(blocking=True, timeout=timeout)
        else:
            acquired = lock.acquire(blocking=False)

        if not acquired:
            raise SessionBusyError(
                f"O perfil '{platform}' do usuário {user_id} já está em uso por outra tarefa."
            )

        try:
            cls.cleanup_profile_locks(session_dir)
            yield
        finally:
            try:
                cls.cleanup_profile_locks(session_dir)
            finally:
                lock.release()

    @classmethod
    @asynccontextmanager
    async def async_session_guard(
        cls,
        user_id: str,
        platform: str,
        session_dir: str | None = None,
        blocking: bool = False,
        timeout: float = 30.0,
    ):
        """
        Context manager assíncrono que serializa o acesso ao user_data_dir sem bloquear o event loop.
        """
        lock = cls.get_session_lock(user_id, platform)
        if not blocking:
            acquired = lock.acquire(blocking=False)
        else:
            acquired = await asyncio.to_thread(lock.acquire, True, timeout)

        if not acquired:
            raise SessionBusyError(
                f"O perfil '{platform}' do usuário {user_id} já está em uso por outra tarefa."
            )

        try:
            cls.cleanup_profile_locks(session_dir)
            yield
        finally:
            try:
                cls.cleanup_profile_locks(session_dir)
            finally:
                lock.release()

    @classmethod
    def close_browser_safely(cls, user_id: str, browser: Any, page: Any = None):
        """Fecha página(s) e contexto do navegador de forma segura e desregistra do gerenciador."""
        cls.unregister_browser(user_id, browser)
        if page is not None:
            try:
                page.close()
            except Exception as e:
                logger.debug(f"[BrowserManager] Ignorando erro ao fechar page para {user_id}: {e}")

        if browser is not None:
            try:
                if hasattr(browser, "pages"):
                    for p in list(browser.pages):
                        try:
                            p.close()
                        except Exception:
                            pass
            except Exception:
                pass

            try:
                browser.close()
            except Exception as e:
                logger.debug(f"[BrowserManager] Ignorando erro ao fechar browser para {user_id}: {e}")

    @classmethod
    async def close_browser_safely_async(cls, user_id: str, browser: Any, page: Any = None):
        """Fecha página(s) e contexto assíncrono do navegador de forma segura e desregistra do gerenciador."""
        cls.unregister_browser(user_id, browser)
        if page is not None:
            try:
                await page.close()
            except Exception as e:
                logger.debug(f"[BrowserManager] Ignorando erro ao fechar async page para {user_id}: {e}")

        if browser is not None:
            try:
                if hasattr(browser, "pages"):
                    for p in list(browser.pages):
                        try:
                            await p.close()
                        except Exception:
                            pass
            except Exception:
                pass

            try:
                await browser.close()
            except Exception as e:
                logger.debug(f"[BrowserManager] Ignorando erro ao fechar async browser para {user_id}: {e}")

    @classmethod
    def register_browser(cls, user_id: str, browser: Any):
        """Registra uma instância de browser ou BrowserContext associada a um usuário."""
        if not user_id or not browser:
            return
        with cls._lock:
            if user_id not in cls._active_browsers:
                cls._active_browsers[user_id] = set()
            cls._active_browsers[user_id].add(browser)
            logger.debug(f"[BrowserManager] Navegador registrado para o usuário {user_id}. Total: {len(cls._active_browsers[user_id])}")

    @classmethod
    def unregister_browser(cls, user_id: str, browser: Any):
        """Remove o registro do navegador quando ele é encerrado normalmente."""
        if not user_id or not browser:
            return
        with cls._lock:
            if user_id in cls._active_browsers:
                cls._active_browsers[user_id].discard(browser)
                if not cls._active_browsers[user_id]:
                    del cls._active_browsers[user_id]
                logger.debug(f"[BrowserManager] Navegador desregistrado para o usuário {user_id}.")

    @classmethod
    def cancel_user(cls, user_id: str):
        """Marca o usuário como cancelado (logout/interrupção) e força o fechamento de todos os browsers."""
        if not user_id:
            return

        browsers_to_close = []
        with cls._lock:
            cls._cancelled_users.add(user_id)
            if user_id in cls._active_browsers:
                browsers_to_close = list(cls._active_browsers[user_id])
                del cls._active_browsers[user_id]

        logger.info(f"[BrowserManager] Encerrando {len(browsers_to_close)} navegadores ativos para o usuário {user_id}...")

        for b in browsers_to_close:
            try:
                if hasattr(b, "close"):
                    close_fn = getattr(b, "close")
                    if inspect.iscoroutinefunction(close_fn):
                        try:
                            loop = asyncio.get_running_loop()
                            loop.create_task(b.close())
                        except RuntimeError:
                            pass
                    else:
                        close_fn()
            except Exception as e:
                logger.debug(f"[BrowserManager] Aviso ao fechar navegador em cancel_user para {user_id}: {e}")

    @classmethod
    def is_cancelled(cls, user_id: str) -> bool:
        """Verifica se as tarefas do usuário foram canceladas."""
        if not user_id:
            return False
        with cls._lock:
            return user_id in cls._cancelled_users

    @classmethod
    def clear_cancelled(cls, user_id: str):
        """Limpa o status de cancelamento para permitir novas execuções."""
        if not user_id:
            return
        with cls._lock:
            cls._cancelled_users.discard(user_id)
