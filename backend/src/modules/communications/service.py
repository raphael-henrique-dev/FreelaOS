from asyncio.log import logger
import json
import os
import re
from playwright.sync_api import sync_playwright
from datetime import datetime
from backend.src.core.browser_manager import BrowserManager
from backend.src.modules.auth.service import AuthService
from backend.src.modules.opportunities.repository import OpportunityRepository, ProfileRepository

opp_repo = OpportunityRepository()
prof_repo = ProfileRepository()

class SenderService:
    @staticmethod
    def _to_float(value) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _format_brl(value: float) -> str:
        return f"{value:.2f}".replace(".", ",")

    @staticmethod
    def _parse_money_value(raw_text: str) -> float | None:
        if not raw_text:
            return None
        cleaned = raw_text.strip()
        cleaned = re.sub(r"[^\d,\.]", "", cleaned)
        if not cleaned:
            return None
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return None

    @staticmethod
    def _get_avg_discount_config(user_id: str) -> tuple[bool, float]:
        config_res = prof_repo.get_user_settings(user_id)
        if not config_res:
            return False, 0.0
        modelos = config_res.get("modelos_proposta", {}) or {}
        if isinstance(modelos, str):
            try:
                modelos = json.loads(modelos)
            except Exception:
                modelos = {}

        enabled = bool(modelos.get("enviar_abaixo_media_ativo", False))
        percentual = SenderService._to_float(modelos.get("enviar_abaixo_media_percentual", 0.0))
        percentual = max(0.0, min(100.0, percentual))
        return enabled, percentual

    @staticmethod
    def _extract_preco_medio(page) -> float | None:
        div_selectors = [
            "div.preco-medio",
            "div.preco_medio",
            "div.media-propostas",
            "div.media_propostas",
            "div[class*='preco'][class*='medio']",
            "div[class*='media'][class*='proposta']",
        ]
        selectors = [
            "text=/preço médio/i",
            "text=/preco medio/i",
            "text=/média das propostas/i",
            "text=/media das propostas/i",
        ]
        patterns = [
            r"pre[çc]o\s*m[eé]dio[^r$0-9]{0,30}r\$\s*([\d\.\,]+)",
            r"m[eé]dia\s+das\s+propostas[^r$0-9]{0,30}r\$\s*([\d\.\,]+)",
            r"r\$\s*([\d\.\,]+)",
        ]

        for selector in div_selectors:
            try:
                locator = page.locator(selector).first
                if locator.count() == 0:
                    continue
                text = locator.inner_text(timeout=2000)
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        parsed = SenderService._parse_money_value(match.group(1))
                        if parsed is not None:
                            return parsed
            except Exception:
                continue

        try:
            div_texts = page.evaluate("""
                () => {
                    const divs = Array.from(document.querySelectorAll("div"));
                    return divs
                        .filter((div) => {
                            const className = String(div.className || "").toLowerCase();
                            const text = String(div.textContent || "").toLowerCase();
                            return (
                                text.includes("r$") &&
                                (
                                    className.includes("preco") ||
                                    className.includes("preço") ||
                                    className.includes("media") ||
                                    text.includes("preço médio") ||
                                    text.includes("preco medio") ||
                                    text.includes("média das propostas") ||
                                    text.includes("media das propostas")
                                )
                            );
                        })
                        .map((div) => String(div.textContent || ""));
                }
            """)
            if isinstance(div_texts, list):
                for text in div_texts:
                    for pattern in patterns:
                        match = re.search(pattern, str(text), re.IGNORECASE)
                        if match:
                            parsed = SenderService._parse_money_value(match.group(1))
                            if parsed is not None:
                                return parsed
        except Exception:
            pass

        for selector in selectors:
            try:
                locator = page.locator(selector).first
                if locator.count() == 0:
                    continue
                text = locator.inner_text(timeout=2000)
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        parsed = SenderService._parse_money_value(match.group(1))
                        if parsed is not None:
                            return parsed
            except Exception:
                continue

        try:
            full_text = page.content()
            for pattern in patterns[:2]:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    parsed = SenderService._parse_money_value(match.group(1))
                    if parsed is not None:
                        return parsed
        except Exception:
            return None
        return None

    @staticmethod
    def _confirm_submission_modals(page):
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

    @staticmethod
    def _auto_adjust_by_avg_price(page, user_id: str, valor_enviado: float) -> float:
        enabled, percentual = SenderService._get_avg_discount_config(user_id)
        if not enabled or percentual <= 0:
            return valor_enviado

        btn_melhorar = page.locator("a.btn:has-text('Melhorar proposta'), a.btn:has-text('Melhorar Proposta')").first
        if btn_melhorar.count() == 0:
            return valor_enviado

        btn_melhorar.click()
        page.wait_for_load_state("domcontentloaded", timeout=15000)

        preco_medio = SenderService._extract_preco_medio(page)
        if preco_medio is None or preco_medio <= 0:
            return valor_enviado

        target_value = round(preco_medio * (1 - (percentual / 100.0)), 2)
        target_value = max(0.0, target_value)

        if abs(valor_enviado - target_value) < 0.01:
            return valor_enviado

        campo_valor = page.locator("#oferta")
        if campo_valor.count() == 0:
            return valor_enviado
        campo_valor.fill(SenderService._format_brl(target_value))

        btn_salvar = page.locator(
            "#btnConcluirEnvioProposta, button:has-text('Atualizar proposta'), button:has-text('Salvar proposta'), a.btn:has-text('Atualizar proposta'), a.btn:has-text('Salvar proposta')"
        ).first
        if btn_salvar.count() > 0:
            btn_salvar.click()
            SenderService._confirm_submission_modals(page)
            page.wait_for_load_state("networkidle", timeout=10000)

        return target_value

    @staticmethod
    def submit_proposta(vaga_id: str, user_id: str, texto: str, valor: float, prazo: str) -> dict:
        if BrowserManager.is_cancelled(user_id):
            logger.info(f"[SENDER] Envio cancelado devido ao logout do usuário {user_id}.")
            return {"status": "cancelled", "message": "Envio cancelado."}

        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        
        # Verifica pelo serviço de autenticação para garantir que há tokens/cookies válidos
        if not AuthService.status_99freelas(user_id):
            logger.error(f"[SENDER] Sessão do 99Freelas não encontrada ou expirada para o usuário {user_id}.")
            raise ValueError("Sessão do 99Freelas não encontrada ou expirada. Conecte sua conta primeiro na tela de Configurações.")
        
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
                headless=True,
                viewport={"width": 1280, "height": 720},
                args=["--disable-blink-features=AutomationControlled"]
            )
            BrowserManager.register_browser(user_id, browser)
            try:
                page = browser.new_page()
                page.goto(url_vaga, timeout=60000)
                
                # Verifica se a proposta já foi enviada (botão Melhorar Proposta)
                btn_melhorar = page.locator("a.btn:has-text('Melhorar proposta'), a.btn:has-text('Melhorar Proposta')").first
                if btn_melhorar.count() > 0:
                    opp_repo.update_opportunity(vaga_id, {
                        "status": "Proposta enviada", 
                        "data_envio_proposta": datetime.now().isoformat()
                    })
                    return {"status": "success", "message": "Aviso: Uma proposta já havia sido enviada anteriormente. O status foi atualizado."}

                link_enviar = page.locator("a.btn:has-text('Enviar proposta')").first
                if link_enviar.count() > 0:
                    link_enviar.click()
                    page.wait_for_load_state("domcontentloaded", timeout=15000)
                

                if "register" in page.url:
                    logger.error(f"[SENDER] Sessão expirada para o usuário {user_id}.")
                    browser.close()
                    raise ValueError("Sessão expirada. Por favor, reconecte sua conta 99Freelas.")
                 
                textarea = page.locator("#proposta")
                textarea.wait_for(state="visible", timeout=15000)
                textarea.fill(texto)
                
                valor_enviado = SenderService._to_float(valor)
                campo_valor = page.locator("#oferta")
                if campo_valor.count() > 0:
                    campo_valor.fill(SenderService._format_brl(valor_enviado))
                
                prazo_nums = re.findall(r'\d+', prazo)
                if prazo_nums:
                    prazo_dias = prazo_nums[0]
                    campo_prazo = page.locator("#duracao-estimada")
                    if campo_prazo.count() > 0:
                        campo_prazo.fill(prazo_dias)
                        
                btn_enviar = page.locator("#btnConcluirEnvioProposta")
                if btn_enviar.count() > 0:
                    btn_enviar.click()
                SenderService._confirm_submission_modals(page)
                    
                page.wait_for_load_state("networkidle", timeout=10000)
                try:
                    valor_enviado = SenderService._auto_adjust_by_avg_price(page, user_id, valor_enviado)
                except Exception as avg_err:
                    logger.warning(f"[SENDER] Falha ao ajustar valor pela média: {avg_err}")
                
                opp_repo.update_opportunity(vaga_id, {
                    "status": "Proposta enviada",
                    "valor_proposta": valor_enviado,
                    "data_envio_proposta": datetime.now().isoformat()
                })
                return {"status": "success", "message": "Proposta enviada com sucesso pelo robô!"}
                
            except Exception as e:
                if BrowserManager.is_cancelled(user_id):
                    logger.info(f"[SENDER] Envio abortado pelo logout do usuário {user_id}.")
                    return {"status": "cancelled", "message": "Envio abortado pelo logout."}
                raise ValueError(f"Envio falhou ou interceptou barreira: {str(e)}")
            finally:
                BrowserManager.unregister_browser(user_id, browser)
                try:
                    browser.close()
                except Exception:
                    pass
