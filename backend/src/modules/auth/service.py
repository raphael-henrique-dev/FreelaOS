import os
import shutil
import logging
import httpx
import json
from playwright.sync_api import sync_playwright
from backend.src.core.browser_manager import BrowserManager, SessionBusyError
from backend.src.core.database import db
from backend.src.core.llm_client import generate_text, _get_active_llm, clear_user_keys
from backend.src.modules.opportunities.repository import ProfileRepository

logger = logging.getLogger(__name__)
profile_repo = ProfileRepository()

DEFAULT_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}


class AuthService:
    @staticmethod
    def _save_cookies_cache(session_dir: str, cookies: list[dict]) -> None:
        """Salva os cookies em cookies.json dentro do session_dir para checagens HTTP rápidas sem abrir o Chromium."""
        try:
            os.makedirs(session_dir, exist_ok=True)
            cookies_file = os.path.join(session_dir, "cookies.json")
            with open(cookies_file, "w", encoding="utf-8") as f:
                json.dump(cookies, f, ensure_ascii=False)
        except Exception as e:
            logger.debug(f"[AuthService] Não foi possível salvar cache de cookies em {session_dir}: {e}")

    @staticmethod
    def _load_cookie_header(session_dir: str, domain_filter: str = "") -> str | None:
        """Lê os cookies salvos no session_dir e monta a string do header 'Cookie'."""
        if not os.path.exists(session_dir):
            return None

        for filename in ("cookies.json", "cookie.json", "cookies.txt", "cookie.txt"):
            fpath = os.path.join(session_dir, filename)
            if not os.path.isfile(fpath):
                continue
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    raw = f.read().strip()
                if not raw:
                    continue

                if raw.startswith("[") or raw.startswith("{"):
                    data = json.loads(raw)
                    if isinstance(data, dict):
                        if "cookies" in data and isinstance(data["cookies"], list):
                            data = data["cookies"]
                        elif "cookie" in data and isinstance(data["cookie"], str):
                            return data["cookie"].strip()
                    if isinstance(data, list):
                        pairs = []
                        for c in data:
                            if not isinstance(c, dict):
                                continue
                            domain = str(c.get("domain", "")).lower()
                            if domain_filter and domain and domain_filter.lower() not in domain:
                                continue
                            name = str(c.get("name", "")).strip()
                            value = str(c.get("value", "")).strip()
                            if name:
                                pairs.append(f"{name}={value}")
                        if pairs:
                            return "; ".join(pairs)
                else:
                    return raw
            except Exception as e:
                logger.debug(f"[AuthService] Falha ao ler arquivo de cookie {fpath}: {e}")

        return None

    @staticmethod
    def encerrar_sessao_usuario(user_id: str):
        """Para todas as tarefas e loops em background ativos para o usuário, encerra navegadores e limpa chaves em memória."""
        BrowserManager.cancel_user(user_id)
        clear_user_keys(user_id)

        try:
            from backend.src.modules.assistant.router import active_agents
            active_agents.pop(user_id, None)
        except Exception:
            pass

        try:
            from backend.src.modules.communications.inbox_monitor import active_monitors
            if user_id in active_monitors:
                active_monitors.remove(user_id)
        except Exception:
            pass

        try:
            from backend.src.modules.extractor.router import active_autopilots
            if user_id in active_autopilots:
                active_autopilots.remove(user_id)
        except Exception:
            pass

    @staticmethod
    def conectar_99freelas(user_id: str, cookies_json: str = None) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        os.makedirs(session_dir, exist_ok=True)
        
        if cookies_json:
            try:
                raw_cookies = json.loads(cookies_json)
                
                if not isinstance(raw_cookies, list):
                    if "cookies" in raw_cookies:
                        raw_cookies = raw_cookies["cookies"]
                    else:
                        raise ValueError("Formato de cookie inválido.")
                
                playwright_cookies = []
                for c in raw_cookies:
                    raw_same_site = str(c.get("sameSite", "Lax")).lower()
                    if raw_same_site in ["no_restriction", "none"]:
                        same_site = "None"
                    elif raw_same_site == "strict":
                        same_site = "Strict"
                    else:
                        same_site = "Lax"
                        
                    cookie = {
                        "name": c.get("name", ""),
                        "value": c.get("value", ""),
                        "domain": c.get("domain", ""),
                        "path": c.get("path", "/"),
                        "httpOnly": c.get("httpOnly", False),
                        "secure": c.get("secure", False),
                        "sameSite": same_site
                    }
                    if "expirationDate" in c:
                        cookie["expires"] = float(c["expirationDate"])
                    
                    playwright_cookies.append(cookie)
                
                AuthService._save_cookies_cache(session_dir, playwright_cookies)

                with BrowserManager.session_guard(user_id, "99freelas", session_dir, blocking=True, timeout=60.0):
                    with sync_playwright() as p:
                        browser = None
                        try:
                            browser = p.chromium.launch_persistent_context(
                                user_data_dir=session_dir,
                                headless=True,
                                args=BrowserManager.DEFAULT_CHROMIUM_ARGS,
                            )
                            BrowserManager.register_browser(user_id, browser)
                            browser.add_cookies(playwright_cookies)
                        finally:
                            BrowserManager.close_browser_safely(user_id, browser)
                    
                return True
            except json.JSONDecodeError:
                raise ValueError("O texto colado não é um JSON válido. Exporte usando uma extensão como EditThisCookie.")
            except Exception as e:
                raise ValueError(f"Falha ao salvar cookies: {str(e)}")
        else:
            # Fluxo Original: Janela interativa
            try:
                with BrowserManager.session_guard(user_id, "99freelas", session_dir, blocking=True, timeout=60.0):
                    with sync_playwright() as p:
                        browser = None
                        page = None
                        try:
                            browser = p.chromium.launch_persistent_context(
                                user_data_dir=session_dir,
                                headless=True,
                                viewport={"width": 1280, "height": 720},
                                args=BrowserManager.DEFAULT_CHROMIUM_ARGS,
                            )
                            BrowserManager.register_browser(user_id, browser)
                            page = browser.new_page()
                            page.goto("https://www.99freelas.com.br/login")
                            
                            try:
                                for _ in range(120):
                                    if "login" not in page.url:
                                        break
                                    page.wait_for_timeout(1000)
                                else:
                                    raise Exception("Timeout")
                                
                                page.wait_for_timeout(3000)
                                AuthService._save_cookies_cache(session_dir, browser.cookies())
                                success = True
                            except Exception:
                                success = False
                            
                            return success
                        finally:
                            BrowserManager.close_browser_safely(user_id, browser, page)
            except ValueError as e:
                raise ValueError(str(e))
            except Exception as e:
                raise ValueError(f"Falha ao salvar cookies: {str(e)}")

    @staticmethod
    def desconectar_99freelas(user_id: str):
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        if os.path.exists(session_dir):
            try:
                with BrowserManager.session_guard(user_id, "99freelas", session_dir, blocking=True, timeout=30.0):
                    if os.path.exists(session_dir):
                        shutil.rmtree(session_dir)
            except Exception as e:
                raise ValueError(f"Não foi possível remover a pasta da sessão: {str(e)}")

    @staticmethod
    def status_99freelas(user_id: str) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        
        if not os.path.exists(session_dir):
            return False

        # 1. Verificação rápida via HTTPX usando o cookie salvo no session_dir (sem instanciar o Chromium)
        cookie_header = AuthService._load_cookie_header(session_dir, "99freelas")
        if cookie_header:
            try:
                headers = {**DEFAULT_HTTP_HEADERS, "Cookie": cookie_header}
                with httpx.Client(follow_redirects=True, timeout=10.0) as client:
                    resp = client.get("https://www.99freelas.com.br/dashboard", headers=headers)
                    final_url = str(resp.url)
                    return (
                        resp.status_code == 200
                        and ("dashboard" in final_url or "projects" in final_url)
                        and "login" not in final_url
                    )
            except Exception as e:
                logger.warning(f"[AuthService] Erro ao verificar status_99freelas via httpx para {user_id}: {e}")
                return False

        # 2. Fallback caso a sessão antiga no disco ainda não tenha cookies.json exportado
        try:
            with BrowserManager.session_guard(user_id, "99freelas", session_dir, blocking=False):
                with sync_playwright() as p:
                    browser = None
                    page = None
                    try:
                        browser = p.chromium.launch_persistent_context(
                            user_data_dir=session_dir,
                            headless=True,
                            args=BrowserManager.DEFAULT_CHROMIUM_ARGS,
                        )
                        BrowserManager.register_browser(user_id, browser)
                        page = browser.new_page()
                        page.goto("https://www.99freelas.com.br/dashboard", timeout=30000)
                        
                        success = ("dashboard" in page.url or "projects" in page.url) and "login" not in page.url
                        if success:
                            AuthService._save_cookies_cache(session_dir, browser.cookies())
                        return success
                    finally:
                        BrowserManager.close_browser_safely(user_id, browser, page)
        except SessionBusyError:
            # Se o perfil já está em uso ativo por outro worker (Crawler/Sender/Inbox), a sessão está ativa
            logger.debug(f"[AuthService] Perfil 99freelas de {user_id} em uso no momento da checagem de status; assumindo conectado.")
            return True
        except Exception as e:
            logger.debug(f"[AuthService] Fallback status_99freelas falhou para {user_id}: {e}")
            return False

    @staticmethod
    def conectar_workana(user_id: str, cookies_json: str = None) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "workana")
        os.makedirs(session_dir, exist_ok=True)
        
        if cookies_json:
            try:
                raw_cookies = json.loads(cookies_json)
                
                if not isinstance(raw_cookies, list):
                    if "cookies" in raw_cookies:
                        raw_cookies = raw_cookies["cookies"]
                    else:
                        raise ValueError("Formato de cookie inválido.")
                
                playwright_cookies = []
                for c in raw_cookies:
                    raw_same_site = str(c.get("sameSite", "Lax")).lower()
                    if raw_same_site in ["no_restriction", "none"]:
                        same_site = "None"
                    elif raw_same_site == "strict":
                        same_site = "Strict"
                    else:
                        same_site = "Lax"
                        
                    cookie = {
                        "name": c.get("name", ""),
                        "value": c.get("value", ""),
                        "domain": c.get("domain", ""),
                        "path": c.get("path", "/"),
                        "httpOnly": c.get("httpOnly", False),
                        "secure": c.get("secure", False),
                        "sameSite": same_site
                    }
                    if "expirationDate" in c:
                        cookie["expires"] = float(c["expirationDate"])
                    
                    playwright_cookies.append(cookie)
                
                AuthService._save_cookies_cache(session_dir, playwright_cookies)

                with BrowserManager.session_guard(user_id, "workana", session_dir, blocking=True, timeout=60.0):
                    with sync_playwright() as p:
                        browser = None
                        try:
                            browser = p.chromium.launch_persistent_context(
                                user_data_dir=session_dir,
                                headless=True,
                                args=BrowserManager.DEFAULT_CHROMIUM_ARGS,
                            )
                            BrowserManager.register_browser(user_id, browser)
                            browser.add_cookies(playwright_cookies)
                        finally:
                            BrowserManager.close_browser_safely(user_id, browser)
                    
                return True
            except json.JSONDecodeError:
                raise ValueError("O texto colado não é um JSON válido. Exporte usando uma extensão como EditThisCookie.")
            except Exception as e:
                raise ValueError(f"Falha ao salvar cookies: {str(e)}")
        else:
            # Fluxo Original: Janela interativa
            try:
                with BrowserManager.session_guard(user_id, "workana", session_dir, blocking=True, timeout=60.0):
                    with sync_playwright() as p:
                        browser = None
                        page = None
                        try:
                            browser = p.chromium.launch_persistent_context(
                                user_data_dir=session_dir,
                                headless=True,
                                viewport={"width": 1280, "height": 720},
                                args=BrowserManager.DEFAULT_CHROMIUM_ARGS,
                            )
                            BrowserManager.register_browser(user_id, browser)
                            page = browser.new_page()
                            page.goto("https://www.workana.com/login")
                            
                            try:
                                for _ in range(120):
                                    if "dashboard" in page.url:
                                        break
                                    page.wait_for_timeout(1000)
                                else:
                                    raise Exception("Timeout")
                                
                                page.wait_for_timeout(3000)
                                AuthService._save_cookies_cache(session_dir, browser.cookies())
                                success = True
                            except Exception:
                                success = False
                            
                            return success
                        finally:
                            BrowserManager.close_browser_safely(user_id, browser, page)
            except ValueError as e:
                raise ValueError(str(e))
            except Exception as e:
                raise ValueError(f"Falha ao salvar cookies: {str(e)}")

    @staticmethod
    def desconectar_workana(user_id: str):
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "workana")
        if os.path.exists(session_dir):
            try:
                with BrowserManager.session_guard(user_id, "workana", session_dir, blocking=True, timeout=30.0):
                    if os.path.exists(session_dir):
                        shutil.rmtree(session_dir)
            except Exception as e:
                raise ValueError(f"Não foi possível remover a pasta da sessão: {str(e)}")

    @staticmethod
    def status_workana(user_id: str) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "workana")
        
        if not os.path.exists(session_dir):
            return False

        # 1. Verificação rápida via HTTPX usando o cookie salvo no session_dir
        cookie_header = AuthService._load_cookie_header(session_dir, "workana")
        if cookie_header:
            try:
                headers = {**DEFAULT_HTTP_HEADERS, "Cookie": cookie_header}
                with httpx.Client(follow_redirects=True, timeout=10.0) as client:
                    resp = client.get("https://www.workana.com/dashboard", headers=headers)
                    final_url = str(resp.url)
                    return resp.status_code == 200 and "login" not in final_url
            except Exception as e:
                logger.warning(f"[AuthService] Erro ao verificar status_workana via httpx para {user_id}: {e}")
                return False

        # 2. Fallback caso ainda não exista cookies.json salvo na pasta
        try:
            with BrowserManager.session_guard(user_id, "workana", session_dir, blocking=False):
                with sync_playwright() as p:
                    browser = None
                    page = None
                    try:
                        browser = p.chromium.launch_persistent_context(
                            user_data_dir=session_dir,
                            headless=True,
                            args=BrowserManager.DEFAULT_CHROMIUM_ARGS,
                        )
                        BrowserManager.register_browser(user_id, browser)
                        page = browser.new_page()
                        # Workana dashboard URL ou jobs URL
                        page.goto("https://www.workana.com/jobs", timeout=30000)
                        
                        # Se pedir login, vai pra /login. Se ficar no /jobs ou outro canto, tá logado.
                        success = "login" not in page.url
                        if success:
                            AuthService._save_cookies_cache(session_dir, browser.cookies())
                        return success
                    finally:
                        BrowserManager.close_browser_safely(user_id, browser, page)
        except SessionBusyError:
            logger.debug(f"[AuthService] Perfil workana de {user_id} em uso no momento da checagem de status; assumindo conectado.")
            return True
        except Exception as e:
            logger.debug(f"[AuthService] Fallback status_workana falhou para {user_id}: {e}")
            return False

    @staticmethod
    def sync_github_portfolio(user_id: str, provider_token: str | None) -> bool:
        if not provider_token:
            raise ValueError("Token do GitHub não fornecido. Faça login novamente para renovar o token.")
        
        # 1. Fetch repositories from GitHub
        headers = {
            "Authorization": f"Bearer {provider_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Pega os 10 últimos repositórios atualizados para ter uma base recente de atividade
        url = "https://api.github.com/user/repos?sort=updated&per_page=10&affiliation=owner"
        
        with httpx.Client() as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Falha ao conectar com o GitHub API. Código: {resp.status_code}")
                
            repos = resp.json()
            
        if not repos:
            raise ValueError("Nenhum repositório encontrado nesta conta do GitHub.")
            
        # 2. Formata os repositórios em texto para o LLM
        repo_texts = []
        for r in repos:
            name = r.get("name", "")
            desc = r.get("description", "") or "Sem descrição"
            lang = r.get("language", "") or "Desconhecido"
            stars = r.get("stargazers_count", 0)
            repo_texts.append(f"Projeto: {name} | Linguagem: {lang} | Estrelas: {stars}\nDescrição: {desc}")
            
        contexto_github = "\n\n".join(repo_texts)
        
        # 3. Pede para a IA resumir os repositórios focando nas habilidades do desenvolvedor
        prompt = f"""Você é um especialista em analisar portfólios técnicos. 
Aqui estão os projetos mais recentes de um desenvolvedor extraídos do seu GitHub:

{contexto_github}

Escreva um parágrafo denso, profissional e focado nas habilidades, frameworks e tipos de projetos (backend, frontend, devops, etc.) que este desenvolvedor tem experiência. 
O objetivo é que este resumo seja usado como 'contexto extra' por outro Agente de IA que escreve propostas para clientes (freelance). Não use saudações. Seja direto e em terceira pessoa.

Ao final do texto, faça uma lista contendo: Nome do projeto; Breve Descrição; Tecnologias/Linguagens utilizadas. Por exemplo:

PROJETOS
- FreelaOS: Sistema centralizado de captação automática de freelas e gestão de projetos com integração de agentes de I.A (React, JavaScript, Python)
..."""

        active_model = _get_active_llm(user_id, "analista")
        resumo = generate_text(prompt, provedor=active_model, user_id=user_id)
        if not resumo:
            raise ValueError("Erro ao gerar resumo usando a inteligência artificial.")
            
        # 4. Salva no banco de dados, em configuracoes_usuario, na nova coluna github_resumo
        db.table("configuracoes_usuario").update({
            "github_resumo": resumo.strip()
        }).eq("perfil_id", user_id).execute()
        
        return True
