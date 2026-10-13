import logging
from backend.src.core.browser_manager import BrowserManager
from backend.src.modules.privacy.repository import PrivacyRepository
from backend.src.modules.privacy.schemas import ConsentStatusResponse

logger = logging.getLogger(__name__)

VERSAO_VIGENTE_TERMOS = "v1.0"
VERSAO_VIGENTE_PRIVACIDADE = "v1.0"
VERSAO_VIGENTE_IA = "v1.0"

repo = PrivacyRepository()

class PrivacyService:
    @staticmethod
    def registrar_consentimentos(perfil_id: str, consentimentos: list, ip: str = None, user_agent: str = None) -> bool:
        if not perfil_id:
            raise ValueError("ID de perfil é obrigatório.")
        if not consentimentos:
            raise ValueError("Nenhum consentimento enviado para registro.")

        for item in consentimentos:
            tipo = getattr(item, "tipo", None) or item.get("tipo")
            versao = getattr(item, "versao", None) or item.get("versao", "v1.0")
            aceito = getattr(item, "aceito", True) if hasattr(item, "aceito") else item.get("aceito", True)
            repo.salvar_consentimento(
                perfil_id=perfil_id,
                tipo=tipo,
                versao=versao,
                aceito=aceito,
                ip=ip,
                user_agent=user_agent
            )

        logger.info(f"[LGPD Consentimento] Registrados {len(consentimentos)} consentimentos para o usuário {perfil_id}")
        return True

    @staticmethod
    def obter_status_consentimentos(perfil_id: str) -> ConsentStatusResponse:
        historico = repo.listar_consentimentos(perfil_id)
        
        termos_ok = False
        privacidade_ok = False
        ia_ok = False

        for c in historico:
            t = c.get("tipo")
            v = c.get("versao")
            a = c.get("aceito", False)

            if t == "termos" and v == VERSAO_VIGENTE_TERMOS and a:
                termos_ok = True
            elif t == "privacidade" and v == VERSAO_VIGENTE_PRIVACIDADE and a:
                privacidade_ok = True
            elif t == "ia_terceiros" and v == VERSAO_VIGENTE_IA and a:
                ia_ok = True

        necessita_aceite = not (termos_ok and privacidade_ok and ia_ok)

        return ConsentStatusResponse(
            termos_aceito=termos_ok,
            privacidade_aceito=privacidade_ok,
            ia_terceiros_aceito=ia_ok,
            versao_vigente=VERSAO_VIGENTE_PRIVACIDADE,
            necessita_novo_aceite=necessita_aceite,
            detalhes=historico
        )

    @staticmethod
    def exportar_dados_titular(perfil_id: str) -> dict:
        return repo.exportar_todos_dados(perfil_id)

    @staticmethod
    def excluir_conta_titular(perfil_id: str, confirmacao: str) -> bool:
        if not confirmacao or confirmacao.strip() != "EXCLUIR":
            raise ValueError("Confirmação inválida. É obrigatório digitar exatamente a palavra 'EXCLUIR'.")

        # 1. Encerra imediatamente qualquer navegador em execução
        BrowserManager.cancel_user(perfil_id)

        # 2. Remove de eventuais loops em background (Autopilot)
        try:
            from backend.src.modules.extractor.router import active_autopilots
            active_autopilots.discard(perfil_id)
        except Exception:
            pass

        # 3. Executa exclusão em cascata no banco e disco
        repo.excluir_dados_usuario(perfil_id)
        return True

    @staticmethod
    def executar_expurgo(dias: int = 90) -> int:
        return repo.expurgar_atividades_antigas(dias)
