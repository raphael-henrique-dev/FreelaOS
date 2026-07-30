import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

res = supabase.table("configuracoes_usuario").select("piloto_automatico_ativado").limit(1).execute()
print("piloto_automatico_ativado:", res.data)
