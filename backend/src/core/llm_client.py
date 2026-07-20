import os
import json
import time
import logging
from google import genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Variável GEMINI_API_KEY não encontrada no ambiente.")

_client = genai.Client(api_key=GEMINI_API_KEY)

def generate_json(prompt: str, model: str = 'gemini-3.5-flash', fallback_model: str = 'gemini-3.1-flash-lite', max_retries: int = 3, force_json: bool = False) -> dict:
    """
    Chama a API do Google Gemini solicitando JSON com lógica de retry, fallback e parse do JSON.
    """
    resposta = None
    config = {'response_mime_type': 'application/json'} if force_json else None
    
    for attempt in range(max_retries):
        try:
            resposta = _client.models.generate_content(model=model, contents=prompt, config=config)
            break
        except Exception as api_err:
            if attempt < max_retries - 1:
                wait_time = 15 * (attempt + 1)
                logger.warning(f"[LLM RETRY] Modelo {model} falhou ({api_err}). Tentando novamente em {wait_time} segundos...")
                time.sleep(wait_time)
            else:
                logger.error(f"[LLM FALLBACK] Modelo {model} falhou {max_retries} vezes. Acionando fallback {fallback_model}...")
                try:
                    resposta = _client.models.generate_content(model=fallback_model, contents=prompt, config=config)
                except Exception as fallback_err:
                    logger.error(f"[LLM ERROR] Ambos os modelos falharam. Erro final: {fallback_err}")
                    raise Exception(f"Ambos os modelos falharam. Erro final: {fallback_err}")
    
    if not resposta or not resposta.text:
        raise ValueError("Resposta vazia retornada pelo LLM.")
        
    clean_json = resposta.text.replace("```json", "").replace("```", "").strip()
    
    # Auto-fix para JSONs truncados (Gemini as vezes não fecha a chave no final)
    if not clean_json.endswith("}"):
        clean_json += "\n}"
        
    try:
        return json.loads(clean_json)
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear JSON do LLM: {clean_json}")
        raise ValueError(f"LLM não retornou um JSON válido. Erro: {str(e)}")

def generate_text(prompt: str, model: str = 'gemini-3.5-flash', fallback_model: str = 'gemini-3.1-flash-lite', max_retries: int = 3) -> str:
    """
    Chama a API do Google Gemini com lógica de retry e fallback, retornando o texto puro.
    """
    for attempt in range(max_retries):
        try:
            resposta = _client.models.generate_content(model=model, contents=prompt)
            return resposta.text
        except Exception as api_err:
            if attempt < max_retries - 1:
                wait_time = 15 * (attempt + 1)
                logger.warning(f"[LLM RETRY] Modelo {model} falhou ({api_err}). Tentando novamente em {wait_time} segundos...")
                time.sleep(wait_time)
            else:
                logger.error(f"[LLM FALLBACK] Modelo {model} falhou {max_retries} vezes. Acionando fallback {fallback_model}...")
                try:
                    resposta = _client.models.generate_content(model=fallback_model, contents=prompt)
                    return resposta.text
                except Exception as fallback_err:
                    logger.error(f"[LLM ERROR] Ambos os modelos falharam. Erro final: {fallback_err}")
                    raise Exception(f"Ambos os modelos falharam. Erro final: {fallback_err}")
