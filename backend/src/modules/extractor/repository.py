from backend.src.core.database import db

class ActivityRepository:
    def get_latest_activity(self, user_id: str):
        res = (
            db.table("atividades_agentes")
            .select("*")
            .eq("perfil_id", user_id)
            .order("criado_em", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None
        return res.data[0]

    def get_activities(self, user_id: str, limit: int = 50):
        res = (
            db.table("atividades_agentes")
            .select("*")
            .eq("perfil_id", user_id)
            .order("criado_em", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
