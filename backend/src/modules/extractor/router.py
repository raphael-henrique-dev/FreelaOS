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

def manage_autopilot(user_id: str):
    conf = repo_profile.get_user_settings(user_id)
    if conf and conf.get("piloto_automatico_ativado"):
        if user_id not in active_autopilots:
            active_autopilots.add(user_id)
            interval = conf.get("interval_hours", 3)
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(autopilot_loop(user_id, interval_hours=interval))
            except RuntimeError:
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        asyncio.run_coroutine_threadsafe(autopilot_loop(user_id, interval_hours=interval), loop)
                    else:
                        loop.create_task(autopilot_loop(user_id, interval_hours=interval))
                except Exception as e:
                    logger.error(f"Erro ao agendar autopilot_loop: {e}")
            return {"status": "started", "message": "Autopilot ativado no backend."}
    else:
        if user_id in active_autopilots:
            active_autopilots.remove(user_id)
            return {"status": "stopped", "message": "Autopilot desativado."}
    return {"status": "unchanged"}

@router.post("/api/extractor/run")
def trigger_extraction(req: ExtractorRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(executar_extracao, req.user_id)
    return {"mensagem": "Extrator disparado! Ele varrerá a web em segundo plano."}



@router.post("/api/autopilot/check")
async def check_autopilot(req: ExtractorRequest):
    return manage_autopilot(req.user_id)
