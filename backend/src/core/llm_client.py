import json
import time
import logging
import threading
import httpx
from google import genai
from openai import OpenAI

logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = ["openai", "claude", "groq", "gemini", "nvidia", "openrouter"]

PROVIDER_NAMES = {
    "openai": "OpenAI",
    "claude": "Claude (Anthropic)",
    "groq": "Groq",
    "gemini": "Google Gemini",
    "gemini-lite": "Google Gemini",
    "nvidia": "NVIDIA NIM",
    "openrouter": "OpenRouter",
}
PROVIDER_LABELS = PROVIDER_NAMES

# Armazenamento efêmero exclusivamente em memória RAM (Proxy BYOK).
# Estrutura: { user_id: { "gemini": "AIza...", "openai": "sk-...", ... } }
_keys_lock = threading.Lock()
_user_api_keys: dict[str, dict[str, str]] = {}


class MissingAPIKeyError(ValueError):
    """Exceção disparada quando o provedor selecionado não possui chave BYOK em memória."""
    pass


def _canonical_provider(provedor: str) -> str:
    if not provedor:
        return "gemini"
    p = provedor.strip().lower()
    if p == "gemini-lite":
        return "gemini"
    return p


def set_user_keys(user_id: str, keys: dict[str, str | None], replace_all: bool = False) -> dict[str, bool]:
    """
    Salva ou atualiza as chaves de API do usuário exclusivamente na memória RAM do processo.
    Nunca persiste em banco de dados ou disco.
    """
    if not user_id or not isinstance(keys, dict):
        return get_user_configured_providers(user_id) if user_id else {}

    with _keys_lock:
        current = {} if replace_all else dict(_user_api_keys.get(user_id, {}))
        for raw_prov, raw_val in keys.items():
            prov = _canonical_provider(raw_prov)
            if prov not in SUPPORTED_PROVIDERS:
                continue
            if raw_val is None:
                continue
            cleaned = str(raw_val).strip()
            if cleaned:
                current[prov] = cleaned
            else:
                current.pop(prov, None)

        if current:
            _user_api_keys[user_id] = current
        else:
            _user_api_keys.pop(user_id, None)

    return get_user_configured_providers(user_id)


def get_user_key(user_id: str | None, provedor: str) -> str | None:
    """Recupera a chave de API em memória RAM para o usuário e provedor especificados."""
    if not user_id:
        return None
    prov = _canonical_provider(provedor)
    with _keys_lock:
        user_store = _user_api_keys.get(user_id, {})
        return user_store.get(prov)


def get_user_configured_providers(user_id: str) -> dict[str, bool]:
    """Retorna um mapa booleano indicando quais provedores possuem chave ativa em memória."""
    if not user_id:
        return {p: False for p in SUPPORTED_PROVIDERS}
    with _keys_lock:
        user_store = _user_api_keys.get(user_id, {})
        return {p: bool(user_store.get(p)) for p in SUPPORTED_PROVIDERS}


def clear_user_keys(user_id: str, provedor: str | None = None) -> None:
    """Remove chaves de API da memória RAM (acionado no logout, exclusão de conta ou remoção manual)."""
    if not user_id:
        return
    with _keys_lock:
        if provedor:
            prov = _canonical_provider(provedor)
            if user_id in _user_api_keys:
                _user_api_keys[user_id].pop(prov, None)
                if not _user_api_keys[user_id]:
                    _user_api_keys.pop(user_id, None)
        else:
            _user_api_keys.pop(user_id, None)
    logger.info(f"[BYOK Memory] Chaves em memória limpas para o usuário {user_id} (provedor={provedor or 'TODOS'}).")


def _call_provider(prompt: str, provedor: str, user_id: str | None = None, force_json: bool = False) -> str:
    """Função interna para chamar o provedor específico utilizando exclusivamente a chave em memória do usuário."""
    canonical = _canonical_provider(provedor)
    provider_label = PROVIDER_NAMES.get(provedor, provedor.upper())
    api_key = get_user_key(user_id, canonical)

    if not api_key:
        raise MissingAPIKeyError(
            f"Chave de API para {provider_label} não configurada em memória. "
            f"Acesse Configurações -> Motores e Provedores de I.A para informar sua API Key."
        )

    if provedor == "groq":
        groq_client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1", timeout=25.0)
        res = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if force_json else None,
            max_tokens=4096
        )
        return res.choices[0].message.content

    elif provedor == "openai":
        openai_client = OpenAI(api_key=api_key, timeout=25.0)
        res = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if force_json else None
        )
        return res.choices[0].message.content

    elif provedor == "claude":
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        user_content = prompt
        if force_json:
            user_content = prompt + "\n\nIMPORTANTE: Responda EXCLUSIVAMENTE com um objeto JSON válido, sem blocos markdown."
        payload = {
            "model": "claude-3-5-sonnet-latest",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": user_content}],
        }
        with httpx.Client(timeout=30.0) as http_client:
            resp = http_client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            if resp.status_code != 200:
                raise ValueError(f"Erro na API Claude ({resp.status_code}): {resp.text[:200]}")
            data = resp.json()
            blocks = data.get("content", [])
            return "".join(b.get("text", "") for b in blocks if b.get("type") == "text")

    elif provedor == "nvidia":
        nvidia_client = OpenAI(api_key=api_key, base_url="https://integrate.api.nvidia.com/v1", timeout=25.0)
        res = nvidia_client.chat.completions.create(
            model="deepseek-ai/deepseek-v4-flash-0731",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if force_json else None,
            max_tokens=4096
        )
        return res.choices[0].message.content

    elif provedor == "openrouter":
        openrouter_client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1", timeout=25.0)
        res = openrouter_client.chat.completions.create(
            model="dots-studio/dots-3-note-preview:free",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if force_json else None
        )
        return res.choices[0].message.content

    elif provedor == "gemini-lite":
        gemini_client = genai.Client(api_key=api_key)
        config = {'response_mime_type': 'application/json'} if force_json else None
        res = gemini_client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=config
        )
        return res.text

    else:
        # Default é Gemini
        gemini_client = genai.Client(api_key=api_key)
        config = {'response_mime_type': 'application/json'} if force_json else None

        try:
            res = gemini_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config=config
            )
            return res.text
        except Exception as e:
            logger.warning(f"[GEMINI INTERNAL FALLBACK] gemini-3.5-flash falhou ({e}). Tentando gemini-3.1-flash-lite...")
            res = gemini_client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config=config
            )
            return res.text


def _get_enabled_llms(integracoes: dict) -> list[str]:
    if not isinstance(integracoes, dict):
        return []
    enabled = []
    for llm in SUPPORTED_PROVIDERS:
        val = integracoes.get(llm)
        if (isinstance(val, dict) and val.get("enabled") is True) or val is True:
            enabled.append(llm)
    return enabled


def _get_active_llm(user_id: str | None = None, agent_name: str = "principal") -> str:
    """
    Determina qual provedor de IA deve ser utilizado para o usuário e agente informados.
    Respeita a escolha entre o modo 'principal' (um único motor principal) ou 'por_agente'
    (motores específicos para scout, analista, redator, assistente).
    """
    if not user_id:
        return "gemini"

    try:
        from backend.src.modules.opportunities.repository import ProfileRepository
        profile_repo = ProfileRepository()
        config = profile_repo.get_user_settings(user_id)
    except Exception as e:
        logger.warning(f"Não foi possível ler configurações de LLM do usuário {user_id}: {e}")
        config = None

    if config and isinstance(config.get("integracoes"), dict):
        integracoes = config["integracoes"]
        enabled_llms = _get_enabled_llms(integracoes)
        routing = integracoes.get("llm_routing")

        if isinstance(routing, dict):
            modo = routing.get("mode") or routing.get("modo") or "principal"
            principal = routing.get("principal")
            agentes_map = routing.get("por_agente") or routing.get("agentes") or {}

            if modo == "por_agente" and isinstance(agentes_map, dict) and agent_name in agentes_map:
                chosen = _canonical_provider(agentes_map.get(agent_name, ""))
                if chosen in enabled_llms or chosen in SUPPORTED_PROVIDERS:
                    return chosen

            if principal:
                chosen_principal = _canonical_provider(principal)
                if chosen_principal in enabled_llms:
                    return chosen_principal

        if enabled_llms:
            # Prioriza o primeiro ativo que já tenha chave configurada em memória
            for llm in enabled_llms:
                if get_user_key(user_id, llm):
                    return llm
            return enabled_llms[0]

    # Se não houver nenhum marcado no banco mas houver chave em memória, usa o que tiver chave
    configured = get_user_configured_providers(user_id)
    for llm, has_key in configured.items():
        if has_key:
            return llm

    return "gemini"


def _get_fallback_llms(user_id: str | None, primary_provedor: str) -> list[str]:
    """
    Retorna a lista de provedores alternativos que estão ativos E possuem chave
    configurada em memória para o usuário, servindo como fallback real.
    """
    if not user_id:
        return []

    canonical_primary = _canonical_provider(primary_provedor)
    enabled_llms = []
    try:
        from backend.src.modules.opportunities.repository import ProfileRepository
        config = ProfileRepository().get_user_settings(user_id)
        if config and isinstance(config.get("integracoes"), dict):
            enabled_llms = _get_enabled_llms(config["integracoes"])
    except Exception:
        pass

    fallbacks = []
    for llm in enabled_llms:
        if llm != canonical_primary and get_user_key(user_id, llm):
            fallbacks.append(llm)
    return fallbacks


def generate_text(
    prompt: str,
    provedor: str = "gemini-lite",
    max_retries: int = 3,
    user_id: str | None = None
) -> str:
    """
    Chama a IA solicitando texto puro utilizando a chave BYOK do usuário em memória.
    Se o provedor principal falhar por erro de rede/cota e houver outro provedor ativo com chave, aciona fallback.
    """
    for attempt in range(max_retries):
        try:
            return _call_provider(prompt, provedor, user_id=user_id, force_json=False)
        except MissingAPIKeyError:
            # Sem chave configurada para o provedor escolhido: falha imediata sem retry lento
            raise
        except Exception as api_err:
            if attempt < max_retries - 1:
                wait_time = 5 * (attempt + 1)
                logger.warning(f"[LLM RETRY] Provedor {provedor} falhou ({api_err}). Tentando novamente em {wait_time}s...")
                time.sleep(wait_time)
            else:
                fallbacks = _get_fallback_llms(user_id, provedor)
                for fb_prov in fallbacks:
                    logger.warning(f"[LLM FALLBACK] Provedor {provedor} falhou {max_retries} vezes. Acionando fallback ativo {fb_prov}...")
                    try:
                        return _call_provider(prompt, fb_prov, user_id=user_id, force_json=False)
                    except Exception as fallback_err:
                        logger.error(f"[LLM ERROR] Fallback {fb_prov} também falhou: {fallback_err}")
                raise Exception(f"Falha ao comunicar com o provedor {PROVIDER_NAMES.get(provedor, provedor)}: {api_err}")


def generate_json(
    prompt: str,
    provedor: str = "gemini-lite",
    max_retries: int = 3,
    force_json: bool = True,
    user_id: str | None = None
) -> dict:
    """
    Chama a IA solicitando JSON utilizando a chave BYOK do usuário em memória.
    """
    texto_resposta = None
    used_provider = provedor

    for attempt in range(max_retries):
        try:
            texto_resposta = _call_provider(prompt, provedor, user_id=user_id, force_json=force_json)
            break
        except MissingAPIKeyError:
            raise
        except Exception as api_err:
            if attempt < max_retries - 1:
                wait_time = 5 * (attempt + 1)
                logger.warning(f"[LLM RETRY] Provedor {provedor} falhou ({api_err}). Tentando novamente em {wait_time}s...")
                time.sleep(wait_time)
            else:
                fallbacks = _get_fallback_llms(user_id, provedor)
                fallback_succeeded = False
                for fb_prov in fallbacks:
                    logger.warning(f"[LLM FALLBACK] Provedor {provedor} falhou {max_retries} vezes. Acionando fallback ativo {fb_prov}...")
                    try:
                        texto_resposta = _call_provider(prompt, fb_prov, user_id=user_id, force_json=force_json)
                        used_provider = fb_prov
                        fallback_succeeded = True
                        break
                    except Exception as fallback_err:
                        logger.error(f"[LLM ERROR] Fallback {fb_prov} também falhou: {fallback_err}")
                if not fallback_succeeded:
                    raise Exception(f"Falha ao comunicar com o provedor {PROVIDER_NAMES.get(provedor, provedor)}: {api_err}")

    if not texto_resposta:
        raise ValueError("Resposta vazia retornada pelo LLM.")
    clean_json = texto_resposta.replace("```json", "").replace("```", "").strip()

    if not clean_json.startswith("{") and "{" in clean_json:
        clean_json = clean_json[clean_json.find("{"):]

    try:
        import json_repair
        obj = json_repair.repair_json(clean_json, return_objects=True)
        if obj:
            logger.info(f"[LLM JSON] Utilizado provedor: {used_provider}")
            return obj
        raise ValueError("O JSON retornado estava completamente destruído e não pôde ser salvo.")
    except Exception as e:
        logger.error(f"Erro ao parsear JSON do LLM com json_repair: {clean_json}")
        raise ValueError(f"LLM não retornou um JSON válido. Erro: {str(e)}")
