from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client, ClientOptions
import os
import json
import base64

security = HTTPBearer()

def _hydrate_keys_from_request(request: Request | None, user_id: str) -> None:
    """Se a requisição autenticada trouxer o header X-FreelaOS-LLM-Keys, hidrata a memória RAM."""
    if request is None or not user_id:
        return
    try:
        path = request.url.path if hasattr(request, "url") and request.url else ""
        if path.endswith("/logout") or path.endswith("/account"):
            return
        raw_header = request.headers.get("x-freelaos-llm-keys")
        if not raw_header:
            return
        decoded = base64.b64decode(raw_header).decode("utf-8")
        keys_dict = json.loads(decoded)
        if isinstance(keys_dict, dict) and keys_dict:
            from backend.src.core.llm_client import set_user_keys
            set_user_keys(user_id, keys_dict)
    except Exception:
        pass

def get_current_user(request: Request = None, credentials: HTTPAuthorizationCredentials = Security(security)):
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
        
        user_id = user_res.user.id
        _hydrate_keys_from_request(request, user_id)
        return {"user_id": user_id, "client": client, "token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Acesso negado: {str(e)}")

def verify_user_ownership(requested_id: str, current_user: dict = Depends(get_current_user)):
    if requested_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Acesso Negado: Tentativa de Acesso Cross-Tenant bloqueada.")
    return current_user
