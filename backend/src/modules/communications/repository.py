from backend.src.core.database import db

class MessageRepository:
    def check_duplicate(self, user_id: str, remetente: str, url_origem: str, conteudo: str):
        # Para mensagens muito longas, o filtro .eq("conteudo", conteudo) causa o erro HTTP 414 (URI Too Long)
        # pois o Supabase envia o texto inteiro na URL. Em vez disso, trazemos os registros da conversa
        # e conferimos o texto no lado do Python.
        res = db.table("mensagens").select("id, conteudo").eq("perfil_id", user_id).eq("remetente_nome", remetente).eq("url_origem", url_origem).execute()
        if res.data:
            for msg in res.data:
                if msg.get("conteudo") == conteudo:
                    return True
        return False

    def get_responding_clients(self, user_id: str, client_ids: list[str]) -> list[str]:
        if not client_ids:
            return []
        res = db.table("mensagens").select("cliente_id").eq("perfil_id", user_id).in_("cliente_id", client_ids).execute()
        if res.data:
            return list(set(msg["cliente_id"] for msg in res.data if msg.get("cliente_id")))
        return []

    def get_latest_opportunity_for_client(self, cliente_id: str):
        op_res = db.table("oportunidades").select("id").eq("cliente_id", cliente_id).order("criado_em", desc=True).limit(1).execute()
        if op_res.data and len(op_res.data) > 0:
            return op_res.data[0]["id"]
        return None

    def insert_message(self, data: dict):
        return db.table("mensagens").insert(data).execute()

    def delete_all_messages(self, user_id: str):
        return db.table("mensagens").delete().eq("perfil_id", user_id).execute()

    def update_message(self, message_id: str, data: dict):
        return db.table("mensagens").update(data).eq("id", message_id).execute()

    def mark_all_as_read(self, user_id: str):
        return db.table("mensagens").update({"lida": True}).eq("perfil_id", user_id).eq("lida", False).execute()
