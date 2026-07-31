import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Formatter customizado para encurtar o nome do módulo
class ShortNameFormatter(logging.Formatter):
    def format(self, record):
        # Pega as últimas 2 partes do caminho do módulo. Ex: communications.inbox_monitor
        parts = record.name.split('.')
        record.short_name = '.'.join(parts[-2:])
        return super().format(record)

handler = logging.StreamHandler()
handler.setFormatter(ShortNameFormatter(
    fmt="\033[33;1m%(asctime)s\033[m  - \033[1m[%(levelname)s] - %(short_name)s - %(message)s\033[0m",
    datefmt='%d/%m/%Y %H:%M:%S'
))

# Configuração global de Logs para o terminal
logging.basicConfig(
    level=logging.INFO,
    handlers=[handler],
    force=True
)
# Libera os logs de nível DEBUG especificamente para o nosso código (evita spam de bibliotecas externas)
logging.getLogger("backend").setLevel(logging.DEBUG)

# Silencia logs verbosos (como httpx) para não poluir o terminal, 
# já que o FastAPI e o uvicorn já logam as requisições
logging.getLogger("httpx").setLevel(logging.WARNING)

# Importa as rotas refatoradas
from backend.src.modules.opportunities.router import router as opportunities_router
from backend.src.modules.communications.router import router as communications_router
from backend.src.modules.extractor.router import router as extractor_router
from backend.src.modules.auth.router import router as auth_router
from backend.src.modules.assistant.router import router as assistant_router

# O inbox_monitor e extractor antigamente eram disparados por rotas,
# Precisamos garantir que eles não quebrem.
try:
    from backend.src.modules.communications.inbox_monitor import router as inbox_router
except ImportError:
    inbox_router = None

app = FastAPI(title="FreelaOS Agents API (Clean Arch)")

# Lê a string do .env e converte para lista (ex: "http://localhost:5173,https://meusite.com")
origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
# Se houver comentário no formato ' //', ele remove.
clean_env = origins_env.split(" //")[0].replace('"', '').strip()
origins_list = [origin.strip() for origin in clean_env.split(",")] if clean_env else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"], # Headers podem permanecer "*" pois são mitigados pela limitação da origem
)

# Registra os roteadores
app.include_router(opportunities_router)
app.include_router(communications_router)
app.include_router(extractor_router)
app.include_router(auth_router)
app.include_router(assistant_router)

if inbox_router:
    app.include_router(inbox_router)

# Ponto de entrada central. Para rodar:
# PYTHONPATH=$(pwd) uvicorn backend.src.main:app --reload
