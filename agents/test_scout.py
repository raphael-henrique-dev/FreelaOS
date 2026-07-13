import os
import json
from supabase import create_client, Client
import google.generativeai as genai
from dotenv import load_dotenv

print("--- INICIANDO TESTE ISOLADO ---")

load_dotenv(dotenv_path="../.env")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-3.5-flash')

prompt = """Você é o Scout IA. Extraia em JSON:
{
  "TITULO": "Título",
  "CLIENTE": "Cliente",
  "ORCAMENTO": 2500,
  "PRAZO": "final do mês",
  "STACK": ["React", "Nodejs"],
  "SCORE": 80,
  "DESCRICAO": "Sistema de gestão de barbearia"
}
VAGA: Preciso de um dev para criar um sistema de barbearia em React e Nodejs por 2500 reais para o final do mês. Meu nome é Carlos."""

try:
    print("1. Enviando para o Gemini (Aguarde...)")
    resposta = model.generate_content(prompt)
    print("2. Sucesso! O Gemini respondeu.")
    
    clean_json = resposta.text.replace("```json", "").replace("```", "").strip()
    dados_ia = json.loads(clean_json)
    
    registro = {
        "TITULO": dados_ia.get("TITULO", "Sem Título"),
        "CLIENTE": dados_ia.get("CLIENTE", "Confidencial"),
        "ORCAMENTO": dados_ia.get("ORCAMENTO", 0),
        "PRAZO": dados_ia.get("PRAZO", "Não informado"),
        "STACK": dados_ia.get("STACK", []),
        "SCORE": dados_ia.get("SCORE", 50),
        "DESCRICAO": dados_ia.get("DESCRICAO", ""),
        "PLATAFORMA": "99Freelas",
        "STATUS": "Nova"
    }
    
    print(f"3. Inserindo no Supabase: {registro['TITULO']}...")
    supabase.table("oportunidades").insert(registro).execute()
    print("4. TUDO PRONTO! Inserido com sucesso no Supabase.")
    
except Exception as e:
    print(f"ERRO: {str(e)}")
