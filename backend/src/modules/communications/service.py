from asyncio.log import logger
import os
import re
from playwright.sync_api import sync_playwright
from backend.src.modules.auth.service import AuthService
from backend.src.modules.opportunities.repository import OpportunityRepository

opp_repo = OpportunityRepository()

class SenderService:
    @staticmethod
    def submit_proposta(vaga_id: str, user_id: str, texto: str, valor: int, prazo: str) -> dict:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        
        if not os.path.exists(session_dir):
            raise ValueError("Sessão do 99Freelas não encontrada. Conecte sua conta primeiro.")
            
        vaga = opp_repo.get_opportunity(vaga_id)
        if not vaga:
            raise ValueError("Vaga não encontrada no banco.")
            
        url_vaga = vaga.get("url")
        plataforma = vaga.get("plataforma")
        
        if not url_vaga or plataforma != "99Freelas":
            raise ValueError("URL inválida ou plataforma não suportada para envio automático.")

        with sync_playwright() as p:
            
            browser = p.chromium.launch_persistent_context(
                user_data_dir=session_dir,
                headless=False,
                viewport={"width": 1280, "height": 720},
                args=["--disable-blink-features=AutomationControlled"]
            )
            page = browser.new_page()
            
            try:
                page.goto(url_vaga, timeout=60000)
                
                # Verifica se a proposta já foi enviada (botão Melhorar Proposta)
                btn_melhorar = page.locator("a:has-text('Melhorar proposta'), a:has-text('Melhorar Proposta')").first
                if btn_melhorar.count() > 0:
                    opp_repo.update_opportunity(vaga_id, {"status": "Proposta enviada"})
                    return {"status": "success", "message": "Aviso: Uma proposta já havia sido enviada anteriormente. O status foi atualizado."}

                link_enviar = page.locator("a.btn.blue:has-text('Enviar proposta'), a:has-text('Enviar proposta')").first
                if link_enviar.count() > 0:
                    link_enviar.click()
                    page.wait_for_load_state("domcontentloaded", timeout=15000)
                

                if "register" in page.url:
                    logger.warning(f"[SENDER] Sessão expirada para o usuário {user_id}.")
                    browser.close()
                    raise ValueError("Sessão expirada. Por favor, reconecte sua conta 99Freelas.")
                 
                textarea = page.locator("#proposta")
                textarea.wait_for(state="visible", timeout=15000)
                textarea.fill(texto)
                
                campo_valor = page.locator("#oferta")
                if campo_valor.count() > 0:
                    campo_valor.fill(f"{valor},00")
                
                prazo_nums = re.findall(r'\d+', prazo)
                if prazo_nums:
                    prazo_dias = prazo_nums[0]
                    campo_prazo = page.locator("#duracao-estimada")
                    if campo_prazo.count() > 0:
                        campo_prazo.fill(prazo_dias)
                        
                btn_enviar = page.locator("#btnConcluirEnvioProposta")
                if btn_enviar.count() > 0:
                    btn_enviar.click()
                
                checkbox_seguro = page.locator("#confirmar-envio-proposta")
                try:
                    checkbox_seguro.wait_for(state="visible", timeout=5000)
                    checkbox_seguro.check()
                    btn_continuar = page.locator(".modal-confirmacao-proposta-pergunta .btn-acao:has-text('Continuar')")
                    if btn_continuar.count() > 0:
                        btn_continuar.click()
                except Exception:
                    pass
                    
                checkbox_suspeito = page.locator("#confirmar-padrao-suspeito-mensagem")
                try:
                    checkbox_suspeito.wait_for(state="visible", timeout=3000)
                    checkbox_suspeito.check()
                    btn_continuar_susp = page.locator(".modal-padrao-suspeito-mensagem .btn-acao:has-text('Continuar')")
                    if btn_continuar_susp.count() > 0:
                        btn_continuar_susp.click()
                except Exception:
                    pass
                
                page.wait_for_load_state("networkidle", timeout=10000)
                
                opp_repo.update_opportunity(vaga_id, {"status": "Proposta enviada"})
                return {"status": "success", "message": "Proposta enviada com sucesso pelo robô!"}
                
            except Exception as e:
                browser.close()
                raise ValueError(f"Envio falhou ou interceptou barreira: {str(e)}")
            finally:
                browser.close()
