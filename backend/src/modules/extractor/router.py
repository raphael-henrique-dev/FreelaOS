from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import asyncio
import logging

from backend.src.modules.extractor.service import executar_extracao
from backend.src.modules.opportunities.repository import ProfileRepository

repo_profile = ProfileRepository()

router = APIRouter()
logger = logging.getLogger(__name__)

class ExtractorRequest(BaseModel):
    user_id: str

active_autopilots = set()

async def autopilot_loop(user_id: str, interval_hours: int = 3):
    interval_seconds = interval_hours * 3600
    while user_id in active_autopilots:
        try:
            conf_res = repo_profile.get_user_settings(user_id)
            if conf_res and conf_res.get("piloto_automatico_ativado"):
                logger.info(f"Iniciando ciclo programado (Autopilot) para {user_id}")
                await asyncio.to_thread(executar_extracao, user_id)
            else:
                logger.info(f"Autopilot desativado no banco para {user_id}. Parando o loop.")
                active_autopilots.remove(user_id)
                break
        except Exception as e:
            logger.error(f"Erro no loop principal do Autopilot: {e}", exc_info=True)
        
        logger.debug(f"Autopilot aguardando {interval_hours} hora(s) para o próximo ciclo...")
        await asyncio.sleep(interval_seconds)

@router.post("/api/extractor/run")
def trigger_extraction(req: ExtractorRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(executar_extracao, req.user_id)
    return {"mensagem": "Extrator disparado! Ele varrerá a web em segundo plano."}

@router.post("/api/autopilot/check")
def check_autopilot(req: ExtractorRequest, background_tasks: BackgroundTasks):
    conf = repo_profile.get_user_settings(req.user_id)
    
    if conf and conf.get("piloto_automatico_ativado"):
        if req.user_id not in active_autopilots:
            active_autopilots.add(req.user_id)
            
            # Lê o valor do banco (se existir) ou usa 3 como padrão
            interval = conf.get("interval_hours", 3)
            background_tasks.add_task(autopilot_loop, req.user_id, interval_hours=interval)
            
            return {"status": "started", "message": "Autopilot ativado no backend."}
    else:
        if req.user_id in active_autopilots:
            active_autopilots.remove(req.user_id)
            return {"status": "stopped", "message": "Autopilot desativado."}

    return {"status": "unchanged"}
