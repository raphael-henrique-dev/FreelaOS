from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.src.modules.auth.service import AuthService

router = APIRouter()

class AuthRequest(BaseModel):
    user_id: str

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

@router.post("/api/auth/99freelas/status")
def status_99freelas(req: AuthRequest):
    try:
        is_connected = AuthService.status_99freelas(req.user_id)
        return {"status": "success", "connected": is_connected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
