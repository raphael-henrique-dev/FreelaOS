from fastapi import Depends
from backend.src.core.auth import get_current_user
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.src.modules.auth.service import AuthService
from backend.src.core.llm_client import set_user_keys, get_user_configured_providers, clear_user_keys

router = APIRouter()

class AuthRequest(BaseModel):
    user_id: str
    cookies_json: str | None = None

class GithubSyncRequest(BaseModel):
    user_id: str
    provider_token: str | None = None

class LLMKeysSyncRequest(BaseModel):
    user_id: str
    keys: dict[str, str | None] = {}
    replace_all: bool = False

class LLMKeysClearRequest(BaseModel):
    user_id: str
    provedor: str | None = None

@router.post("/api/auth/llm-keys")
def sync_llm_keys(req: LLMKeysSyncRequest, current_user: dict = Depends(get_current_user)):
    """Sincroniza as chaves de API do usuário exclusivamente na memória RAM volátil do servidor."""
    if req.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    configured = set_user_keys(req.user_id, req.keys, replace_all=req.replace_all)
    # Invalida cache do agente assistente para que ele recrie com a chave nova
    try:
        from backend.src.modules.assistant.router import active_agents
        active_agents.pop(req.user_id, None)
    except Exception:
        pass
    return {
        "status": "success",
        "configured": configured,
        "configured_providers": [p for p, ok in configured.items() if ok],
    }

@router.get("/api/auth/llm-keys/status")
def status_llm_keys(user_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna quais provedores possuem chave ativa em memória RAM (sem expor o valor das chaves)."""
    if user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    configured = get_user_configured_providers(user_id)
    return {
        "status": "success",
        "configured": configured,
        "configured_providers": [p for p, ok in configured.items() if ok],
    }

@router.delete("/api/auth/llm-keys")
def delete_llm_keys(req: LLMKeysClearRequest, current_user: dict = Depends(get_current_user)):
    """Remove uma chave específica ou todas as chaves de IA da memória RAM do servidor."""
    if req.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    clear_user_keys(req.user_id, req.provedor)
    try:
        from backend.src.modules.assistant.router import active_agents
        active_agents.pop(req.user_id, None)
    except Exception:
        pass
    configured = get_user_configured_providers(req.user_id)
    return {
        "status": "success",
        "configured": configured,
        "configured_providers": [p for p, ok in configured.items() if ok],
    }

@router.post("/api/auth/logout")
def logout_usuario(req: AuthRequest, current_user: dict = Depends(get_current_user)):
    try:
        if req.user_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        AuthService.encerrar_sessao_usuario(req.user_id)
        return {"status": "success", "message": "Sessão e tarefas em background encerradas com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/99freelas")
def conectar_99freelas(req: AuthRequest, current_user: dict = Depends(get_current_user)):
    try:
        if req.user_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        success = AuthService.conectar_99freelas(req.user_id, req.cookies_json)
        if success:
            return {"status": "success", "message": "Login detectado e sessão salva com sucesso!"}
        else:
            return {"status": "timeout", "message": "Tempo limite excedido ou login não detectado."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/auth/99freelas")
def desconectar_99freelas(req: AuthRequest, current_user: dict = Depends(get_current_user)):
    try:
        if req.user_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        AuthService.desconectar_99freelas(req.user_id)
        return {"status": "success", "message": "Sessão desconectada com sucesso!"}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/99freelas/status")
def status_99freelas(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user['user_id']:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Acesso negado")

    try:
        is_connected = AuthService.status_99freelas(user_id)
        return {"status": "success", "connected": is_connected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/workana")
def conectar_workana(req: AuthRequest, current_user: dict = Depends(get_current_user)):
    try:
        if req.user_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        success = AuthService.conectar_workana(req.user_id, req.cookies_json)
        if success:
            return {"status": "success", "message": "Login na Workana detectado e sessão salva!"}
        else:
            return {"status": "timeout", "message": "Tempo limite excedido ou login não detectado."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/auth/workana")
def desconectar_workana(req: AuthRequest, current_user: dict = Depends(get_current_user)):
    try:
        if req.user_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        AuthService.desconectar_workana(req.user_id)
        return {"status": "success", "message": "Sessão da Workana desconectada com sucesso!"}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/workana/status")
def status_workana(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user['user_id']:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Acesso negado")

    try:
        is_connected = AuthService.status_workana(user_id)
        return {"status": "success", "connected": is_connected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/github/sync")
def sync_github_portfolio(req: GithubSyncRequest, current_user: dict = Depends(get_current_user)):
    try:
        if req.user_id != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        success = AuthService.sync_github_portfolio(req.user_id, req.provider_token)
        if success:
            return {"status": "success", "message": "Portfólio do GitHub sincronizado."}
        else:
            return {"status": "error", "message": "Não foi possível sincronizar o portfólio."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
