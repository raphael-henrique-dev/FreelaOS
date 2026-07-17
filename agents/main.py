import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(dotenv_path="../.env")

# Importa as rotas dos agentes
import scout
import analista
import redator
import sender
import auth_platforms
import extractor
import inbox_monitor

app = FastAPI(title="FreelaOS Agents API")

# Habilita CORS para permitir que o Frontend (localhost:5173) chame a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Na produção, mudar para a URL exata do Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra os agentes no orquestrador
app.include_router(scout.router)
app.include_router(analista.router)
app.include_router(redator.router)
app.include_router(sender.router)
app.include_router(auth_platforms.router)
app.include_router(extractor.router)
app.include_router(inbox_monitor.router)

# Ponto de entrada central. Para rodar:
# uvicorn main:app --reload
