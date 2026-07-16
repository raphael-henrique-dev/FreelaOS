import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv(dotenv_path="../.env")

# Importa as rotas dos agentes
from scout import router as scout_router
from analista import router as analista_router
from extractor import router as extractor_router
from redator import router as redator_router
from auth_platforms import router as auth_router
from sender import router as sender_router

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
app.include_router(scout_router)
app.include_router(analista_router)
app.include_router(extractor_router)
app.include_router(redator_router)
app.include_router(auth_router)
app.include_router(sender_router)

# Ponto de entrada central. Para rodar:
# uvicorn main:app --reload
