from pydantic import BaseModel
from typing import Optional

class AvaliacaoRequest(BaseModel):
    vaga_id: str
    user_id: str

class RedatorRequest(BaseModel):
    vaga_id: str
    user_id: str

class VagaBruta(BaseModel):
    texto: str
    plataforma: str = "99Freelas"
    perfil_id: str

class OpportunityUpdate(BaseModel):
    status: Optional[str] = None
    proposta_ia: Optional[str] = None
    valor_proposta: Optional[float] = None
    prazo_proposta: Optional[str] = None
