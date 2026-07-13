import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do seu .env raiz (subindo um nível a partir de agents/)
load_dotenv(dotenv_path="../.env")

# 1. Configuração do Supabase
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Variáveis do Supabase (URL ou SERVICE_ROLE_KEY) não encontradas no arquivo .env superior")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Configuração da API do Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise Exception("Variável GEMINI_API_KEY não encontrada no arquivo .env superior")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-3.5-flash')

app = FastAPI()

# Modelo de entrada que a nossa API do Scout vai receber
class VagaBruta(BaseModel):
    texto: str
    plataforma: str = "Workana"

@app.post("/api/scout/analyze")
def analisar_vaga(vaga: VagaBruta):
    prompt = f"""
    Você é o Scout IA, um agente especializado em analisar descrições de vagas para freelancers.
    Leia o texto abaixo e extraia as seguintes informações em formato JSON válido e rigoroso.
    Não adicione NENHUM texto extra ou formatação markdown, retorne APENAS as chaves abaixo:
    
    {{
      "TITULO": "Título resumido do projeto",
      "CLIENTE": "Nome do cliente ou 'Confidencial'",
      "ORCAMENTO": 0, (apenas o número, ou 0 se não informado)
      "PRAZO": "ex: 2 semanas, indeterminado",
      "STACK": ["Tech1", "Tech2"],
      "SCORE": 75, (sua nota de 0 a 100 baseada na qualidade da vaga)
      "DESCRICAO": "Resumo em 1 frase do que precisa ser feito"
    }}

    TEXTO DA VAGA BRUTA:
    {vaga.texto}
    """
    
    try:
        # Chama a inteligência do Gemini
        resposta = model.generate_content(prompt)
        
        # Limpa o texto da resposta para garantir que o Python consiga ler como JSON
        clean_json = resposta.text.replace("```json", "").replace("```", "").strip()
        dados_ia = json.loads(clean_json)
        
        # Prepara para salvar no Supabase
        registro = {
            "titulo": dados_ia.get("TITULO", "Sem Título"),
            "cliente": dados_ia.get("CLIENTE", "Confidencial"),
            "orcamento": dados_ia.get("ORCAMENTO", 0),
            "prazo": dados_ia.get("PRAZO", "Não informado"),
            "stack": dados_ia.get("STACK", []),
            "score": dados_ia.get("SCORE", 50),
            "descricao": dados_ia.get("DESCRICAO", ""),
            "plataforma": vaga.plataforma,
            "status": "Nova"
        }
        
        # Salva no Banco de Dados
        supabase.table("oportunidades").insert(registro).execute()
        
        return {"mensagem": "Scout IA analisou e salvou a vaga com sucesso!", "vaga_processada": registro}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do Agente: {str(e)}")
