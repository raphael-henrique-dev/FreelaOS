import os
import asyncio
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client
from playwright.async_api import async_playwright
from datetime import datetime

router = APIRouter()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Set para armazenar IDs de usuários que já estão com o monitor rodando, 
# evitando que múltiplos loops sejam disparados para a mesma pessoa.
active_monitors = set()

async def monitor_loop(user_id: str):
    print(f"[*] Iniciando monitor de Inbox para o usuário {user_id}")
    while user_id in active_monitors:
        try:
            await check_unread_messages(user_id)
        except Exception as e:
            print(f"[!] Erro no monitoramento do usuário {user_id}: {e}")
        
        # Espera 5 minutos (300 segundos) antes da próxima varredura para evitar ban
        await asyncio.sleep(300)

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
            
            # Localizar itens de mensagem não lida
            # No 99freelas as mensagens costumam estar em listas ou divs de conversas.
            # Este seletor tenta capturar elementos genéricos não lidos na interface de mensagens.
            # Pode requerer ajustes se o HTML da plataforma mudar.
            unread_locators = page.locator("li.unread, .message-list-item.unread, div.conversation.unread")
            count = await unread_locators.count()
            
            if count == 0:
                return # Nenhuma mensagem nova
                
            for i in range(count):
                node = unread_locators.nth(i)
                
                # Tenta extrair o remetente
                remetente_loc = node.locator(".author, .name, .user-name, strong").first
                remetente = await remetente_loc.text_content() if await remetente_loc.count() > 0 else "Desconhecido"
                remetente = remetente.strip()
                
                # Tenta extrair o trecho do texto
                texto_loc = node.locator(".text, .message-content, .preview, p").first
                texto = await texto_loc.text_content() if await texto_loc.count() > 0 else "Mensagem sem texto detectado."
                texto = texto.strip()
                
                # Link da conversa para o usuário poder clicar na Inbox e ir pro site
                url_loc = node.locator("a").first
                url_origem = await url_loc.get_attribute("href") if await url_loc.count() > 0 else ""
                if url_origem and not url_origem.startswith("http"):
                    url_origem = "https://www.99freelas.com.br" + url_origem

                # 1. EVITAR DUPLICIDADE
                # Verifica se já salvamos essa mensagem recentemente baseada no remetente e url
                # Vamos checar se há uma mensagem idêntica não lida deste remetente.
                duplicata = supabase.table("mensagens").select("id").eq("perfil_id", user_id).eq("remetente_nome", remetente).eq("url_origem", url_origem).eq("lida", False).execute()
                if duplicata.data and len(duplicata.data) > 0:
                    continue # Já alertamos sobre essa, passa pra próxima
                    
                # 2. CRUZAMENTO DE DADOS (Busca Cliente)
                cliente_id = None
                oportunidade_id = None
                
                if remetente != "Desconhecido":
                    # Tenta achar um cliente com nome parecido (case-insensitive)
                    cliente_res = supabase.table("clientes").select("id").eq("perfil_id", user_id).ilike("nome", f"%{remetente}%").execute()
                    if cliente_res.data and len(cliente_res.data) > 0:
                        cliente_id = cliente_res.data[0]["id"]
                        
                        # Se achou cliente, tenta achar o último projeto em andamento ou aguardando dele
                        op_res = supabase.table("oportunidades").select("id").eq("cliente_id", cliente_id).order("created_at", desc=True).limit(1).execute()
                        if op_res.data and len(op_res.data) > 0:
                            oportunidade_id = op_res.data[0]["id"]

                # 3. SALVAR NO BANCO
                supabase.table("mensagens").insert({
                    "perfil_id": user_id,
                    "cliente_id": cliente_id,
                    "oportunidade_id": oportunidade_id,
                    "remetente_nome": remetente,
                    "conteudo": texto,
                    "url_origem": url_origem,
                    "lida": False
                }).execute()
                
                print(f"[+] Nova mensagem recebida de {remetente} salva com sucesso!")

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
        background_tasks.add_task(monitor_loop, req.user_id)
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
