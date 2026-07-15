import os
import json
import time
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client
from playwright.sync_api import sync_playwright

from scout import analisar_vaga, VagaBruta
from analista import avaliar_oportunidade, AvaliacaoRequest
from redator import gerar_proposta, RedatorRequest

router = APIRouter()

# 1. Configuração do Supabase
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Variáveis do Supabase não encontradas no ambiente")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class ExtractorRequest(BaseModel):
    user_id: str

def executar_extracao(user_id: str):
    print(f"[EXTRACTOR] Buscando configurações e perfil do usuário {user_id}...")
    
    # 1. Pega habilidades e configs
    perfil_res = supabase.table("perfis").select("habilidades").eq("id", user_id).execute()
    habilidades = perfil_res.data[0].get("habilidades", []) if perfil_res.data else []
    
    config_res = supabase.table("configuracoes_usuario").select("*").eq("perfil_id", user_id).execute()
    
    integracoes = {}
    limite_automacao = 70
    automacao_ativada = True
    if config_res.data:
        integracoes = config_res.data[0].get("integracoes", {})
        modelos_proposta = config_res.data[0].get("modelos_proposta", {})
        if isinstance(modelos_proposta, dict):
            limite_automacao = modelos_proposta.get("limite_automacao", 70)
            automacao_ativada = modelos_proposta.get("automacao_ativada", True)
    
    config_99 = integracoes.get("99freelas", {})
    # Caso a flag não exista no JSON velho, assume True por padrão
    ignorar_exclusivos = config_99.get("ignoreExclusive", True) if isinstance(config_99, dict) else True
    
    # Se não tiver habilidade, faz a busca padrão
    buscas = habilidades if len(habilidades) > 0 else ["desenvolvimento-web"]
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
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
                    
                titulo = link_tag.inner_text()
                href = link_tag.get_attribute("href")
                url_vaga = f"https://www.99freelas.com.br{href}"
                
                # Deduplicação
                res = supabase.table("oportunidades").select("id").eq("url", url_vaga).execute()
                if len(res.data) > 0:
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
                
                print(f"[EXTRACTOR] Nova vaga identificada! Injetando no Pipeline: {titulo}")
                
                # 3. Dispara o Scout IA internamente
                scout_req = VagaBruta(texto=texto_bruto, plataforma="99Freelas", perfil_id=user_id)
                
                try:
                    scout_res = analisar_vaga(scout_req)
                    vaga_id = scout_res.get("vaga_id")
                    
                    if vaga_id:
                        supabase.table("oportunidades").update({"url": url_vaga}).eq("id", vaga_id).execute()
                        
                        # 4. Dispara o Analista IA internamente
                        print(f"[EXTRACTOR] Scout terminou. Acionando Analista IA para {vaga_id}...")
                        analista_req = AvaliacaoRequest(vaga_id=vaga_id, user_id=user_id)
                        analista_res = avaliar_oportunidade(analista_req)
                        score = analista_res.get("score", 0)
                        
                        # 5. Dispara o Redator IA automaticamente se o score bater a meta E se estiver ativado
                        if automacao_ativada and score >= limite_automacao:
                            print(f"[EXTRACTOR] Score {score} bateu a meta (>={limite_automacao}). Acionando Redator IA em background...")
                            # Pausa de 15s antes de chamar outra IA pra não levar block do Gemini
                            time.sleep(15)
                            try:
                                gerar_proposta(RedatorRequest(vaga_id=vaga_id, user_id=user_id))
                                print(f"[EXTRACTOR] Proposta gerada com sucesso para a vaga {vaga_id}!")
                            except Exception as redator_err:
                                print(f"[EXTRACTOR] Erro ao gerar proposta: {redator_err}")
                        else:
                            if not automacao_ativada:
                                print(f"[EXTRACTOR] Automação do Redator IA está desligada nas configurações.")
                            else:
                                print(f"[EXTRACTOR] Score {score} abaixo da meta ({limite_automacao}). Ignorando Redator IA.")
                        
                        print(f"[EXTRACTOR] Ciclo finalizado para a vaga: {titulo}\n")
                        # Pausa de 15 segundos entre vagas para garantir que o limite gratuito do Gemini (15 RPM) não seja estourado
                        time.sleep(15)
                        
                except Exception as e:
                    print(f"[EXTRACTOR] Erro na pipeline da vaga {titulo}: {e}")
                    
        browser.close()
        print("[EXTRACTOR] Missão de Extracão Concluída!")


@router.post("/api/extractor/run")
def trigger_extraction(req: ExtractorRequest, background_tasks: BackgroundTasks):
    # O FASTAPI retorna imediatamente para o frontend e joga a função pra rodar em background!
    background_tasks.add_task(executar_extracao, req.user_id)
    return {"mensagem": "Extrator disparado! Ele varrerá a web em segundo plano."}
