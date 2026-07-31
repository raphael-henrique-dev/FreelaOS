from typing import Any
import logging
from backend.src.core.database import db
from backend.src.modules.opportunities.repository import OpportunityRepository, ProfileRepository

logger = logging.getLogger(__name__)
opp_repo = OpportunityRepository()
prof_repo = ProfileRepository()

def get_estatisticas(user_id: str) -> dict:
    """Busca as estatísticas gerais do usuário: vagas capturadas, ignoradas, propostas geradas e enviadas."""
    try:
        res = opp_repo.get_opportunities(user_id)
        if not res:
            return {"total": 0, "ignoradas": 0, "propostas_geradas": 0, "enviadas": 0}
            
        estatisticas = {
            "total": len(res),
            "ignoradas": sum(1 for v in res if v.get("status") == "Ignorada"),
            "propostas_geradas": sum(1 for v in res if v.get("proposta_ia") is not None),
            "enviadas": sum(1 for v in res if v.get("status") == "Proposta enviada")
        }
        return estatisticas
    except Exception as e:
        logger.error(f"Erro em get_estatisticas: {e}")
        return {"error": str(e)}

def toggle_engine(user_id: str, state: bool) -> dict:
    """Liga ou desliga o motor (piloto automático) do FreelaOS."""
    try:
        db.table("configuracoes_usuario").update({"automacao_ligada": state}).eq("perfil_id", user_id).execute()
        status_str = "ligado" if state else "desligado"
        return {"success": True, "message": f"Motor {status_str} com sucesso."}
    except Exception as e:
        logger.error(f"Erro em toggle_engine: {e}")
        return {"error": str(e)}

def get_propostas_recentes(user_id: str, limit: int = 5) -> list:
    """Busca as oportunidades/propostas mais recentes do usuário."""
    try:
        res = db.table("oportunidades").select("id, titulo, status, plataforma, valor_proposta").eq("perfil_id", user_id).order("criado_em", desc=True).limit(limit).execute()
        return res.data if res.data else []
    except Exception as e:
        logger.error(f"Erro em get_propostas_recentes: {e}")
        return [{"error": str(e)}]

def gerar_proposta(vaga_id: str) -> dict:
    """Inicia o agente Redator para criar uma proposta para a vaga_id especificada."""
    try:
        # Import local para evitar ciclos
        from backend.src.modules.extractor.service import process_url
        opp = opp_repo.get_opportunity(vaga_id)
        if not opp:
            return {"error": "Vaga não encontrada."}
            
        if not opp.get("url"):
            return {"error": "A vaga não possui URL original para o Extrator analisar."}
            
        # O process_url do extractor.service orquestra Extrator -> Analista -> Redator
        result = process_url(opp["url"], opp["perfil_id"])
        
        # Após gerar, buscamos novamente pra ver a proposta no banco
        opp_atualizada = opp_repo.get_opportunity(vaga_id)
        
        return {
            "success": True,
            "message": "Agentes acionados.",
            "status": opp_atualizada.get("status"),
            "proposta_ia": opp_atualizada.get("proposta_ia")
        }
    except Exception as e:
        logger.error(f"Erro em gerar_proposta: {e}")
        return {"error": str(e)}

def update_config(user_id: str, config_key: str, value: Any) -> dict:
    """Atualiza uma chave específica nas configurações do usuário."""
    try:
        db.table("configuracoes_usuario").update({config_key: value}).eq("perfil_id", user_id).execute()
        return {"success": True, "message": f"Configuração {config_key} atualizada para {value}."}
    except Exception as e:
        logger.error(f"Erro em update_config: {e}")
        return {"error": str(e)}
