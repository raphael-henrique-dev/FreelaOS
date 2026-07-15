import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from google import genai

router = APIRouter()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Credenciais do Supabase não encontradas no ambiente (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise Exception("Variável GEMINI_API_KEY não encontrada no ambiente")

client = genai.Client(api_key=GEMINI_API_KEY)

class RedatorRequest(BaseModel):
    vaga_id: str
    user_id: str

def get_tone_prompt(modelo_ativo: str, personalizado_prompt: str) -> str:
    if modelo_ativo == "consultivo":
        return "Adote um tom consultivo e estratégico. Foque em fazer perguntas pertinentes, mostrar que você entende o problema de negócio por trás da vaga e sugerir caminhos antes mesmo de falar de preço. Seja cordial, demonstrando muita autoridade no assunto."
    elif modelo_ativo == "direto":
        return "Adote um tom direto ao ponto, curto e extremamente objetivo. Profissionais que valorizam o tempo do cliente. Sem enrolação. Diga o que vai ser entregue, como vai ser entregue e por que você é a pessoa certa em poucas linhas."
    elif modelo_ativo == "personalizado" and personalizado_prompt:
        return f"Siga ESTRITAMENTE as seguintes diretrizes de estilo de escrita fornecidas pelo usuário:\n\n{personalizado_prompt}"
    else:
        # Padrão
        return "Adote um tom profissional, amigável e equilibrado. Destaque a experiência relevante, aborde os pontos principais da vaga e termine com um convite aberto (call-to-action) para uma conversa."


@router.post("/api/redator/draft")
def gerar_proposta(req: RedatorRequest):
    try:
        # 1. Busca a oportunidade
        op_res = supabase.table("oportunidades").select("*").eq("id", req.vaga_id).execute()
        if not op_res.data:
            raise HTTPException(status_code=404, detail="Oportunidade não encontrada.")
        vaga = op_res.data[0]

        # 2. Busca o perfil do usuário
        perfil_res = supabase.table("perfis").select("*").eq("id", req.user_id).execute()
        if not perfil_res.data:
            raise HTTPException(status_code=404, detail="Perfil não encontrado.")
        perfil = perfil_res.data[0]

        # 3. Busca a configuração de modelo de proposta
        conf_res = supabase.table("configuracoes_usuario").select("modelos_proposta").eq("perfil_id", req.user_id).execute()
        
        modelo_ativo = "padrao"
        personalizado_prompt = ""

        if conf_res.data and conf_res.data[0].get("modelos_proposta"):
            mod = conf_res.data[0]["modelos_proposta"]
            if isinstance(mod, dict):
                modelo_ativo = mod.get("ativo", "padrao")
                personalizado_prompt = mod.get("personalizado_prompt", "")

        tone_instructions = get_tone_prompt(modelo_ativo, personalizado_prompt)

        # 4. Monta o Prompt para o Gemini
        sys_prompt = f"""Você é o Redator IA, um especialista em vendas B2B e captação de clientes que buscam freelancers.
Sua missão é escrever uma proposta matadora para a vaga descrita abaixo, se passando pelo perfil do profissional.

[PERFIL DO PROFISSIONAL]
Nome/Identificação: {perfil.get('nome', 'Profissional')}
Bio/Resumo: {perfil.get('bio', 'Não informado')}
Habilidades: {', '.join(perfil.get('habilidades', []))}
Nível de Experiência: {perfil.get('senioridade', 'Não informado')}

[DADOS DA VAGA]
Título: {vaga.get('titulo')}
Descrição Completa: {vaga.get('descricao')}
Orçamento: R$ {vaga.get('orcamento')}

[ESTILO DA PROPOSTA (DIRETRIZ OBRIGATÓRIA)]
{tone_instructions}

[INSTRUÇÕES GERAIS]
1. A proposta deve ser formatada em texto claro, com parágrafos curtos.
2. Seja persuasivo, mas honesto. Não invente habilidades que não estão no perfil do profissional.
3. Escreva em Português do Brasil de forma natural (evite clichês de IA).
4. Escreva APENAS o corpo da proposta (e o Assunto/Título, se achar necessário).
5. Assine no final com o nome do profissional.
6. Não utilize emojis e/ou caracteres especiais (a menos que solicitado no estilo da proposta)
"""
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                resposta = client.models.generate_content(model='gemini-3.5-flash', contents=sys_prompt)
                
                texto_proposta = resposta.text.strip()
                
                # Salva a proposta no banco de dados na coluna proposta_ia
                supabase.table("oportunidades").update({"proposta_ia": texto_proposta}).eq("id", req.vaga_id).execute()
                
                return {"proposta": texto_proposta, "modelo_utilizado": modelo_ativo}

            except Exception as api_err:
                if attempt < max_retries - 1:
                    wait_time = 15 * (attempt + 1)
                    print(f"[REDATOR RETRY] Gemini indisponível (Erro: {api_err}). Aguardando {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"[REDATOR FALLBACK] Gemini 3.5 falhou {max_retries} vezes. Acionando Gemini 3.1 Flash-Lite...")
                    try:
                        resposta = client.models.generate_content(model='gemini-3.1-flash-lite', contents=sys_prompt)
                        texto_proposta = resposta.text.strip()

                        supabase.table("oportunidades").update({"proposta_ia": texto_proposta}).eq("id", req.vaga_id).execute()

                        return {"proposta": texto_proposta, "modelo_utilizado": modelo_ativo}
                    
                    except Exception as fallback_err:
                        raise Exception(f"Ambos os modelos falharam. Erro final: {fallback_err}")

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
