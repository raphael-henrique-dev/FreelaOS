import os
import json
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from google import genai

router = APIRouter()

# 1. Configuração do Supabase
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Variáveis do Supabase (URL ou SERVICE_ROLE_KEY) não encontradas no ambiente")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Configuração da API do Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise Exception("Variável GEMINI_API_KEY não encontrada no ambiente")

client = genai.Client(api_key=GEMINI_API_KEY)

# Modelo de entrada que a nossa API do Scout vai receber
class VagaBruta(BaseModel):
    texto: str
    plataforma: str = "Workana"
    perfil_id: str

@router.post("/api/scout/analyze")
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
      "DESCRICAO": "Resumo em 1 frase do que precisa ser feito"
    }}

    TEXTO DA VAGA BRUTA:
    {vaga.texto}
    """
    

    try:
        # Chama a inteligência do Gemini com Retry (inicialmente, não achei necessario usar o 3.5 para esta tarefa)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                resposta = client.models.generate_content(model='gemini-3.1-flash-lite', contents=prompt)
                break
            except Exception as api_err:
                if attempt < max_retries - 1:
                    wait_time = 15 * (attempt + 1)
                    print(f"[SCOUT RETRY] Gemini ocupado (Erro: {api_err}). Aguardando {wait_time} segundos antes de tentar de novo...")
                    time.sleep(wait_time)
                else:
                    raise api_err
        
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
            "score": 0, # O Score agora é gerado pelo Analista IA
            "descricao": dados_ia.get("DESCRICAO", ""),
            "plataforma": vaga.plataforma,
            "status": "Aguardando Análise",
            "perfil_id": vaga.perfil_id
        }
        
        # Salva no Banco de Dados
        result = supabase.table("oportunidades").insert(registro).execute()
        
        return {
            "mensagem": "Scout IA analisou e salvou a vaga com sucesso!", 
            "vaga_id": result.data[0]["id"] if result.data else None,
            "vaga_processada": registro
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do Agente Scout: {str(e)}")
