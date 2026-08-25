import os
import json
import time
import logging
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from playwright.sync_api import sync_playwright

from backend.src.modules.opportunities.schemas import VagaBruta
from backend.src.modules.opportunities.service import ScoutService, AnalistaService, RedatorService
from backend.src.modules.communications.service import SenderService
from backend.src.modules.opportunities.repository import OpportunityRepository, ProfileRepository
import threading
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

# Extractor Service
from backend.src.core.browser_manager import BrowserManager

repo_op = OpportunityRepository()
repo_profile = ProfileRepository()

class ExtractorRequest(BaseModel):
    user_id: str

def executar_extracao(user_id: str):
    if BrowserManager.is_cancelled(user_id):
        logger.info(f"Execução de extração cancelada para o usuário {user_id}.")
        return

    logger.info(f"Buscando configurações e perfil do usuário {user_id}...")
    
    perfil = repo_profile.get_profile(user_id)
    habilidades = perfil.get("habilidades", []) if perfil else []
    valor_minimo = perfil.get("valor_projeto_minimo", 0) if perfil else 0
    
    config_res = repo_profile.get_user_settings(user_id)
    
    integracoes = {}
    limite_automacao = 70
    limite_descarte = 30
    automacao_ativada = True
    if config_res:
        integracoes = config_res.get("integracoes", {})
        modelos_proposta = config_res.get("modelos_proposta", {})
        if isinstance(modelos_proposta, dict):
            limite_automacao = modelos_proposta.get("limite_automacao", 70)
            limite_descarte = modelos_proposta.get("limite_descarte", 30)
            automacao_ativada = modelos_proposta.get("automacao_ativada", True)
    
    config_99 = integracoes.get("99freelas", {})
    ignorar_exclusivos = config_99.get("ignoreExclusive", True) if isinstance(config_99, dict) else True
    
    revisao_humana = True
    if config_res and config_res.get("revisao_humana_obrigatoria") is not None:
        revisao_humana = config_res.get("revisao_humana_obrigatoria")
    
    area_atuacao = perfil.get("area_atuacao", "Desenvolvimento e TI") if perfil else "Desenvolvimento e TI"
    
    vagas_extraidas = []
    
    from backend.src.core.activity_logger import AgentActivityLogger
    AgentActivityLogger.log(user_id, "Scout", "Procurando por vagas na área: " + area_atuacao, "processando", 1)
    
    res_ops = repo_op.get_opportunities(user_id)
    urls_existentes = {op.get("url") for op in res_ops if op.get("url")}
    
    # 1. Crawler 99Freelas
    if not BrowserManager.is_cancelled(user_id):
        try:
            from backend.src.modules.opportunities.freelas99_crawler import Freelas99Crawler
            AgentActivityLogger.log(user_id, "Scout", "Procurando por vagas...", "processando", 1, {"plataforma": "99Freelas"})
            logger.info("Iniciando crawler do 99Freelas...")
            vagas_99 = Freelas99Crawler.executar(user_id, area_atuacao, ignorar_exclusivos, urls_existentes)
            vagas_extraidas.extend(vagas_99)
        except Exception as e:
            if BrowserManager.is_cancelled(user_id):
                logger.info(f"Crawler 99Freelas interrompido para {user_id}.")
                return
            logger.error(f"Erro no crawler do 99Freelas: {e}")
            AgentActivityLogger.log(user_id, "Scout", f"Erro no crawler do 99Freelas: {str(e)[:100]}", "erro", 1, {"plataforma": "99Freelas"})

    if BrowserManager.is_cancelled(user_id):
        logger.info(f"Pipeline abortado após Crawler 99Freelas para {user_id}.")
        return

    # 2. Crawler Workana
    if not BrowserManager.is_cancelled(user_id):
        try:
            from backend.src.modules.opportunities.workana_crawler import WorkanaCrawler
            AgentActivityLogger.log(user_id, "Scout", "Procurando por vagas...", "processando", 1, {"plataforma": "Workana"})
            logger.info("Iniciando crawler da Workana...")
            vagas_wk = WorkanaCrawler.executar(user_id, area_atuacao)
            vagas_extraidas.extend(vagas_wk)
        except Exception as e:
            if BrowserManager.is_cancelled(user_id):
                logger.info(f"Crawler Workana interrompido para {user_id}.")
                return
            logger.error(f"Erro no crawler da Workana: {e}")
            AgentActivityLogger.log(user_id, "Scout", f"Erro no crawler da Workana: {str(e)[:100]}", "erro", 1, {"plataforma": "Workana"})

    if BrowserManager.is_cancelled(user_id):
        logger.info(f"Pipeline abortado após Crawler Workana para {user_id}.")
        return

    # 3. Pipeline Unificada de I.A. (Scout -> Analista -> Redator -> Sender)
    processar_vagas_pipeline(user_id, vagas_extraidas, urls_existentes, valor_minimo, automacao_ativada, limite_automacao, revisao_humana, limite_descarte)

def processar_vagas_pipeline(user_id, vagas_extraidas, urls_existentes, valor_minimo, automacao_ativada, limite_automacao, revisao_humana, limite_descarte):
    from backend.src.core.activity_logger import AgentActivityLogger
    novas_vagas = [v for v in vagas_extraidas if v.get("url") not in urls_existentes]
    total_novas = len(novas_vagas)
    
    if total_novas == 0:
        AgentActivityLogger.log(user_id, "Motor", "Varredura concluída. Nenhuma vaga nova no momento.", "concluido", 4, {"total_vagas": 0})
        logger.info("Nenhuma vaga nova para processar.")
        return

    AgentActivityLogger.log(user_id, "Scout", f"Scout identificou {total_novas} nova(s) oportunidade(s)!", "sucesso", 1, {"total_vagas": total_novas})

    vagas_processadas_count = 0

    for vaga in vagas_extraidas:
        if BrowserManager.is_cancelled(user_id):
            logger.info(f"Cancelamento detectado no loop de vagas para {user_id}.")
            return

        check_conf = repo_profile.get_user_settings(user_id)
        if check_conf and not check_conf.get("piloto_automatico_ativado"):
            logger.warning("Piloto Automático foi DESLIGADO pelo usuário. Abortando pipeline IMEDIATAMENTE.")
            AgentActivityLogger.log(user_id, "Motor", "Piloto Automático desativado pelo usuário.", "alerta", 4)
            return

        url_vaga = vaga["url"]
        titulo = vaga["titulo"]
        texto_bruto = vaga["texto_bruto"]
        plataforma = vaga["plataforma"]
        
        if url_vaga in urls_existentes:
            logger.info(f"[{plataforma}] Vaga repetida (pulando): {titulo}")
            continue
            
        logger.info(f"[{plataforma}] Nova vaga encontrada: {titulo}")
        
        try:
            # SCOUT IA
            cliente_foto_url = vaga.get("cliente_foto_url")
            AgentActivityLogger.log(user_id, "Scout", f"Extraindo dados: [{titulo}]", "processando", 1, {"titulo": titulo, "plataforma": plataforma})
            scout_res = ScoutService.analisar_vaga(texto_bruto, plataforma, user_id, foto_url=cliente_foto_url)
            vaga_id = scout_res.get("vaga_id")
            
            if vaga_id:
                repo_op.update_opportunity(vaga_id, {"url": url_vaga})
                urls_existentes.add(url_vaga)
                vagas_processadas_count += 1
                AgentActivityLogger.log(user_id, "Scout", f"Dados extraídos com sucesso: [{titulo}]", "sucesso", 1, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma})
                
                if BrowserManager.is_cancelled(user_id):
                    return

                # ANALISTA IA
                logger.debug(f"Scout terminou. Acionando Analista IA para {vaga_id}...")
                AgentActivityLogger.log(user_id, "Analista", f"Avaliando compatibilidade: [{titulo}]", "processando", 2, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma})
                analista_res = AnalistaService.avaliar_oportunidade(vaga_id, user_id)
                score = analista_res.get("score", 0)
                
                AgentActivityLogger.log(user_id, "Analista", f"Score de {score}% calculado para [{titulo}]", "sucesso" if score >= limite_automacao else "alerta", 2, {"vaga_id": vaga_id, "score": score, "titulo": titulo, "plataforma": plataforma})
                
                # VERIFICAÇÃO DE DESCARTE AUTOMÁTICO
                if score < limite_descarte:
                    logger.info(f"Vaga {vaga_id} ({titulo}) recebeu score {score}, que é menor que a nota de corte ({limite_descarte}). Descartando...")
                    repo_op.update_opportunity(vaga_id, {"status": "Ignorada"})
                    AgentActivityLogger.log(user_id, "Analista", f"Vaga ignorada automaticamente (Score {score} < {limite_descarte})", "sucesso", 2, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma})
                
                if BrowserManager.is_cancelled(user_id):
                    return

                # REDATOR IA
                if automacao_ativada and score >= limite_automacao:
                    logger.info(f"Score {score} bateu a meta (>={limite_automacao}). Acionando Redator IA em background...")
                    AgentActivityLogger.log(user_id, "Redator", f"Criando proposta sob medida para [{titulo}]...", "processando", 3, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma, score: "score"})
                    time.sleep(15) # Limites do Gemini
                    
                    if BrowserManager.is_cancelled(user_id):
                        return

                    try:
                        result_redator = RedatorService.gerar_proposta(vaga_id, user_id)
                        logger.info(f"Proposta gerada com sucesso para a vaga {vaga_id}!")
                        AgentActivityLogger.log(user_id, "Redator", f"Proposta gerada com sucesso para [{titulo}]", "sucesso", 3, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma})
                        
                        if BrowserManager.is_cancelled(user_id):
                            return

                        # SENDER
                        if revisao_humana:
                            logger.info("Revisão humana ativada. Vaga mantida em Rascunho.")
                            repo_op.update_opportunity(vaga_id, {"status": "Rascunho"})
                            AgentActivityLogger.log(user_id, "Sender", f"Salvo em Rascunho para sua revisão: [{titulo}]", "sucesso", 4, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma})
                        else:
                            logger.info("Revisão humana desligada. Enviando proposta automaticamente!")
                            AgentActivityLogger.log(user_id, "Sender", f"Enviando proposta automaticamente para [{titulo}]...", "processando", 4, {"vaga_id": vaga_id, "titulo": titulo, "plataforma": plataforma})
                            try:
                                threading.Thread(
                                    target=SenderService.submit_proposta, 
                                    args=(vaga_id, user_id, result_redator.get("proposta", ""), result_redator.get("valor") or valor_minimo, result_redator.get("prazo", "3 dias"))
                                ).start()
                            except Exception as sender_err:
                                logger.error(f"Erro fatal no Sender: {sender_err}", exc_info=True)
                                AgentActivityLogger.log(user_id, "Sender", f"Erro no envio da proposta: {str(sender_err)[:100]}", "erro", 4, {"vaga_id": vaga_id, "plataforma": plataforma})
                                
                    except Exception as redator_err:
                        logger.error(f"Erro ao gerar proposta: {redator_err}", exc_info=True)
                        AgentActivityLogger.log(user_id, "Redator", f"Erro na geração de proposta: {str(redator_err)[:100]}", "erro", 3, {"vaga_id": vaga_id, "plataforma": plataforma})
                else:
                    if not automacao_ativada:
                        logger.info("Automação do Redator IA está desligada nas configurações.")
                    else:
                        logger.info(f"Score {score} abaixo da meta ({limite_automacao}). Ignorando Redator IA.")
                        
                logger.debug(f"Ciclo finalizado para a vaga: {titulo}\n")
                
                # Limites do Gemini: Pausa antes da próxima vaga
                time.sleep(15)
                
        except Exception as e:
            logger.error(f"Erro na pipeline da vaga {titulo}: {e}", exc_info=True)
            AgentActivityLogger.log(user_id, "Motor", f"Erro no processamento de '{titulo}': {str(e)[:100]}", "erro", 4)
            
    logger.info("Extração Concluída!")
    AgentActivityLogger.log(user_id, "Motor", f"Ciclo de extração concluído! ({vagas_processadas_count} vagas processadas)", "concluido", 4, {"total_vagas": vagas_processadas_count})

def executar_extracao_url(user_id: str, url: str):
    logger.info(f"Iniciando extração direta da URL: {url} para usuário {user_id}")
    
    texto_bruto = ""
    foto_cliente = None
    plataforma = "Desconhecida"
    if "99freelas.com.br" in url:
        plataforma = "99Freelas"
    elif "workana.com" in url:
        plataforma = "Workana"

    from playwright.sync_api import sync_playwright
    from backend.src.core.activity_logger import AgentActivityLogger

    AgentActivityLogger.log(user_id, "Scout", f"Visitando URL sob demanda...", "processando", 1)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
        try:
            page = browser.new_page()
            page.goto(url, timeout=30000)
            page.wait_for_timeout(2000)
            
            if plataforma == "99Freelas":
                expandir_btn = page.locator("text='Expandir'")
                if expandir_btn.count() > 0:
                    try:
                        expandir_btn.first.click()
                        page.wait_for_timeout(800)
                    except:
                        pass
                
                avatar_elem = page.locator(".info-usuario.cliente .info-usuario-imagem img")
                if avatar_elem.count() > 0:
                    src = avatar_elem.first.get_attribute("src")
                    if src and not src.startswith("data:"):
                        if src.startswith("//"): foto_cliente = f"https:{src}"
                        elif src.startswith("/"): foto_cliente = f"https://www.99freelas.com.br{src}"
                        else: foto_cliente = src
                            
            texto_bruto = page.inner_text("body")
        except Exception as e:
            logger.error(f"Erro ao extrair URL {url}: {e}")
            AgentActivityLogger.log(user_id, "Scout", f"Erro ao acessar URL", "erro", 1)
            raise ValueError(f"Não foi possível acessar a URL: {e}")
        finally:
            browser.close()

    if not texto_bruto:
        raise ValueError("A página não retornou conteúdo legível.")
        
    vaga = {
        "url": url,
        "titulo": f"URL Customizada ({plataforma})",
        "texto_bruto": texto_bruto,
        "plataforma": plataforma,
        "cliente_foto_url": foto_cliente
    }
    
    perfil = repo_profile.get_profile(user_id)
    valor_minimo = perfil.get("valor_projeto_minimo", 0) if perfil else 0
    config_res = repo_profile.get_user_settings(user_id)
    limite_automacao = 70
    limite_descarte = 30
    automacao_ativada = True
    revisao_humana = True
    if config_res:
        modelos_proposta = config_res.get("modelos_proposta", {})
        if isinstance(modelos_proposta, dict):
            limite_automacao = modelos_proposta.get("limite_automacao", 70)
            limite_descarte = modelos_proposta.get("limite_descarte", 30)
            automacao_ativada = modelos_proposta.get("automacao_ativada", True)
        revisao_humana = config_res.get("revisao_humana_obrigatoria", True)

    res_ops = repo_op.get_opportunities(user_id)
    urls_existentes = {op.get("url") for op in res_ops if op.get("url")}
    
    processar_vagas_pipeline(user_id, [vaga], urls_existentes, valor_minimo, automacao_ativada, limite_automacao, revisao_humana)
