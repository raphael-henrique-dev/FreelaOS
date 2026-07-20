from backend.src.core.database import db

class MessageRepository:
    def check_duplicate(self, user_id: str, remetente: str, url_origem: str):
        duplicata = db.table("mensagens").select("id").eq("perfil_id", user_id).eq("remetente_nome", remetente).eq("url_origem", url_origem).eq("lida", False).execute()
        return duplicata.data and len(duplicata.data) > 0

    def get_latest_opportunity_for_client(self, cliente_id: str):
        op_res = db.table("oportunidades").select("id").eq("cliente_id", cliente_id).order("created_at", desc=True).limit(1).execute()
        if op_res.data and len(op_res.data) > 0:
            return op_res.data[0]["id"]
        return None

    def insert_message(self, data: dict):
        return db.table("mensagens").insert(data).execute()
