from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.src.modules.auth.service import AuthService

router = APIRouter()

class AuthRequest(BaseModel):
    user_id: str

class GithubSyncRequest(BaseModel):
    user_id: str
    provider_token: str | None = None

@router.post("/api/auth/99freelas")
def conectar_99freelas(req: AuthRequest):
    try:
        success = AuthService.conectar_99freelas(req.user_id)
        if success:
            return {"status": "success", "message": "Login detectado e sessão salva com sucesso!"}
        else:
            return {"status": "timeout", "message": "Tempo limite excedido ou login não detectado."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/auth/99freelas")
def desconectar_99freelas(req: AuthRequest):
    try:
        AuthService.desconectar_99freelas(req.user_id)
        return {"status": "success", "message": "Sessão desconectada com sucesso!"}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/99freelas/status")
def status_99freelas(user_id: str):
    try:
        is_connected = AuthService.status_99freelas(user_id)
        return {"status": "success", "connected": is_connected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/workana")
def conectar_workana(req: AuthRequest):
    try:
        success = AuthService.conectar_workana(req.user_id)
        if success:
            return {"status": "success", "message": "Login na Workana detectado e sessão salva!"}
        else:
            return {"status": "timeout", "message": "Tempo limite excedido ou login não detectado."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/auth/workana")
def desconectar_workana(req: AuthRequest):
    try:
        AuthService.desconectar_workana(req.user_id)
        return {"status": "success", "message": "Sessão da Workana desconectada com sucesso!"}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/workana/status")
def status_workana(user_id: str):
    try:
        is_connected = AuthService.status_workana(user_id)
        return {"status": "success", "connected": is_connected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/github/sync")
def sync_github_portfolio(req: GithubSyncRequest):
    try:
        success = AuthService.sync_github_portfolio(req.user_id, req.provider_token)
        if success:
            return {"status": "success", "message": "Portfólio do GitHub sincronizado."}
        else:
            return {"status": "error", "message": "Não foi possível sincronizar o portfólio."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
