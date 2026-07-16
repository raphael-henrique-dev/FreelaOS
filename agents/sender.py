import os
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from playwright.sync_api import sync_playwright

router = APIRouter()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SubmitRequest(BaseModel):
    vaga_id: str
    user_id: str
    texto: str
    valor: int
    prazo: str

@router.post("/api/sender/submit")
def submit_proposta(req: SubmitRequest):
    session_dir = os.path.join(os.getcwd(), "playwright_sessions", req.user_id, "99freelas")
    
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=401, detail="Sessão do 99Freelas não encontrada. Conecte sua conta primeiro.")
        
    # Fetch vaga details to get URL
    vaga_res = supabase.table("oportunidades").select("url, plataforma").eq("id", req.vaga_id).single().execute()
    if not vaga_res.data:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no banco.")
        
    url_vaga = vaga_res.data.get("url")
    plataforma = vaga_res.data.get("plataforma")
    
    if not url_vaga or plataforma != "99Freelas":
        raise HTTPException(status_code=400, detail="URL inválida ou plataforma não suportada para envio automático.")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch_persistent_context(
                user_data_dir=session_dir,
                headless=True, # 100% invisível 
                viewport={"width": 1280, "height": 720},
                args=["--disable-blink-features=AutomationControlled"]
            )
            page = browser.new_page()
            
            try:
                page.goto(url_vaga, timeout=60000)
                
                # O botão "Enviar proposta" no 99Freelas geralmente é um link para a página do form
                link_enviar = page.locator("a.btn.blue:has-text('Enviar proposta'), a:has-text('Enviar proposta')").first
                if link_enviar.count() > 0:
                    # Clica e aguarda a navegação para a página de bid (formulário)
                    link_enviar.click()
                    page.wait_for_load_state("domcontentloaded", timeout=15000)
                
                # Agora deve estar na tela do formulário
                # Aguarda o carregamento do campo principal da proposta
                textarea = page.locator("#proposta")
                textarea.wait_for(state="visible", timeout=15000)
                
                # Preenche a proposta (texto)
                textarea.fill(req.texto)
                
                # Preenche o valor (oferta)
                # O input type='tel' vem com "0,00". Ao dar fill em "150,00", ele substitui tudo.
                campo_valor = page.locator("#oferta")
                if campo_valor.count() > 0:
                    campo_valor.fill(f"{req.valor},00")
                
                # Preenche o prazo (duracao-estimada)
                # Extrai apenas os números da string (ex: "7 dias" -> "7")
                import re
                prazo_nums = re.findall(r'\d+', req.prazo)
                if prazo_nums:
                    prazo_dias = prazo_nums[0]
                    campo_prazo = page.locator("#duracao-estimada")
                    if campo_prazo.count() > 0:
                        campo_prazo.fill(prazo_dias)
                        
                # Localiza e clica no botão principal de enviar proposta
                btn_enviar = page.locator("#btnConcluirEnvioProposta")
                if btn_enviar.count() > 0:
                    # Descomente a linha abaixo para realmente CLICAR no botão no 99Freelas real.
                    btn_enviar.click()
                
                # O 99Freelas abre modais de confirmação após clicar em enviar. 
                # Modal 1: Lembrete dos termos (Mantenha-se seguro)
                checkbox_seguro = page.locator("#confirmar-envio-proposta")
                try:
                    # Espera até 5 segundos pelo modal
                    checkbox_seguro.wait_for(state="visible", timeout=5000)
                    checkbox_seguro.check()
                    
                    # Clica no botão "Continuar" dentro do modal
                    btn_continuar = page.locator(".modal-confirmacao-proposta-pergunta .btn-acao:has-text('Continuar')")
                    if btn_continuar.count() > 0:
                        btn_continuar.click()
                except Exception:
                    pass # O modal não apareceu
                    
                # Modal 2 (Opcional): Suspeita de contato no texto
                checkbox_suspeito = page.locator("#confirmar-padrao-suspeito-mensagem")
                try:
                    checkbox_suspeito.wait_for(state="visible", timeout=3000)
                    checkbox_suspeito.check()
                    btn_continuar_susp = page.locator(".modal-padrao-suspeito-mensagem .btn-acao:has-text('Continuar')")
                    if btn_continuar_susp.count() > 0:
                        btn_continuar_susp.click()
                except Exception:
                    pass
                
                # Aguarda a resposta da rede/sucesso
                page.wait_for_load_state("networkidle", timeout=10000)
                
                # Atualiza no banco para o status "Proposta enviada"
                supabase.table("oportunidades").update({"status": "Proposta enviada"}).eq("id", req.vaga_id).execute()
                
                return {"status": "success", "message": "Proposta enviada com sucesso pelo robô!"}
                
            except Exception as e:
                # O Erro Edge Case
                browser.close()
                raise HTTPException(status_code=400, detail=f"Envio falhou ou interceptou barreira: {str(e)}")
            
            finally:
                browser.close()
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
