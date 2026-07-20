from pydantic import BaseModel

class SubmitRequest(BaseModel):
    vaga_id: str
    user_id: str
    texto: str
    valor: int
    prazo: str
