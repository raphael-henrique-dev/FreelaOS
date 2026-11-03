import json
import logging
import httpx
from google import genai
from google.genai import types
from openai import OpenAI
from backend.src.modules.assistant import tools as assistant_tools

logger = logging.getLogger(__name__)

SYS_PROMPT = """Você é o Assistente Pessoal de IA do FreelaOS (carinhosamente conhecido como Nexus).
Seu papel é auxiliar o freelancer a analisar estatísticas, ligar/desligar o piloto automático de propostas, ligar o extrator, buscar informações completas de vagas específicas (get_op_infos)
e gerenciar as oportunidades ativas.
Sempre que o usuário pedir informações sobre propostas, faturamento, ou quiser alterar uma configuração, 
USE AS SUAS FERRAMENTAS (Tools). Não invente dados.
Responda de forma concisa, direta, mas cordial. Use formatação Markdown (negrito, listas) para deixar a leitura fácil."""

OPENAI_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_estatisticas",
            "description": "Busca as estatísticas gerais do usuário: vagas capturadas, ignoradas, propostas geradas e enviadas.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_engine",
            "description": "Liga ou desliga o motor (piloto automático) do FreelaOS. True para ligar, False para desligar.",
            "parameters": {
                "type": "object",
                "properties": {"state": {"type": "boolean", "description": "True para ligar, False para desligar"}},
                "required": ["state"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_extractor",
            "description": "Liga o extrator automático para buscar novas vagas agora.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_propostas_recentes",
            "description": "Busca as oportunidades/propostas mais recentes do usuário.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Quantidade máxima de itens", "default": 5}},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_op_infos",
            "description": "Busca os detalhes completos de uma vaga/oportunidade específica a partir do seu ID.",
            "parameters": {
                "type": "object",
                "properties": {"vaga_id": {"type": "string", "description": "ID da vaga"}},
                "required": ["vaga_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "gerar_proposta",
            "description": "Inicia o agente Redator para criar uma proposta para a vaga_id especificada.",
            "parameters": {
                "type": "object",
                "properties": {"vaga_id": {"type": "string", "description": "ID da vaga"}},
                "required": ["vaga_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_config",
            "description": "Atualiza uma chave específica nas configurações do usuário ('prompt_personalizado', 'limite_automacao', 'piloto_automatico_ativado').",
            "parameters": {
                "type": "object",
                "properties": {
                    "config_key": {"type": "string"},
                    "value": {"type": "string"}
                },
                "required": ["config_key", "value"]
            }
        }
    }
]


class AssistantAgent:
    def __init__(self, api_key: str, user_id: str, provedor: str = "gemini"):
        self.api_key = api_key
        self.user_id = user_id
        self.provedor = provedor.lower().strip() if provedor else "gemini"

        # Closures para injetar o user_id automaticamente sem depender da IA adivinhar
        def get_estatisticas():
            """Busca as estatísticas gerais do usuário: vagas capturadas, ignoradas, propostas geradas e enviadas."""
            return assistant_tools.get_estatisticas(self.user_id)

        def toggle_engine(state: bool):
            """Liga ou desliga o motor (piloto automático) do FreelaOS. True para ligar, False para desligar."""
            return assistant_tools.toggle_engine(self.user_id, state)

        def start_extractor():
            """Liga o extrator automático"""
            return assistant_tools.start_extractor(self.user_id)

        def get_propostas_recentes(limit: int = 5):
            """Busca as oportunidades/propostas mais recentes do usuário."""
            return assistant_tools.get_propostas_recentes(self.user_id, limit)

        def get_op_infos(vaga_id: str):
            """Busca os detalhes completos de uma vaga/oportunidade específica a partir do seu ID (id)."""
            return assistant_tools.get_op_infos(vaga_id)

        def gerar_proposta(vaga_id: str):
            """Inicia o agente Redator para criar uma proposta para a vaga_id especificada."""
            return assistant_tools.gerar_proposta(vaga_id)

        def update_config(config_key: str, value: str):
            """Atualiza uma chave específica nas configurações do usuário. Chaves válidas: 'prompt_personalizado', 'limite_automacao', 'piloto_automatico_ativado'."""
            return assistant_tools.update_config(self.user_id, config_key, value)

        self.tools = [
            get_estatisticas,
            toggle_engine,
            start_extractor,
            get_propostas_recentes,
            get_op_infos,
            gerar_proposta,
            update_config,
        ]
        self.tool_map = {fn.__name__: fn for fn in self.tools}
        self.messages = [{"role": "system", "content": SYS_PROMPT}]
        self.chat = None

        if self.provedor in ("gemini", "gemini-lite"):
            self.client = genai.Client(api_key=api_key)
            self.chat = self.client.chats.create(
                model="gemini-3.1-flash-lite",
                config=types.GenerateContentConfig(
                    system_instruction=SYS_PROMPT,
                    tools=self.tools,
                    temperature=0.3
                )
            )
        elif self.provedor == "groq":
            self.client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1", timeout=30.0)
            self.model_name = "openai/gpt-oss-120b"
        elif self.provedor == "nvidia":
            self.client = OpenAI(api_key=api_key, base_url="https://integrate.api.nvidia.com/v1", timeout=30.0)
            self.model_name = "deepseek-ai/deepseek-v4-flash-0731"
        elif self.provedor == "openrouter":
            self.client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1", timeout=30.0)
            self.model_name = "dots-studio/dots-3-note-preview:free"
        else:
            # openai ou fallback compatível
            self.client = OpenAI(api_key=api_key, timeout=30.0)
            self.model_name = "gpt-4o-mini"

    def _send_openai_compatible(self, message: str) -> str:
        self.messages.append({"role": "user", "content": message})
        try:
            res = self.client.chat.completions.create(
                model=self.model_name,
                messages=self.messages,
                tools=OPENAI_TOOLS_SCHEMA,
                tool_choice="auto",
                temperature=0.3
            )
            msg = res.choices[0].message
            if msg.tool_calls:
                self.messages.append(msg)
                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    fn = self.tool_map.get(fn_name)
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except Exception:
                        args = {}
                    result = fn(**args) if fn else {"error": f"Tool {fn_name} não encontrada"}
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False)
                    })
                res2 = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=self.messages,
                    temperature=0.3
                )
                final_text = res2.choices[0].message.content or ""
                self.messages.append({"role": "assistant", "content": final_text})
                return final_text
            else:
                final_text = msg.content or ""
                self.messages.append({"role": "assistant", "content": final_text})
                return final_text
        except Exception:
            # Caso o modelo no provedor não suporte tools nativas (ex: alguns modelos free OpenRouter), faz chamada direta
            res = self.client.chat.completions.create(
                model=self.model_name,
                messages=self.messages,
                temperature=0.3
            )
            final_text = res.choices[0].message.content or ""
            self.messages.append({"role": "assistant", "content": final_text})
            return final_text

    def _send_claude(self, message: str) -> str:
        from backend.src.core.llm_client import generate_text
        convo = "\n".join(
            f"{m['role'].upper()}: {m['content']}"
            for m in self.messages[-6:]
            if isinstance(m.get("content"), str)
        )
        full_prompt = f"{SYS_PROMPT}\n\nHistórico:\n{convo}\n\nUSER: {message}\nASSISTANT:"
        reply = generate_text(full_prompt, provedor="claude", user_id=self.user_id)
        self.messages.append({"role": "user", "content": message})
        self.messages.append({"role": "assistant", "content": reply})
        return reply

    def stream_chat(self, message: str):
        """Envia a mensagem, roda as tools automaticamente via SDK e gera a resposta."""
        try:
            if self.provedor in ("gemini", "gemini-lite") and self.chat is not None:
                response = self.chat.send_message(message)
                reply_text = response.text or ""
            elif self.provedor == "claude":
                reply_text = self._send_claude(message)
            else:
                reply_text = self._send_openai_compatible(message)

            if reply_text:
                words = reply_text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
        except Exception as e:
            logger.error(f"Erro no AssistantAgent stream_chat: {e}")
            yield f"\n\n**Erro do Assistente:** {str(e)}"
