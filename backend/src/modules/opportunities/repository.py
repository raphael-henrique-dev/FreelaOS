from backend.src.core.database import db

class OpportunityRepository:
    def get_opportunity(self, vaga_id: str):
        vaga_res = db.table("oportunidades").select("*").eq("id", vaga_id).execute()
        if not vaga_res.data:
            return None
        return vaga_res.data[0]

    def update_opportunity(self, vaga_id: str, data: dict):
        return db.table("oportunidades").update(data).eq("id", vaga_id).execute()
        
    def create_opportunity(self, data: dict):
        return db.table("oportunidades").insert(data).execute()

    def get_opportunities(self, user_id: str):
        # Traz as oportunidades ordenadas pela data de criação
        res = db.table("oportunidades").select("*, clientes(nome, foto_url)").eq("perfil_id", user_id).order("criado_em", desc=True).execute()
        return res.data

    def delete_opportunity(self, vaga_id: str):
        return db.table("oportunidades").delete().eq("id", vaga_id).execute()

    def delete_all_opportunities(self, user_id: str):
        return db.table("oportunidades").delete().eq("perfil_id", user_id).execute()

class ProfileRepository:
    def get_profile(self, user_id: str):
        perfil_res = db.table("perfis").select("*").eq("id", user_id).execute()
        if not perfil_res.data:
            return None
        return perfil_res.data[0]

    def get_user_settings(self, user_id: str):
        config_res = db.table("configuracoes_usuario").select("*").eq("perfil_id", user_id).execute()
        if not config_res.data:
            return None
        return config_res.data[0]

class ClientRepository:
    def get_client_by_name(self, perfil_id: str, name: str):
        c_res = db.table("clientes").select("*").eq("perfil_id", perfil_id).ilike("nome", name).execute()
        if not c_res.data:
            return None
        return c_res.data[0]
        
    def create_client(self, data: dict):
        return db.table("clientes").insert(data).execute()

    def update_client(self, client_id: str, data: dict):
        return db.table("clientes").update(data).eq("id", client_id).execute()

    def get_clients(self, perfil_id: str):
        res = db.table("vw_clientes").select("*, oportunidades(id, titulo, status, valor_proposta)").eq("perfil_id", perfil_id).order("atualizado_em", desc=True).execute()
        return res.data

