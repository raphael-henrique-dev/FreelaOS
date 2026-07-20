import os
import json
import time
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
# Extractor Service
repo_op = OpportunityRepository()
repo_profile = ProfileRepository()

class ExtractorRequest(BaseModel):
    user_id: str

def executar_extracao(user_id: str):
    print(f"[EXTRACTOR] Buscando configurações e perfil do usuário {user_id}...")
    
    # 1. Pega habilidades, configs e valor minimo
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
    
    # Se não tiver habilidade, faz a busca padrão
    buscas = habilidades if len(habilidades) > 0 else ["desenvolvimento-web"]
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for termo in buscas:
            print(f"[EXTRACTOR] Varrendo 99Freelas buscando por: {termo}")
            # Monta a URL de busca dinâmica
            if termo == "desenvolvimento-web":
                url_alvo = "https://www.99freelas.com.br/projects?categoria=desenvolvimento-web"
            else:
                import urllib.parse
                url_alvo = f"https://www.99freelas.com.br/projects?q={urllib.parse.quote(termo)}"
                
            page.goto(url_alvo)
            
            try:
                page.wait_for_selector(".result-list", timeout=10000)
            except Exception:
                print(f"[EXTRACTOR] Nenhuma vaga encontrada para {termo}.")
                continue
                
            projetos = page.locator(".result-list .result-item")
            total = projetos.count()
            print(f"[EXTRACTOR] Encontradas {total} vagas para {termo}.")
            
            # Varre até as 10 primeiras de cada termo
            for i in range(min(total, 10)):
                projeto = projetos.nth(i)
                link_tag = projeto.locator("h1.title a")
                
                if link_tag.count() == 0:
                    continue
                    
                # Verifica se o usuário desligou o piloto automático no meio da extração
                check_conf = repo_profile.get_user_settings(user_id)
                if check_conf and not check_conf.get("piloto_automatico_ativado"):
                    print("[EXTRACTOR] Piloto Automático foi DESLIGADO pelo usuário. Abortando extração IMEDIATAMENTE.")
                    return

                titulo = link_tag.inner_text()
                href = link_tag.get_attribute("href")
                url_vaga = f"https://www.99freelas.com.br{href}"
                
                # Deduplicação
                res_ops = repo_op.get_opportunities(user_id)
                # Verifica se a url_vaga já existe em alguma oportunidade do usuário
                if any(op.get("url") == url_vaga for op in res_ops):
                    print(f"[EXTRACTOR] Vaga repetida (pulando): {titulo}")
                    continue
                
                # Tenta clicar em "Expandir" para ler o texto todo da vaga
                expandir_btn = projeto.locator("text='Expandir'")
                if expandir_btn.count() > 0:
                    try:
                        expandir_btn.first.click()
                        page.wait_for_timeout(800) # Espera a animação de expansão do site concluir
                    except Exception:
                        pass
                
                # 2. Extração Profunda (Raw Text)
                texto_bruto = projeto.inner_text()
                
                # Lê todas as flags (Urgente, Destaque, Exclusivo)
                flags_imgs = projeto.locator(".flags img")
                lista_flags = []
                for f in range(flags_imgs.count()):
                    alt_text = flags_imgs.nth(f).get_attribute("alt")
                    if alt_text:
                        lista_flags.append(alt_text)
                
                if lista_flags:
                    texto_bruto += f"\n[FLAGS ENCONTRADAS]: {', '.join(lista_flags)}"

                # Verifica se é projeto exclusivo (ignoramos Urgente e Destaque aqui)
                is_exclusivo = any("exclusivo" in f.lower() for f in lista_flags)
                
                if ignorar_exclusivos and is_exclusivo:
                    print(f"[EXTRACTOR] Vaga Exclusiva ignorada (assinante Premium): {titulo}")
                    continue
                
                print(f"[EXTRACTOR] Nova vaga identificada! Injetando na pipeline: {titulo}")
                
                # 3. Dispara o Scout IA internamente
                scout_req = VagaBruta(texto=texto_bruto, plataforma="99Freelas", perfil_id=user_id)
                
                try:
                    scout_res = ScoutService.analisar_vaga(texto_bruto, "99Freelas", user_id)
                    vaga_id = scout_res.get("vaga_id")
                    # print(f'saida do scout {scout_res}')
                
                    if vaga_id:
                        repo_op.update_opportunity(vaga_id, {"url": url_vaga})
                        
                        # 4. Dispara o Analista IA internamente
                        print(f"[EXTRACTOR] Scout terminou. Acionando Analista IA para {vaga_id}...")
                        analista_res = AnalistaService.avaliar_oportunidade(vaga_id, user_id)
                        score = analista_res.get("score", 0)
                        
                        # 5. Dispara o Redator IA automaticamente se o score bater a meta E se estiver ativado
                        if automacao_ativada and score >= limite_automacao:
                            print(f"[EXTRACTOR] Score {score} bateu a meta (>={limite_automacao}). Acionando Redator IA em background...")
                            # Pausa de 15s antes de chamar outra IA pra não levar block do Gemini
                            time.sleep(15)
                            try:
                                result_redator = RedatorService.gerar_proposta(vaga_id, user_id)
                                print(f"[EXTRACTOR] Proposta gerada com sucesso para a vaga {vaga_id}!")
                                
                                # NOVO: INTEGRAÇÃO COM SENDER (Autopilot)
                                if revisao_humana:
                                    print(f"[EXTRACTOR] Revisão humana ativada. Vaga mantida em Rascunho.")
                                else:
                                    print(f"[EXTRACTOR] Revisão humana desligada. Enviando proposta automaticamente!")
                                    try:
                                        # Executa o Sender numa Thread isolada para não conflitar com o Playwright do Extrator
                                        threading.Thread(target=SenderService.submit_proposta, args=(vaga_id, user_id, result_redator.get("proposta", ""), result_redator.get("valor") or valor_minimo, result_redator.get("prazo", "3 dias"))).start()
                                    except Exception as sender_err:
                                        print(f"[EXTRACTOR] Erro fatal no Sender: {sender_err}")
                                    
                            except Exception as redator_err:
                                print(f"[EXTRACTOR] Erro ao gerar proposta: {redator_err}")
                        else:
                            if not automacao_ativada:
                                print(f"[EXTRACTOR] Automação do Redator IA está desligada nas configurações.")
                            else:
                                print(f"[EXTRACTOR] Score {score} abaixo da meta ({limite_automacao}). Ignorando Redator IA.")
                        print(f"[EXTRACTOR] Ciclo finalizado para a vaga: {titulo}\n")
                        
                        # Verifica novamente antes de dormir se o motor foi desligado
                        check_conf_after = repo_profile.get_user_settings(user_id)
                        if check_conf_after and not check_conf_after.get("piloto_automatico_ativado"):
                            print("[EXTRACTOR] Piloto Automático DESLIGADO. Abortando pausas e saindo.")
                            return
                            
                        # Pausa de 15 segundos entre vagas para garantir que o limite gratuito do Gemini (15 RPM) não seja estourado
                        time.sleep(15)
                        
                except Exception as e:
                    print(f"[EXTRACTOR] Erro na pipeline da vaga {titulo}: {e}")
                    
        browser.close()
        print("[EXTRACTOR] Missão de Extracão Concluída!")

# Rotas movidas para router.py
