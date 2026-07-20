import os
import shutil
from playwright.sync_api import sync_playwright

class AuthService:
    @staticmethod
    def conectar_99freelas(user_id: str) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        os.makedirs(session_dir, exist_ok=True)
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=False,
                    viewport={"width": 1280, "height": 720},
                    args=["--disable-blink-features=AutomationControlled"]
                )
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
                    success = True
                except Exception:
                    success = False
                
                browser.close()
                return success
        except Exception as e:
            raise ValueError(str(e))

    @staticmethod
    def desconectar_99freelas(user_id: str):
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        if os.path.exists(session_dir):
            try:
                shutil.rmtree(session_dir)
            except Exception as e:
                raise ValueError(f"Não foi possível remover a pasta da sessão: {str(e)}")

    @staticmethod
    def status_99freelas(user_id: str) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        
        if not os.path.exists(session_dir):
            return False
            
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=True,
                    args=["--disable-blink-features=AutomationControlled"]
                )
                page = browser.new_page()
                page.goto("https://www.99freelas.com.br/dashboard", timeout=30000)
                
                success = "dashboard" in page.url or "projects" in page.url
                browser.close()
                return success
        except Exception:
            return False
