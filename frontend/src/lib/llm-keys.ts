export type LLMProviderId =
  | "openai"
  | "claude"
  | "groq"
  | "gemini"
  | "nvidia"
  | "openrouter"

export type AgentSlotId = "scout" | "analista" | "redator" | "assistente"

export interface LLMRoutingConfig {
  mode: "principal" | "por_agente"
  principal: LLMProviderId
  por_agente: Record<AgentSlotId, LLMProviderId>
}

export const LLM_PROVIDER_IDS: LLMProviderId[] = [
  "openai",
  "claude",
  "groq",
  "gemini",
  "nvidia",
  "openrouter",
]

export const DEFAULT_LLM_ROUTING: LLMRoutingConfig = {
  mode: "principal",
  principal: "groq",
  por_agente: {
    scout: "groq",
    analista: "groq",
    redator: "groq",
    assistente: "gemini",
  },
}

const STORAGE_KEY = "freelaos_llm_keys"

/**
 * Lê o dicionário de chaves de API salvo localmente no navegador (BYOK).
 * As chaves nunca vão para o Supabase/PostgreSQL.
 */
export function getLocalLLMKeys(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim().length > 0) {
        clean[k.toLowerCase().trim()] = v.trim()
      }
    }
    return clean
  } catch {
    return {}
  }
}

/**
 * Salva ou atualiza o dicionário de chaves de API localmente no navegador.
 * Chaves vazias removem o provedor do armazenamento local.
 */
export function saveLocalLLMKeys(keys: Record<string, string>): Record<string, string> {
  if (typeof window === "undefined") return {}
  const current = getLocalLLMKeys()
  for (const [provider, key] of Object.entries(keys)) {
    const p = provider.toLowerCase().trim()
    const cleanKey = (key || "").trim()
    if (cleanKey) {
      current[p] = cleanKey
    } else {
      delete current[p]
    }
  }
  try {
    if (Object.keys(current).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    }
  } catch {
    // ignore quota errors
  }
  return current
}

/**
 * Remove uma única chave de provedor do localStorage.
 */
export function removeLocalLLMKey(provider: string): Record<string, string> {
  return saveLocalLLMKeys({ [provider]: "" })
}

/**
 * Limpa todas as chaves BYOK do navegador (chamado no logout e exclusão de conta).
 */
export function clearLocalLLMKeys(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Gera o valor codificado em Base64 (UTF-8 seguro) para o header HTTP `X-FreelaOS-LLM-Keys`,
 * permitindo que o backend reidrate a memória RAM volátil transparentemente em cada requisição.
 */
export function getEncodedLLMKeysHeader(): string | null {
  const keys = getLocalLLMKeys()
  if (Object.keys(keys).length === 0) return null
  try {
    const jsonStr = JSON.stringify(keys)
    return btoa(unescape(encodeURIComponent(jsonStr)))
  } catch {
    return null
  }
}
