import logging
import math
import os
import re
from datetime import datetime
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from backend.src.core.activity_logger import AgentActivityLogger
from backend.src.core.browser_manager import BrowserManager
from backend.src.modules.auth.service import AuthService
from backend.src.modules.opportunities.repository import OpportunityRepository, ProfileRepository

logger = logging.getLogger(__name__)

opp_repo = OpportunityRepository()
profile_repo = ProfileRepository()


class SenderService:
    @staticmethod
    def _is_valid_99freelas_url(url: str) -> bool:
        if not url or not isinstance(url, str):
            return False
        try:
            parsed = urlparse(url)
            host = (parsed.hostname or "").lower()
            return parsed.scheme in ("http", "https") and (
                host == "99freelas.com.br" or host.endswith(".99freelas.com.br")
            )
        except Exception:
            return False

    @staticmethod
    def _parse_preco_medio_texto(texto: str) -> float | None:
        if not texto or not isinstance(texto, str):
            return None
        texto_normalizado = texto.replace("\xa0", " ").replace("&nbsp;", " ")
        match = re.search(
            r"Valor\s+m[eé]dio\s+das\s+propostas\s*:\s*R\$\s*([\d\.]+,\d{2}|\d+(?:,\d{1,2})?)",
            texto_normalizado,
            re.IGNORECASE,
        )
        if not match:
            return None
        bruto = match.group(1).strip().replace(".", "").replace(",", ".")
        try:
            valor = float(bruto)
            if not math.isfinite(valor) or valor <= 0:
                return None
            return valor
        except ValueError:
            return None

    @staticmethod
    def _calcular_novo_orcamento(
        valor_enviado: float, preco_medio: float, percentual_desconto: float
    ) -> int | None:
        if preco_medio is None or not math.isfinite(preco_medio) or preco_medio <= 0:
            return None
        valor_atual = float(valor_enviado)
        if not math.isfinite(valor_atual) or valor_atual <= 0:
            return None

        # Caso o usuario seja a primeira/unica proposta na vaga, a media sera igual ao proprio valor enviado
        if abs(preco_medio - valor_atual) < 0.01:
            return None

        pct = float(percentual_desconto)
        if not math.isfinite(pct):
            return None
        pct = max(0.0, min(100.0, pct))

        if valor_atual > preco_medio:
            preco_alvo = preco_medio * (1.0 - (pct / 100.0))
        else:
            # Se ja for menor que a media, calcula quantos porcento e menor e ajusta ate a margem configurada
            desconto_atual_pct = ((preco_medio - valor_atual) / preco_medio) * 100.0
            diferenca_pct = pct - desconto_atual_pct
            preco_alvo = valor_atual - (preco_medio * (diferenca_pct / 100.0))

        novo_valor = max(50, int(round(preco_alvo)))
        if novo_valor == int(round(valor_atual)):
            return None
        return novo_valor

    @staticmethod
    def _formatar_milhar_ptbr(valor: int) -> str:
        return f"{int(valor):,}".replace(",", ".")

    @staticmethod
    def _ajustar_preco_no_texto(texto: str, valor_antigo: int, valor_novo: int) -> str:
        if not texto or not isinstance(texto, str):
            return texto
        antigo_int = int(round(float(valor_antigo)))
        novo_int = int(round(float(valor_novo)))
        if antigo_int <= 0 or novo_int <= 0 or antigo_int == novo_int:
            return texto

        antigo_milhar = re.escape(SenderService._formatar_milhar_ptbr(antigo_int))
        antigo_simples = re.escape(str(antigo_int))
        padrao_num = (
            f"(?:{antigo_milhar}|{antigo_simples})"
            if antigo_milhar != antigo_simples
            else antigo_simples
        )

        # 1. Padrao com R$ (ex: R$100, R$ 100, R$ 100,00, R$ 1.500,00)
        padrao_rs = re.compile(
            rf"(R\$\s*){padrao_num}(,00)?(?!\d)",
            flags=re.IGNORECASE,
        )

        def _repl_rs(match: re.Match) -> str:
            prefixo = match.group(1)
            centavos = match.group(2) or ""
            usa_ponto = "." in match.group(0)
            num_str = (
                SenderService._formatar_milhar_ptbr(novo_int)
                if usa_ponto
                else str(novo_int)
            )
            return f"{prefixo}{num_str}{centavos}"

        novo_texto = padrao_rs.sub(_repl_rs, texto)

        # 2. Padrao sem R$ seguido de 'reais' (ex: 100 reais, 1.500 reais)
        padrao_reais = re.compile(
            rf"(?<!\d){padrao_num}(,00)?(\s+reais\b)",
            flags=re.IGNORECASE,
        )

        def _repl_reais(match: re.Match) -> str:
            centavos = match.group(1) or ""
            sufixo = match.group(2)
            usa_ponto = "." in match.group(0)
            num_str = (
                SenderService._formatar_milhar_ptbr(novo_int)
                if usa_ponto
                else str(novo_int)
            )
            return f"{num_str}{centavos}{sufixo}"

        return padrao_reais.sub(_repl_reais, novo_texto)

    @staticmethod
    def _obter_config_orcamento_abaixo_media(user_id: str) -> tuple[bool, float]:
        try:
            conf = profile_repo.get_user_settings(user_id)
            if not conf or not isinstance(conf, dict):
                return False, 0.0
            modelos = conf.get("modelos_proposta")
            if not isinstance(modelos, dict):
                return False, 0.0
            ativado = bool(modelos.get("orcamento_abaixo_media_ativado", False))
            raw_pct = modelos.get("orcamento_abaixo_media_percentual", 10.0)
            pct = float(raw_pct) if raw_pct is not None else 10.0
            if not math.isfinite(pct):
                pct = 10.0
            pct = max(0.0, min(100.0, pct))
            return ativado, pct
        except Exception as e:
            logger.warning(f"[SENDER] Falha ao ler configuracao de orcamento abaixo da media: {e}")
            return False, 0.0

    @staticmethod
    def _extrair_preco_medio_dom(page) -> float | None:
        try:
            info_boxes = page.locator("div.generic.information")
            count = info_boxes.count()
            for idx in range(count):
                box_text = info_boxes.nth(idx).inner_text()
                preco = SenderService._parse_preco_medio_texto(box_text)
                if preco is not None:
                    return preco
        except Exception as e:
            logger.debug(f"[SENDER] Nao foi possivel ler div.generic.information diretamente: {e}")

        try:
            body_text = page.inner_text("body")
            return SenderService._parse_preco_medio_texto(body_text)
        except Exception as e:
            logger.debug(f"[SENDER] Fallback de leitura de preco medio no body falhou: {e}")
            return None

    @staticmethod
    def _confirmar_modais_envio(page) -> None:
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
    def submit_proposta(vaga_id: str, user_id: str, texto: str, valor: int, prazo: str) -> dict:
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

        if vaga.get("perfil_id") and vaga.get("perfil_id") != user_id:
            logger.warning(f"[SENDER] Tentativa de acesso nao autorizado a vaga {vaga_id} pelo usuario {user_id}.")
            raise ValueError("Acesso negado a esta oportunidade.")
            
        url_vaga = vaga.get("url")
        plataforma = vaga.get("plataforma")
        titulo = vaga.get("titulo", "Oportunidade")
        
        if not url_vaga or plataforma != "99Freelas" or not SenderService._is_valid_99freelas_url(url_vaga):
            raise ValueError("URL inválida ou plataforma não suportada para envio automático.")

        valor_final = int(round(float(valor))) if valor else 50
        texto_final = texto
        preco_medio_extraido = None

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
                
                campo_valor = page.locator("#oferta")
                if campo_valor.count() > 0:
                    campo_valor.fill(f"{valor_final},00")
                
                prazo_nums = re.findall(r'\d+', prazo)
                if prazo_nums:
                    prazo_dias = prazo_nums[0]
                    campo_prazo = page.locator("#duracao-estimada")
                    if campo_prazo.count() > 0:
                        campo_prazo.fill(prazo_dias)
                        
                btn_enviar = page.locator("#btnConcluirEnvioProposta")
                if btn_enviar.count() > 0:
                    btn_enviar.click()
                
                SenderService._confirmar_modais_envio(page)
                page.wait_for_load_state("networkidle", timeout=10000)

                # Fluxo pos-envio: verificacao automatica de preco medio e ajuste de orcamento
                ajuste_ativo, percentual_abaixo = SenderService._obter_config_orcamento_abaixo_media(user_id)
                mensagem_retorno = "Proposta enviada com sucesso pelo robô!"

                if ajuste_ativo:
                    try:
                        AgentActivityLogger.log(
                            user_id,
                            "Sender",
                            f"Verificando preco medio da concorrencia para [{titulo}]...",
                            "processando",
                            4,
                            {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma},
                        )

                        btn_melhorar_pos = page.locator(
                            "a.btn:has-text('Melhorar proposta'), a.btn:has-text('Melhorar Proposta')"
                        ).first
                        if btn_melhorar_pos.count() == 0:
                            page.goto(url_vaga, timeout=60000)
                            page.wait_for_load_state("domcontentloaded", timeout=15000)
                            btn_melhorar_pos = page.locator(
                                "a.btn:has-text('Melhorar proposta'), a.btn:has-text('Melhorar Proposta')"
                            ).first

                        if btn_melhorar_pos.count() > 0:
                            btn_melhorar_pos.click()
                            page.wait_for_load_state("domcontentloaded", timeout=15000)

                            try:
                                page.locator("div.generic.information").first.wait_for(
                                    state="visible", timeout=8000
                                )
                            except Exception:
                                pass

                            preco_medio_extraido = SenderService._extrair_preco_medio_dom(page)
                            logger.info(
                                f"[SENDER] Preco medio extraido para vaga {vaga_id}: {preco_medio_extraido}"
                            )

                            novo_valor = SenderService._calcular_novo_orcamento(
                                valor_final, preco_medio_extraido, percentual_abaixo
                            )

                            if novo_valor is not None:
                                texto_ajustado = SenderService._ajustar_preco_no_texto(
                                    texto_final, valor_final, novo_valor
                                )
                                if texto_ajustado != texto_final:
                                    textarea_edit = page.locator("#proposta")
                                    textarea_edit.wait_for(state="visible", timeout=10000)
                                    textarea_edit.fill(texto_ajustado)
                                    texto_final = texto_ajustado

                                campo_valor_edit = page.locator("#oferta")
                                campo_valor_edit.wait_for(state="visible", timeout=10000)
                                campo_valor_edit.fill(f"{novo_valor},00")

                                btn_salvar_edit = page.locator("#btnConcluirEnvioProposta")
                                if btn_salvar_edit.count() > 0:
                                    btn_salvar_edit.click()

                                SenderService._confirmar_modais_envio(page)
                                page.wait_for_load_state("networkidle", timeout=10000)

                                valor_anterior = valor_final
                                valor_final = novo_valor
                                mensagem_retorno = (
                                    f"Proposta enviada e orcamento ajustado para R$ {valor_final},00 "
                                    f"({percentual_abaixo:g}% abaixo da media de R$ {preco_medio_extraido:.2f})!"
                                )
                                AgentActivityLogger.log(
                                    user_id,
                                    "Sender",
                                    f"Orcamento ajustado para R$ {valor_final},00 ({percentual_abaixo:g}% abaixo da media R$ {preco_medio_extraido:.2f}) em [{titulo}]",
                                    "sucesso",
                                    4,
                                    {
                                        "vaga_id": vaga_id,
                                        "titulo": titulo,
                                        "plataforma": plataforma,
                                        "valor_anterior": valor_anterior,
                                        "valor_proposta": valor_final,
                                        "preco_medio": preco_medio_extraido,
                                    },
                                )
                            else:
                                logger.info(
                                    f"[SENDER] Orcamento mantido em R$ {valor_final},00 para vaga {vaga_id} (media={preco_medio_extraido})."
                                )
                                AgentActivityLogger.log(
                                    user_id,
                                    "Sender",
                                    f"Orcamento mantido em R$ {valor_final},00 para [{titulo}]",
                                    "sucesso",
                                    4,
                                    {
                                        "vaga_id": vaga_id,
                                        "titulo": titulo,
                                        "plataforma": plataforma,
                                        "valor_proposta": valor_final,
                                        "preco_medio": preco_medio_extraido,
                                    },
                                )
                        else:
                            logger.warning(
                                f"[SENDER] Botao 'Melhorar proposta' nao encontrado apos envio da vaga {vaga_id}."
                            )
                    except Exception as adjust_err:
                        logger.warning(
                            f"[SENDER] Falha ao ajustar orcamento pela media na vaga {vaga_id}: {adjust_err}"
                        )
                        AgentActivityLogger.log(
                            user_id,
                            "Sender",
                            f"Proposta enviada, mas nao foi possivel ajustar pela media em [{titulo}]",
                            "alerta",
                            4,
                            {"vaga_id": vaga_id, "plataforma": plataforma},
                        )

                opp_repo.update_opportunity(vaga_id, {
                    "status": "Proposta enviada",
                    "valor_proposta": valor_final,
                    "proposta_ia": texto_final,
                    "data_envio_proposta": datetime.now().isoformat()
                })
                return {
                    "status": "success",
                    "message": mensagem_retorno,
                    "valor_proposta": valor_final,
                    "proposta_ia": texto_final,
                    "preco_medio": preco_medio_extraido,
                }
                
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
