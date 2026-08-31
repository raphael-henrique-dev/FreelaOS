from fastapi import APIRouter, HTTPException
from backend.src.modules.opportunities.schemas import AvaliacaoRequest, RedatorRequest, VagaBruta, OpportunityUpdate
from backend.src.modules.opportunities.service import AnalistaService, RedatorService, ScoutService
from backend.src.modules.opportunities.repository import OpportunityRepository, ClientRepository, ProfileRepository
from backend.src.modules.opportunities.workana_crawler import WorkanaCrawler

repo = OpportunityRepository()

router = APIRouter()

@router.post("/api/analista/evaluate")
def avaliar_oportunidade(req: AvaliacaoRequest):
    try:
        resultado = AnalistaService.avaliar_oportunidade(req.vaga_id, req.user_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do Analista: {str(e)}")

@router.post("/api/redator/draft")
def gerar_proposta(req: RedatorRequest):
    try:
        resultado = RedatorService.gerar_proposta(req.vaga_id, req.user_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do Redator: {str(e)}")

@router.post("/api/scout/analyze")
def analisar_vaga(vaga: VagaBruta):
    try:
        resultado = ScoutService.analisar_vaga(vaga.texto, vaga.plataforma, vaga.perfil_id, foto_url=vaga.foto_url)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do Scout: {str(e)}")

@router.post("/api/crawler/workana")
def rodar_crawler_workana(user_id: str, limit: int = 3):
    try:
        resultados = WorkanaCrawler.executar(user_id, limit)
        return {"status": "success", "extraidas": len(resultados), "resultados": resultados}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no crawler: {str(e)}")

@router.get("/api/opportunities")
def list_opportunities(user_id: str):
    try:
        return repo.get_opportunities(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/opportunities/{vaga_id}")
def get_opportunity(vaga_id: str):
    try:
        res = repo.get_opportunity(vaga_id)
        if not res:
            raise HTTPException(status_code=404, detail="Vaga não encontrada")
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/opportunities/{vaga_id}")
def update_opportunity(vaga_id: str, req: OpportunityUpdate):
    try:
        data = req.model_dump(exclude_unset=True)
        res = repo.update_opportunity(vaga_id, data)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/opportunities/delete_all")
def delete_all_opportunities(user_id: str):
    try:
        repo.delete_all_opportunities(user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/opportunities/{vaga_id}")
def delete_opportunity(vaga_id: str):
    try:
        repo.delete_opportunity(vaga_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/clients")
def list_clients(perfil_id: str):
    try:
        return ClientRepository().get_clients(perfil_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/profile")
def get_profile(user_id: str):
    try:
        profile = ProfileRepository().get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.delete("/api/clients/inactive")
def delete_inactive_clients(perfil_id: str):
    try:
        ClientRepository().delete_inactive_clients(perfil_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
