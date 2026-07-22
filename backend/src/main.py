import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração global de Logs para o terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%H:%M:%S"
)
# Libera os logs de nível DEBUG especificamente para o nosso código (evita spam de bibliotecas externas)
logging.getLogger("backend").setLevel(logging.DEBUG)

# Importa as rotas refatoradas
from backend.src.modules.opportunities.router import router as opportunities_router
from backend.src.modules.communications.router import router as communications_router
from backend.src.modules.extractor.router import router as extractor_router
from backend.src.modules.auth.router import router as auth_router

# O inbox_monitor e extractor antigamente eram disparados por rotas,
# Precisamos garantir que eles não quebrem.
try:
    from backend.src.modules.communications.inbox_monitor import router as inbox_router
except ImportError:
    inbox_router = None

app = FastAPI(title="FreelaOS Agents API (Clean Arch)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra os roteadores
app.include_router(opportunities_router)
app.include_router(communications_router)
app.include_router(extractor_router)
app.include_router(auth_router)

if inbox_router:
    app.include_router(inbox_router)

# Ponto de entrada central. Para rodar:
# PYTHONPATH=$(pwd) uvicorn backend.src.main:app --reload
