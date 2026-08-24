import logging
from google import genai
from google.genai import types
from backend.src.core import llm_client
from backend.src.modules.assistant import tools as assistant_tools

logger = logging.getLogger(__name__)

class AssistantAgent:
    def __init__(self, api_key: str, user_id: str):
        self.client = genai.Client(api_key=api_key)
        self.user_id = user_id
        
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
            # value vem como string mas no python pode precisar de cast, o ideal é o próprio python tipar dinamicamente, mas a IA manda string/int.
            return assistant_tools.update_config(self.user_id, config_key, value)
            
        self.tools = [get_estatisticas, toggle_engine, start_extractor, get_propostas_recentes, get_op_infos, gerar_proposta, update_config]
        
        sys_prompt = """Você é o Assistente Pessoal de IA do FreelaOS (carinhosamente conhecido como Nexus).
Seu papel é auxiliar o freelancer a analisar estatísticas, ligar/desligar o piloto automático de propostas, ligar o extrator, buscar informações completas de vagas específicas (get_op_infos)
e gerenciar as oportunidades ativas.
Sempre que o usuário pedir informações sobre propostas, faturamento, ou quiser alterar uma configuração, 
USE AS SUAS FERRAMENTAS (Tools). Não invente dados.
Responda de forma concisa, direta, mas cordial. Use formatação Markdown (negrito, listas) para deixar a leitura fácil."""

        _active_llm = llm_client._get_active_llm() ## o modelo configurado pelo usuario. Atribua à `model` para usar
        
        # Cria a sessão de chat, que mantém o histórico em memória
        self.chat = self.client.chats.create(
            model="gemini-3.1-flash-lite", ## modelo mais rápido e barato, mas ainda com capacidade de AFC (Auto Function Calling)
            config=types.GenerateContentConfig(
                system_instruction=sys_prompt,
                tools=self.tools,
                temperature=0.3
            )
        )
        
    def add_history(self, history_list: list):
        """Permite hidratar o histórico anterior do chat."""
        # Se for necessário recriar o histórico a partir do BD no futuro
        for msg in history_list:
            role = "user" if msg["role"] == "user" else "model"
            # google.genai chat history manipulation
            # self.chat._history.append(...) -> Para MVP, vamos assumir que o frontend 
            # manda o contexto na própria mensagem ou não precisamos de persistência ainda.
            pass
            
    def stream_chat(self, message: str):
        """Envia a mensagem, roda as tools automaticamente via SDK e gera a resposta."""
        import asyncio
        try:
            # WORKAROUND: google.genai send_message_stream engole o texto final quando o AFC (Auto Function Calling) é acionado.
            # Por isso, usamos o método síncrono send_message para garantir a execução da tool e a resposta completa.
            response = self.chat.send_message(message)
            
            # Simulamos um streaming para manter a UX bonita no frontend separando por blocos
            if response.text:
                # Quebra por espaços, mantendo os espaços para não perder a formatação
                words = response.text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
        except Exception as e:
            logger.error(f"Erro no AssistantAgent stream_chat: {e}")
            yield f"\n\n**Erro do Assistente:** {str(e)}"
