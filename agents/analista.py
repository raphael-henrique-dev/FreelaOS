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
    raise Exception("Variáveis do Supabase não encontradas no ambiente")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Configuração da API do Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise Exception("Variável GEMINI_API_KEY não encontrada no ambiente")

client = genai.Client(api_key=GEMINI_API_KEY)

class AvaliacaoRequest(BaseModel):
    vaga_id: str
    user_id: str

@router.post("/api/analista/evaluate")
def avaliar_oportunidade(req: AvaliacaoRequest):
    try:
        # 1. Buscar a Vaga
        vaga_res = supabase.table("oportunidades").select("*").eq("id", req.vaga_id).execute()
        if not vaga_res.data:
            raise HTTPException(status_code=404, detail="Vaga não encontrada")
        vaga = vaga_res.data[0]

        # 2. Buscar o Perfil do Usuário
        perfil_res = supabase.table("perfis").select("*").eq("id", req.user_id).execute()
        if not perfil_res.data:
            raise HTTPException(status_code=404, detail="Perfil de usuário não encontrado")
        perfil = perfil_res.data[0]

        # 3. Montar o Prompt para o Analista
        prompt = f"""
        Você é o Analista IA, um agente rigoroso responsável por calcular o "Score de Compatibilidade" (0 a 100)
        de uma oportunidade de projeto freelancer em relação ao perfil do desenvolvedor.
        
        PERFIL DO DESENVOLVEDOR:
        - Habilidades Principais: {', '.join(perfil.get('habilidades', []))}
        - Senioridade: {perfil.get('senioridade', 'Não informada')}
        - Valor Mínimo por Hora: {perfil.get('valor_hora_minimo', 0)}
        - Valor Mínimo por Projeto Fechado: {perfil.get('valor_projeto_minimo', 0)}
        - Moeda Base: {perfil.get('moeda_base', 'BRL')}
        - Biografia: {perfil.get('bio', '')}

        OPORTUNIDADE ENCONTRADA (Pelo Scout AI):
        - Título: {vaga.get('titulo', '')}
        - Descrição: {vaga.get('descricao', '')}
        - Tecnologias (Stack): {', '.join(vaga.get('stack', []))}
        - Orçamento Indicado: {vaga.get('orcamento', 0)}
        - Prazo: {vaga.get('prazo', '')}
        - Plataforma: {vaga.get('plataforma', '')}

        INSTRUÇÕES DA ANÁLISE:
        Calcule uma nota de 0 a 100 considerando:
        1. Fit Técnico: A Stack bate com as habilidades do desenvolvedor?
        2. Fit Financeiro: O orçamento está de acordo com o mínimo que ele aceita?
        3. Fit de Experiência: O desafio condiz com a senioridade dele?
        4. Fit Cultural/Potencial: Leia a biografia do desenvolvedor (caso exista) e busque habilidades, experiências ou características que possam aproximá-lo da vaga
        
        Responda EXCLUSIVAMENTE com um JSON válido seguindo este formato rigoroso:
        {{
            "SCORE": 85 (exemplo),
            "EXPLICACAO": "Seu parecer analítico, curto e direto (em português), explicando por que deu esta nota e se vale a pena ele aplicar ou ignorar."
        }}
        """

        # Chama a IA com Retry e Fallback
        max_retries = 3
        for attempt in range(max_retries):
            try:
                resposta = client.models.generate_content(model='gemini-3.5-flash', contents=prompt)
                break
            except Exception as api_err:
                if attempt < max_retries - 1:
                    wait_time = 15 * (attempt + 1)
                    print(f"[ANALISTA RETRY] Gemini 3.5 falhou. Tentando novamente em {wait_time} segundos...")
                    time.sleep(wait_time)
                else:
                    # Se falhou 3 vezes, aciona o Fallback
                    print("[ANALISTA FALLBACK] Gemini 3.5 falhou 3 vezes. Acionando Gemini 3.1 Flash-Lite...")
                    try:
                        resposta = client.models.generate_content(model='gemini-3.1-flash-lite', contents=prompt)
                    except Exception as fallback_err:
                        # Se o plano B também cair, levanta o erro
                        raise Exception(f"Ambos os modelos falharam. Erro final: {fallback_err}")
                    
        clean_json = resposta.text.replace("```json", "").replace("```", "").strip()
        dados_ia = json.loads(clean_json)

        novo_score = dados_ia.get("SCORE", 0)
        nova_explicacao = dados_ia.get("EXPLICACAO", "Análise não retornou justificativa.")

        # 4. Atualizar no Banco de Dados
        supabase.table("oportunidades").update({
            "score": novo_score,
            "explicacao_score": nova_explicacao,
            "status": "Analisada"
        }).eq("id", req.vaga_id).execute()

        return {
            "mensagem": "Analista IA processou a vaga com sucesso!",
            "score": novo_score,
            "explicacao": nova_explicacao
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do Analista: {str(e)}")
