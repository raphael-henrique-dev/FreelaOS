import os
import shutil
import httpx
import json
from playwright.sync_api import sync_playwright
from backend.src.core.database import db
from backend.src.core.llm_client import generate_text

class AuthService:
    @staticmethod
    def conectar_99freelas(user_id: str) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        os.makedirs(session_dir, exist_ok=True)
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=False,
                    viewport={"width": 1280, "height": 720},
                    args=["--disable-blink-features=AutomationControlled"]
                )
                page = browser.new_page()
                page.goto("https://www.99freelas.com.br/login")
                
                try:
                    for _ in range(120):
                        if "login" not in page.url:
                            break
                        page.wait_for_timeout(1000)
                    else:
                        raise Exception("Timeout")
                    
                    page.wait_for_timeout(3000)
                    success = True
                except Exception:
                    success = False
                
                browser.close()
                return success
        except Exception as e:
            raise ValueError(str(e))

    @staticmethod
    def desconectar_99freelas(user_id: str):
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        if os.path.exists(session_dir):
            try:
                shutil.rmtree(session_dir)
            except Exception as e:
                raise ValueError(f"Não foi possível remover a pasta da sessão: {str(e)}")

    @staticmethod
    def status_99freelas(user_id: str) -> bool:
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "99freelas")
        
        if not os.path.exists(session_dir):
            return False
            
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=True,
                    args=["--disable-blink-features=AutomationControlled"]
                )
                page = browser.new_page()
                page.goto("https://www.99freelas.com.br/dashboard", timeout=30000)
                
                success = "dashboard" in page.url or "projects" in page.url
                browser.close()
                return success
        except Exception:
            return False

    @staticmethod
    def sync_github_portfolio(user_id: str, provider_token: str | None) -> bool:
        if not provider_token:
            raise ValueError("Token do GitHub não fornecido. Faça login novamente para renovar o token.")
        
        # 1. Fetch repositories from GitHub
        headers = {
            "Authorization": f"Bearer {provider_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Pega os 10 últimos repositórios atualizados para ter uma base recente de atividade
        url = "https://api.github.com/user/repos?sort=updated&per_page=10&affiliation=owner"
        
        with httpx.Client() as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Falha ao conectar com o GitHub API. Código: {resp.status_code}")
                
            repos = resp.json()
            
        if not repos:
            raise ValueError("Nenhum repositório encontrado nesta conta do GitHub.")
            
        # 2. Formata os repositórios em texto para o LLM
        repo_texts = []
        for r in repos:
            name = r.get("name", "")
            desc = r.get("description", "") or "Sem descrição"
            lang = r.get("language", "") or "Desconhecido"
            stars = r.get("stargazers_count", 0)
            repo_texts.append(f"Projeto: {name} | Linguagem: {lang} | Estrelas: {stars}\nDescrição: {desc}")
            
        contexto_github = "\n\n".join(repo_texts)
        
        # 3. Pede para a IA resumir os repositórios focando nas habilidades do desenvolvedor
        prompt = f"""Você é um especialista em analisar portfólios técnicos. 
Aqui estão os projetos mais recentes de um desenvolvedor extraídos do seu GitHub:

{contexto_github}

Escreva um parágrafo denso, profissional e focado nas habilidades, frameworks e tipos de projetos (backend, frontend, devops, etc.) que este desenvolvedor tem experiência. 
O objetivo é que este resumo seja usado como 'contexto extra' por outro Agente de IA que escreve propostas para clientes (freelance). Não use saudações. Seja direto e em terceira pessoa."""

        resumo = generate_text(prompt)
        if not resumo:
            raise ValueError("Erro ao gerar resumo usando a inteligência artificial.")
            
        # 4. Salva no banco de dados, em configuracoes_usuario, na nova coluna github_resumo
        db.table("configuracoes_usuario").update({
            "github_resumo": resumo.strip()
        }).eq("perfil_id", user_id).execute()
        
        return True
