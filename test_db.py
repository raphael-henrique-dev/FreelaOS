import os
import asyncio
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
db = create_client(supabase_url, supabase_key)

try:
    # Try querying with the join
    res = db.table("oportunidades").select("*, clientes(nome)").limit(1).execute()
    print("SUCCESS:", res.data)
except Exception as e:
    print("ERROR:", e)
