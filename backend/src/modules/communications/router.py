from fastapi import APIRouter, HTTPException
from backend.src.modules.communications.schemas import SubmitRequest
from backend.src.modules.communications.service import SenderService

router = APIRouter()

@router.post("/api/sender/submit")
def submit_proposta(req: SubmitRequest):
    try:
        resultado = SenderService.submit_proposta(req.vaga_id, req.user_id, req.texto, req.valor, req.prazo)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
