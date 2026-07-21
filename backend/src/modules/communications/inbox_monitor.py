import os
import asyncio
import html
import traceback
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from playwright.async_api import async_playwright
from datetime import datetime

from backend.src.modules.communications.repository import MessageRepository
from backend.src.modules.opportunities.repository import ClientRepository

router = APIRouter()
msg_repo = MessageRepository()
client_repo = ClientRepository()

# Set para armazenar IDs de usuários que já estão com o monitor rodando, 
# evitando que múltiplos loops sejam disparados para a mesma pessoa.
active_monitors = set()

async def monitor_loop(user_id: str):
    print(f"[*] Iniciando monitor de Inbox para o usuário {user_id}")
    while user_id in active_monitors:
        try:
            print(f"[{datetime.now().hour}:{datetime.now().minute}:{datetime.now().second}] Verificando mensagens não lidas para {user_id}...")
            await check_unread_messages(user_id)
        except Exception as e:
            print(f"[!] Erro no monitoramento do usuário {user_id}: {e}")
        
        # Espera 5 minutos (300 segundos) antes da próxima varredura para evitar ban
        await asyncio.sleep(30)

async def check_unread_messages(user_id: str):
    session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
    if not os.path.exists(session_dir):
        return # Sem sessão, aguarda até o usuário logar no 99freelas.

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=session_dir,
            headless=True, # Rodar totalmente invisível em background
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = await browser.new_page()
        
        try:
            await page.goto("https://www.99freelas.com.br/messages/unread", timeout=60000)
            await page.wait_for_load_state("domcontentloaded")
            
            # Busca estritamente dentro da lista de conversas da página
            unread_locators = page.locator("ul.menu-list li.conversa-item:not(.model)")
            await unread_locators.first.wait_for(state="visible", timeout=5000)  # Espera até que pelo menos uma conversa seja visível
            count = await unread_locators.count()
            
            if count == 0:
                return # Nenhuma mensagem nova
                
            for i in range(count):
                node = unread_locators.nth(i)
                
                # Tenta extrair o remetente
                # O 99Freelas armazena os dados mastigados em inputs hidden (info-conversa-nome-pessoa)
                # ou na tag .pessoa-name
                remetente_input = node.locator("input.info-conversa-nome-pessoa").first
                remetente = await remetente_input.get_attribute("value") if await remetente_input.count() > 0 else ""

                print(f"[DEBUG] Remetente extraído do input: {remetente}")

                if not remetente:
                    remetente_loc = node.locator(".nome-usuario .text, .pessoa-name, .item-info-pessoa, .sub-title.nome-pessoa, .author, .name, .user-name, strong").first
                    print(f"[DEBUG] Remetente localizado: {remetente_loc}")
                    
                    remetente = await remetente_loc.text_content() if await remetente_loc.count() > 0 else "Desconhecido"
                
                # Decodifica HTML entities (ex: Host&aacute;cio -> Hostácio)
                remetente = html.unescape(remetente).strip()

                print(f"[DEBUG] Remetente extraído: {remetente}")
                
                if remetente == "Desconhecido":
                    html_dump = await node.inner_html()
                    print(f"[DEBUG-HTML] O HTML desse node é: {html_dump[:200]}...")
                
                # Tenta extrair o trecho do texto
                texto_loc = node.locator(".text, .message-content, .preview, p").first
                texto = await texto_loc.text_content() if await texto_loc.count() > 0 else "Mensagem sem texto detectado."
                texto = html.unescape(texto).strip()

                # FILTRO ANTI-FANTASMA
                if remetente == "Desconhecido" and texto == "Mensagem sem texto detectado.":
                    continue
                
                # Link da conversa (o 99freelas usa o data-id no li)
                conversa_id = await node.get_attribute("data-id")
                url_origem = f"https://www.99freelas.com.br/messages/unread/{conversa_id}" if conversa_id else ""

                # 1. EVITAR DUPLICIDADE
                if msg_repo.check_duplicate(user_id, remetente, url_origem, texto):
                    continue # Já alertamos sobre essa, passa pra próxima
                    
                # 2. CRUZAMENTO DE DADOS (Busca Cliente)
                cliente_id = None
                oportunidade_id = None
                
                if remetente != "Desconhecido":
                    # Tenta achar um cliente com nome parecido (case-insensitive)
                    cliente = client_repo.get_client_by_name(user_id, remetente)
                    if cliente:
                        cliente_id = cliente.get("id")
                        
                        # Se achou cliente, tenta achar o último projeto em andamento ou aguardando dele
                        oportunidade_id = msg_repo.get_latest_opportunity_for_client(cliente_id)

                # 3. SALVAR NO BANCO
                print(f"[DEBUG] Tentando salvar no banco. Tamanho do texto: {len(texto)} caracteres")
                try:
                    res = msg_repo.insert_message({
                        "perfil_id": user_id,
                        "cliente_id": cliente_id,
                        "oportunidade_id": oportunidade_id,
                        "remetente_nome": remetente,
                        "conteudo": texto,
                        "url_origem": url_origem,
                        "lida": False
                    })
                    print(f"[+] Nova mensagem recebida de {remetente} salva com sucesso!")
                    if hasattr(res, 'data') and not res.data:
                        print(f"[DEBUG] Atenção: O retorno do Supabase parece vazio. Resposta: {res}")
                except Exception as db_err:
                    print(f"[!] ERRO ESPECÍFICO AO INSERIR MENSAGEM NO SUPABASE:")
                    traceback.print_exc()

        except Exception as e:
            print(f"[!] Falha durante a extração de mensagens: {e}")
        finally:
            await browser.close()


class StartRequest(BaseModel):
    user_id: str

@router.post("/api/inbox/start")
async def start_monitor(req: StartRequest, background_tasks: BackgroundTasks):
    """
    Inicia o loop de monitoramento da Caixa de Entrada.
    O frontend deve chamar essa rota uma vez no login (ou quando o usuário abrir a plataforma).
    """
    if req.user_id not in active_monitors:
        active_monitors.add(req.user_id)
        # Joga o loop infinito numa task de background do FastAPI
        # background_tasks.add_task(monitor_loop, req.user_id)
        asyncio.create_task(monitor_loop(req.user_id))
        return {"status": "started", "message": "Monitor de Inbox ativado."}
    else:
        return {"status": "running", "message": "Monitor já está rodando para este usuário."}

@router.post("/api/inbox/stop")
async def stop_monitor(req: StartRequest):
    """
    Para o loop de monitoramento manualmente (ex: logout).
    """
    if req.user_id in active_monitors:
        active_monitors.remove(req.user_id)
    return {"status": "stopped", "message": "Monitor de Inbox desativado."}
