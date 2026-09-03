from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client, ClientOptions
import os

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        from supabase import create_client
        supabase_url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        supabase_anon_key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
        
        # Cliente com o contexto RLS do usuario
        client = create_client(
            supabase_url, 
            supabase_anon_key,
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        
        user_res = client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Token invalido ou expirado")
        
        return {"user_id": user_res.user.id, "client": client, "token": token}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Acesso negado: {str(e)}")

def verify_user_ownership(requested_id: str, current_user: dict = Depends(get_current_user)):
    if requested_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso Negado: Tentativa de Acesso Cross-Tenant bloqueada.")
    return current_user
