from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ConsentItem(BaseModel):
    tipo: str               # 'termos' | 'privacidade' | 'ia_terceiros'
    versao: str             # ex: 'v1.0'
    aceito: bool = True

class ConsentSaveRequest(BaseModel):
    user_id: str
    consentimentos: List[ConsentItem]

class ConsentStatusResponse(BaseModel):
    termos_aceito: bool = False
    privacidade_aceito: bool = False
    ia_terceiros_aceito: bool = False
    versao_vigente: str = "v1.0"
    necessita_novo_aceite: bool = False
    detalhes: List[dict] = []

class AccountDeleteRequest(BaseModel):
    user_id: str
    confirmacao: str       # Deve ser exatamente "EXCLUIR"
