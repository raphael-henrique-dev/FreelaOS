from pydantic import BaseModel
from typing import Optional, List

class CheckResponsesRequest(BaseModel):
    user_id: str
    client_ids: List[str]

class SubmitRequest(BaseModel):
    vaga_id: str
    user_id: str
    texto: str
    valor: int
    prazo: str

class MessageUpdate(BaseModel):
    lida: Optional[bool] = None
