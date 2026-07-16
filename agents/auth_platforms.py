import os
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from playwright.sync_api import sync_playwright

router = APIRouter()

class AuthRequest(BaseModel):
    user_id: str

@router.post("/api/auth/99freelas")
def conectar_99freelas(req: AuthRequest):
    session_dir = os.path.join(os.getcwd(), "playwright_sessions", req.user_id, "99freelas")
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
            
            # Avisa o frontend que abriu, não podemos travar a requisição pra sempre,
            # então esperamos no máximo 60 segundos para o usuário logar.
            try:
                # O usuário pode ser redirecionado rápido se já estiver logado
                # ou pode demorar se estiver preenchendo manualmente.
                for _ in range(120):
                    if "login" not in page.url:
                        break
                    page.wait_for_timeout(1000)
                else:
                    raise Exception("Timeout aguardando login")
                
                # Aguarda 3 segundos extras para garantir que os cookies/estado foram gravados
                page.wait_for_timeout(3000)
                success = True
            except Exception:
                success = False
            
            browser.close()
            
            if success:
                return {"status": "success", "message": "Login detectado e sessão salva com sucesso!"}
            else:
                return {"status": "timeout", "message": "Tempo limite excedido ou login não detectado."}
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/auth/99freelas")
def desconectar_99freelas(req: AuthRequest):
    import shutil
    session_dir = os.path.join(os.getcwd(), "playwright_sessions", req.user_id, "99freelas")
    
    try:
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
            return {"status": "success", "message": "Conta desconectada e dados apagados."}
        else:
            return {"status": "success", "message": "Nenhuma sessão encontrada para desconectar."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/99freelas/status")
def status_99freelas(user_id: str):
    session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
    return {"connected": os.path.exists(session_dir)}
