import os
import shutil
import logging
from datetime import datetime, timezone, timedelta
from backend.src.core.database import db

logger = logging.getLogger(__name__)

class PrivacyRepository:
    def salvar_consentimento(self, perfil_id: str, tipo: str, versao: str, aceito: bool, ip: str = None, user_agent: str = None):
        payload = {
            "perfil_id": perfil_id,
            "tipo": tipo,
            "versao": versao,
            "aceito": aceito,
            "ip": ip,
            "user_agent": user_agent
        }
        res = db.table("consentimentos").insert(payload).execute()
        return res.data

    def listar_consentimentos(self, perfil_id: str):
        res = db.table("consentimentos")\
            .select("*")\
            .eq("perfil_id", perfil_id)\
            .order("criado_em", desc=True)\
            .execute()
        return res.data or []

    def exportar_todos_dados(self, perfil_id: str) -> dict:
        """
        Coleta todos os dados pessoais do titular em conformidade com o Art. 18, II e V da LGPD.
        """
        # 1. Perfil
        res_perfil = db.table("perfis").select("*").eq("id", perfil_id).execute()
        perfil = res_perfil.data[0] if res_perfil.data else {}

        # 2. Configurações (mascarando tokens ou senhas se existirem)
        res_config = db.table("configuracoes_usuario").select("*").eq("perfil_id", perfil_id).execute()
        config = res_config.data[0] if res_config.data else {}
        if config and "integracoes" in config and isinstance(config["integracoes"], dict):
            # Preserva as flags de ativação sem expor chaves sensíveis
            limpo_integracoes = {}
            for k, v in config["integracoes"].items():
                if isinstance(v, dict):
                    limpo_integracoes[k] = {kk: vv for kk, vv in v.items() if "key" not in kk.lower() and "token" not in kk.lower()}
                else:
                    limpo_integracoes[k] = v
            config["integracoes"] = limpo_integracoes

        # 3. Oportunidades
        res_op = db.table("oportunidades").select("*").eq("perfil_id", perfil_id).execute()
        oportunidades = res_op.data or []

        # 4. Clientes
        res_cli = db.table("clientes").select("*").eq("perfil_id", perfil_id).execute()
        clientes = res_cli.data or []

        # 5. Mensagens
        res_msg = db.table("mensagens").select("*").eq("perfil_id", perfil_id).execute()
        mensagens = res_msg.data or []

        # 6. Atividades dos Agentes
        res_ativ = db.table("atividades_agentes").select("*").eq("perfil_id", perfil_id).execute()
        atividades = res_ativ.data or []

        # 7. Histórico de Consentimentos
        res_cons = db.table("consentimentos").select("*").eq("perfil_id", perfil_id).execute()
        consentimentos = res_cons.data or []

        return {
            "meta": {
                "plataforma": "FreelaOS",
                "titular_id": perfil_id,
                "data_exportacao": datetime.now(timezone.utc).isoformat(),
                "aviso_legal": "Relatório gerado nos termos do Artigo 18 da Lei Geral de Proteção de Dados (Lei 13.709/2018)."
            },
            "perfil": perfil,
            "configuracoes": config,
            "oportunidades": oportunidades,
            "clientes": clientes,
            "mensagens": mensagens,
            "atividades_agentes": atividades,
            "consentimentos": consentimentos
        }

    def excluir_dados_usuario(self, perfil_id: str):
        """
        Executa exclusão definitiva (Hard Delete) de todos os registros e arquivos
        associados ao usuário, respeitando as constraints de chave estrangeira.
        """
        logger.info(f"[LGPD Exclusão] Iniciando exclusão definitiva dos dados de {perfil_id}")

        # 1. Mensagens
        db.table("mensagens").delete().eq("perfil_id", perfil_id).execute()
        # 2. Atividades de Agentes
        db.table("atividades_agentes").delete().eq("perfil_id", perfil_id).execute()
        # 3. Oportunidades
        db.table("oportunidades").delete().eq("perfil_id", perfil_id).execute()
        # 4. Clientes
        db.table("clientes").delete().eq("perfil_id", perfil_id).execute()
        # 5. Configurações de Usuário
        db.table("configuracoes_usuario").delete().eq("perfil_id", perfil_id).execute()
        # 6. Consentimentos
        db.table("consentimentos").delete().eq("perfil_id", perfil_id).execute()
        # 7. Perfil
        db.table("perfis").delete().eq("id", perfil_id).execute()

        # 8. Remover diretório de sessões em disco
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", perfil_id)
        if os.path.exists(session_dir):
            try:
                shutil.rmtree(session_dir)
                logger.info(f"[LGPD Exclusão] Diretório de sessões {session_dir} removido com sucesso.")
            except Exception as e:
                logger.error(f"[LGPD Exclusão] Falha ao remover pastas de sessão em disco: {e}")

        # 9. Tentar remover usuário do Supabase Auth (se Service Role Key tiver permissão de Admin)
        try:
            if hasattr(db, "auth") and hasattr(db.auth, "admin"):
                db.auth.admin.delete_user(perfil_id)
                logger.info(f"[LGPD Exclusão] Usuário {perfil_id} removido do Supabase Auth.")
        except Exception as auth_err:
            logger.warning(f"[LGPD Exclusão] Não foi possível remover usuário diretamente de auth.users via admin API: {auth_err}")

        return True

    def expurgar_atividades_antigas(self, dias: int = 90) -> int:
        """
        Remove registros de log de agentes mais antigos que o período de retenção estipulado.
        """
        limite = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
        res = db.table("atividades_agentes").delete().lt("criado_em", limite).execute()
        total_removido = len(res.data) if res.data else 0
        logger.info(f"[LGPD Retenção] Expurgados {total_removido} logs de atividades anteriores a {limite}")
        return total_removido
