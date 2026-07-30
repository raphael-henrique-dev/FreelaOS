import os
import time
import logging
import urllib.parse
from playwright.sync_api import sync_playwright
from backend.src.modules.opportunities.repository import OpportunityRepository

opp_repo = OpportunityRepository()

logger = logging.getLogger(__name__)

class WorkanaCrawler:
    @staticmethod
    def executar(user_id: str, buscas: list, limit: int = 3):
        session_dir = os.path.join(os.getcwd(), "playwright_sessions", user_id, "workana")
        if not os.path.exists(session_dir):
            raise ValueError("Sessão da Workana não encontrada. Conecte sua conta nas configurações.")
            
        resultados = []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=True,
                    args=["--disable-blink-features=AutomationControlled"]
                )
                page = browser.new_page()
                for termo in buscas:
                    logger.info(f"[Workana] Buscando por: ({termo})")
                    
                    if termo == "desenvolvimento-web":
                        url_alvo = "https://www.workana.com/jobs?language=pt"
                    else:
                        url_alvo = f"https://www.workana.com/jobs?query={urllib.parse.quote(termo)}&language=pt"
                        
                    page.goto(url_alvo)
                    
                    try:
                        page.wait_for_selector(".project-item", timeout=10000)
                    except Exception:
                        logger.info(f"[Workana] Nenhuma vaga encontrada para {termo}.")
                        continue
                        
                    links_elements = page.locator(".project-item .project-title a")
                    count = links_elements.count()
                    logger.info(f"[Workana] Encontradas {count} vagas para {termo}.")
                    
                    links_data = []
                    for i in range(count):
                        elem = links_elements.nth(i)
                        href = elem.get_attribute("href")
                        titulo = elem.inner_text().strip() or href
                        if href:
                            if not href.startswith("http"):
                                href = "https://www.workana.com" + href
                            links_data.append({"url": href, "titulo": titulo})
                    
                    # Deduplicate based on URL while preserving order
                    seen = set()
                    unique_links = []
                    for item in links_data:
                        if item["url"] not in seen:
                            seen.add(item["url"])
                            unique_links.append(item)
                    unique_links = unique_links[:limit]
                    
                    for item in unique_links:
                        link = item["url"]
                        titulo_vaga = item["titulo"]
                        # Extract job detail
                        page.goto(link)
                        page.wait_for_timeout(3000)
                    
                    try:
                        # Extrai o texto da página da vaga. 
                        # O ScoutService recebe o texto bruto e a IA extrai os dados estruturados.
                        texto_vaga = page.inner_text("body")
                    except Exception as e:
                        print(f"Erro ao extrair texto da vaga {link}: {e}")
                        continue
                        
                    if texto_vaga:
                        resultados.append({
                            "plataforma": "Workana",
                            "titulo": titulo_vaga,
                            "url": link,
                            "texto_bruto": texto_vaga
                        })
                            
                        # Pausa amigável para não sobrecarregar o site
                        time.sleep(2)
                    
                browser.close()
                return resultados
        except Exception as e:
            raise ValueError(f"Erro no Crawler da Workana: {str(e)}")
