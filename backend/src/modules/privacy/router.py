import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from backend.src.core.auth import get_current_user, verify_user_ownership
from backend.src.modules.privacy.schemas import (
    ConsentSaveRequest, 
    ConsentStatusResponse, 
    AccountDeleteRequest
)
from backend.src.modules.privacy.service import PrivacyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/privacy", tags=["Privacidade e LGPD"])

@router.post("/consent")
def registrar_consentimento(
    req: ConsentSaveRequest, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra a aceitação de termos, política de privacidade ou envio a IAs terceiras.
    Armazena versão, timestamp, IP e User-Agent para comprovação de consentimento (Art. 8º da LGPD).
    """
    if req.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado: Perfil incompatível com o usuário autenticado.")

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        PrivacyService.registrar_consentimentos(
            perfil_id=req.user_id,
            consentimentos=req.consentimentos,
            ip=ip,
            user_agent=user_agent
        )
        return {"status": "success", "message": "Consentimentos registrados com sucesso."}
    except Exception as e:
        logger.error(f"[LGPD Router] Erro ao registrar consentimento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/consent", response_model=ConsentStatusResponse)
def obter_status_consentimento(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifica se o usuário já possui os consentimentos vigentes da plataforma.
    """
    if user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado.")

    try:
        return PrivacyService.obter_status_consentimentos(user_id)
    except Exception as e:
        logger.error(f"[LGPD Router] Erro ao consultar consentimentos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
def exportar_dados(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Direito de Portabilidade e Acesso aos Dados (Artigo 18, II e V da LGPD).
    Retorna o arquivo JSON consolidado com todos os dados pessoais do titular.
    """
    if user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado.")

    try:
        dados = PrivacyService.exportar_dados_titular(user_id)
        return dados
    except Exception as e:
        logger.error(f"[LGPD Router] Erro na exportação de dados: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/account")
def excluir_conta(
    req: AccountDeleteRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Direito à Eliminação dos Dados Pessoais (Artigo 18, VI da LGPD).
    Executa a exclusão definitiva dos dados e arquivos do usuário no FreelaOS.
    """
    if req.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado.")

    try:
        PrivacyService.excluir_conta_titular(req.user_id, req.confirmacao)
        return {
            "status": "success", 
            "message": "Sua conta e todos os dados associados foram excluídos permanentemente."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[LGPD Router] Erro na exclusão de conta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retention-cleanup")
def rotina_expurgo_retencao(
    dias: int = 90,
    current_user: dict = Depends(get_current_user)
):
    """
    Rotina de higienização e retenção temporária de logs (Princípio da Necessidade e Minimização).
    """
    try:
        total = PrivacyService.executar_expurgo(dias)
        return {"status": "success", "registros_expurgados": total}
    except Exception as e:
        logger.error(f"[LGPD Router] Erro no expurgo de retenção: {e}")
        raise HTTPException(status_code=500, detail=str(e))
