import logging
from typing import Optional, Dict, Any
from backend.src.core.database import db

logger = logging.getLogger(__name__)

class AgentActivityLogger:
    @staticmethod
    def log(
        user_id: str,
        agente: str,
        acao: str,
        status: str = "processando",
        etapa: int = 1,
        detalhes: Optional[Dict[str, Any]] = None
    ):
        """
        Registra uma atividade de agente no Supabase para feedback em tempo real no frontend.
        status: 'processando' | 'sucesso' | 'alerta' | 'erro' | 'concluido'
        etapa: 1 (Scout), 2 (Analista), 3 (Redator), 4 (Sender / Conclusão)
        """
        payload = {
            "perfil_id": user_id,
            "agente": agente,
            "acao": acao,
            "status": status,
            "etapa": etapa,
            "detalhes": detalhes or {}
        }
        
        try:
            db.table("atividades_agentes").insert(payload).execute()
            logger.info(f"[{agente}] {acao} ({status})")
        except Exception as e:
            # Em caso de falha no log (ex: tabela ainda nao criada ou erro de conexao), nao interrompe a esteira
            logger.warning(f"Falha ao registrar atividade do agente no banco: {e}")
