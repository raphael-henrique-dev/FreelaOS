import inspect
import logging
import threading
from typing import Any, Set, Dict

logger = logging.getLogger(__name__)

class BrowserManager:
    """
    Gerenciador thread-safe centralizado para instâncias de navegadores e contextos do Playwright.
    Permite interromper e fechar imediatamente navegadores ativos quando o usuário faz logout.
    """
    _lock = threading.Lock()
    _active_browsers: Dict[str, Set[Any]] = {}
    _cancelled_users: Set[str] = set()

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
                        # Caso seja async context
                        import asyncio
                        try:
                            loop = asyncio.get_running_loop()
                            loop.create_task(b.close())
                        except RuntimeError:
                            pass
                    else:
                        close_fn()
            except Exception as e:
                logger.warning(f"[BrowserManager] Erro ao fechar navegador para {user_id}: {e}")

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
