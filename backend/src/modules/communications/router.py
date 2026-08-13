from fastapi import APIRouter, HTTPException
from backend.src.modules.communications.schemas import SubmitRequest, MessageUpdate, CheckResponsesRequest
from backend.src.modules.communications.service import SenderService
from backend.src.modules.communications.repository import MessageRepository

repo = MessageRepository()

router = APIRouter()

@router.post("/api/communications/check-responses")
def check_responses(req: CheckResponsesRequest):
    try:
        responded = repo.get_responding_clients(req.user_id, req.client_ids)
        return {"responded_client_ids": responded}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/communications/messages/all")
def delete_all_messages(user_id: str):
    try:
        repo.delete_all_messages(user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/communications/messages/all/read")
def mark_all_as_read(user_id: str):
    try:
        repo.mark_all_as_read(user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/communications/messages/{message_id}")
def update_message(message_id: str, req: MessageUpdate):
    try:
        data = req.model_dump(exclude_unset=True)
        repo.update_message(message_id, data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sender/submit")
def submit_proposta(req: SubmitRequest):
    try:
        resultado = SenderService.submit_proposta(req.vaga_id, req.user_id, req.texto, req.valor, req.prazo)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
