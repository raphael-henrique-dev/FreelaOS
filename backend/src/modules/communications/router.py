from backend.src.core.browser_manager import BrowserManager
from fastapi import Depends
from backend.src.core.auth import get_current_user, verify_user_ownership
from fastapi import APIRouter, HTTPException
from backend.src.modules.communications.schemas import SubmitRequest, MessageUpdate, CheckResponsesRequest
from backend.src.modules.communications.service import SenderService
from backend.src.modules.communications.repository import MessageRepository

repo = MessageRepository()

router = APIRouter()

@router.post("/api/communications/check-responses")
def check_responses(req: CheckResponsesRequest, current_user: dict = Depends(get_current_user)):
    try:
        if hasattr(req, 'user_id') and getattr(req, 'user_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        if hasattr(req, 'perfil_id') and getattr(req, 'perfil_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        responded = repo.get_responding_clients(req.user_id, req.client_ids)
        return {"responded_client_ids": responded}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/communications/messages/all")
def delete_all_messages(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user['user_id']: raise HTTPException(status_code=403, detail="Acesso negado")
    try:
        repo.delete_all_messages(user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/communications/messages/all/read")
def mark_all_as_read(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user['user_id']: raise HTTPException(status_code=403, detail="Acesso negado")
    try:
        repo.mark_all_as_read(user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/communications/messages/{message_id}")
def update_message(message_id: str, req: MessageUpdate, current_user: dict = Depends(get_current_user)):
    try:
        if hasattr(req, 'user_id') and getattr(req, 'user_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        if hasattr(req, 'perfil_id') and getattr(req, 'perfil_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        data = req.model_dump(exclude_unset=True)
        repo.update_message(message_id, data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sender/submit")
def submit_proposta(req: SubmitRequest, current_user: dict = Depends(get_current_user)):
    try:
        if hasattr(req, 'user_id') and getattr(req, 'user_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        if hasattr(req, 'perfil_id') and getattr(req, 'perfil_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Acesso negado")
        BrowserManager.clear_cancelled(req.user_id)
        resultado = SenderService.submit_proposta(req.vaga_id, req.user_id, req.texto, req.valor, req.prazo)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
