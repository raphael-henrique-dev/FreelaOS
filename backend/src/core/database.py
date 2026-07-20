import os
from supabase import create_client, Client

# Utilizamos a Service Role Key no backend para garantir acesso irrestrito às operações de sistema
# (ignora RLS se necessário, embora seja recomendável ter RLS nas tabelas).
# O Frontend usará apenas a Anon Key.
supabase_url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Variáveis de ambiente VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.")

# Singleton para a conexão com o banco
db: Client = create_client(supabase_url, supabase_key)
