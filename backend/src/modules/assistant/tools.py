from typing import Any
import logging
from backend.src.core.database import db
from backend.src.modules.opportunities.repository import OpportunityRepository, ProfileRepository
from backend.src.modules.extractor.router import manage_autopilot
from backend.src.modules.extractor.service import executar_extracao

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
        db.table("configuracoes_usuario").update({"piloto_automatico_ativado": state}).eq("perfil_id", user_id).execute()
        manage_autopilot(user_id)
        status_str = "ligado" if state else "desligado"
        return {"success": True, "message": f"Motor {status_str} com sucesso."}
    except Exception as e:
        logger.error(f"Erro em toggle_engine: {e}")
        return {"error": str(e)}

def start_extractor(user_id: str) -> dict:
    """Inicia um pipeline de extração."""
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, executar_extracao, user_id)
        return {"success": True, "message": "Extrator disparado com sucesso em segundo plano."}
    except Exception as e:
        logger.error(f"Erro em start_extractor: {e}")
        return {"error": str(e)}

def get_propostas_recentes(user_id: str, limit: int = 5) -> list:
    """Busca as oportunidades/propostas mais recentes do usuário."""
    try:
        res = db.table("oportunidades").select("id, titulo, status, plataforma, valor_proposta").eq("perfil_id", user_id).order("criado_em", desc=True).limit(limit).execute()
        return res.data if res.data else []
    except Exception as e:
        logger.error(f"Erro em get_propostas_recentes: {e}")
        return [{"error": str(e)}]

def get_op_infos(vaga_id: str) -> dict:
    """Busca os detalhes completos de uma vaga/oportunidade específica (título, descrição, orçamento, etc) a partir de seu ID."""
    try:
        opp = opp_repo.get_opportunity(vaga_id)
        if not opp:
            return {"error": "Vaga não encontrada com este ID."}
        return opp
    except Exception as e:
        logger.error(f"Erro em get_op_infos: {e}")
        return {"error": str(e)}

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
        # Mapeamento inteligente para lidar com chaves aninhadas JSON
        normalized_key = config_key.lower().replace(" ", "_").strip()
        if normalized_key in ["prompt_personalizado", "personalizado_prompt"]:
            # Precisamos buscar a config atual, atualizar o JSON e salvar
            from backend.src.modules.opportunities.repository import ProfileRepository
            conf = ProfileRepository().get_user_settings(user_id)
            modelos = conf.get("modelos_proposta", {}) if conf else {}
            if isinstance(modelos, str): # safety check
                import json
                modelos = json.loads(modelos)
            modelos["personalizado_prompt"] = value
            
            db.table("configuracoes_usuario").update({"modelos_proposta": modelos}).eq("perfil_id", user_id).execute()
            return {"success": True, "message": f"Prompt personalizado atualizado com sucesso."}
            
        db.table("configuracoes_usuario").update({config_key: value}).eq("perfil_id", user_id).execute()
        return {"success": True, "message": f"Configuração {config_key} atualizada para {value}."}
    except Exception as e:
        logger.error(f"Erro em update_config: {e}")
        return {"error": str(e)}
