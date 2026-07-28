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
repo_op = OpportunityRepository()
repo_profile = ProfileRepository()

class ExtractorRequest(BaseModel):
    user_id: str

def executar_extracao(user_id: str):
    logger.info(f"Buscando configurações e perfil do usuário {user_id}...")
    
    perfil = repo_profile.get_profile(user_id)
    habilidades = perfil.get("habilidades", []) if perfil else []
    valor_minimo = perfil.get("valor_projeto_minimo", 0) if perfil else 0
    
    config_res = repo_profile.get_user_settings(user_id)
    
    integracoes = {}
    limite_automacao = 70
    automacao_ativada = True
    if config_res:
        integracoes = config_res.get("integracoes", {})
        modelos_proposta = config_res.get("modelos_proposta", {})
        if isinstance(modelos_proposta, dict):
            limite_automacao = modelos_proposta.get("limite_automacao", 70)
            automacao_ativada = modelos_proposta.get("automacao_ativada", True)
    
    config_99 = integracoes.get("99freelas", {})
    ignorar_exclusivos = config_99.get("ignoreExclusive", True) if isinstance(config_99, dict) else True
    
    revisao_humana = True
    if config_res and config_res.get("revisao_humana_obrigatoria") is not None:
        revisao_humana = config_res.get("revisao_humana_obrigatoria")
    
    buscas = habilidades if len(habilidades) > 0 else ["desenvolvimento-web"]
    
    vagas_extraidas = []
    
    # 1. Crawler 99Freelas
    try:
        from backend.src.modules.opportunities.freelas99_crawler import Freelas99Crawler
        logger.info("Iniciando crawler do 99Freelas...")
        vagas_99 = Freelas99Crawler.executar(user_id, buscas, ignorar_exclusivos)
        vagas_extraidas.extend(vagas_99)
    except Exception as e:
        logger.error(f"Erro no crawler do 99Freelas: {e}")

    # 2. Crawler Workana
    try:
        from backend.src.modules.opportunities.workana_crawler import WorkanaCrawler
        logger.info("Iniciando crawler da Workana...")
        vagas_wk = WorkanaCrawler.executar(user_id, buscas, limit=3)
        vagas_extraidas.extend(vagas_wk)
    except Exception as e:
        logger.error(f"Erro no crawler da Workana: {e}")

    # 3. Pipeline Unificada de I.A. (Scout -> Analista -> Redator -> Sender)
    res_ops = repo_op.get_opportunities(user_id)
    urls_existentes = {op.get("url") for op in res_ops if op.get("url")}
    
    for vaga in vagas_extraidas:
        check_conf = repo_profile.get_user_settings(user_id)
        if check_conf and not check_conf.get("piloto_automatico_ativado"):
            logger.warning("Piloto Automático foi DESLIGADO pelo usuário. Abortando pipeline IMEDIATAMENTE.")
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
            scout_res = ScoutService.analisar_vaga(texto_bruto, plataforma, user_id)
            vaga_id = scout_res.get("vaga_id")
            
            if vaga_id:
                repo_op.update_opportunity(vaga_id, {"url": url_vaga})
                urls_existentes.add(url_vaga)
                
                # ANALISTA IA
                logger.debug(f"Scout terminou. Acionando Analista IA para {vaga_id}...")
                analista_res = AnalistaService.avaliar_oportunidade(vaga_id, user_id)
                score = analista_res.get("score", 0)
                
                # REDATOR IA
                if automacao_ativada and score >= limite_automacao:
                    logger.info(f"Score {score} bateu a meta (>={limite_automacao}). Acionando Redator IA em background...")
                    time.sleep(15) # Limites do Gemini
                    
                    try:
                        result_redator = RedatorService.gerar_proposta(vaga_id, user_id)
                        logger.info(f"Proposta gerada com sucesso para a vaga {vaga_id}!")
                        
                        # SENDER
                        if revisao_humana:
                            logger.info("Revisão humana ativada. Vaga mantida em Rascunho.")
                        else:
                            logger.info("Revisão humana desligada. Enviando proposta automaticamente!")
                            try:
                                threading.Thread(
                                    target=SenderService.submit_proposta, 
                                    args=(vaga_id, user_id, result_redator.get("proposta", ""), result_redator.get("valor") or valor_minimo, result_redator.get("prazo", "3 dias"))
                                ).start()
                            except Exception as sender_err:
                                logger.error(f"Erro fatal no Sender: {sender_err}", exc_info=True)
                                
                    except Exception as redator_err:
                        logger.error(f"Erro ao gerar proposta: {redator_err}", exc_info=True)
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
            
    logger.info("Missão de Extracão Unificada Concluída!")

# Rotas movidas para router.py
