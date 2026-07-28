import os
import urllib.parse
import logging
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

class Freelas99Crawler:
    @staticmethod
    def executar(user_id: str, buscas: list, ignorar_exclusivos: bool, limit_per_term: int = 10):
        resultados = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()
            
            for termo in buscas:
                logger.info(f"[99Freelas] Buscando por: ({termo})")
                
                # Monta a URL de busca dinâmica
                if termo == "desenvolvimento-web":
                    url_alvo = "https://www.99freelas.com.br/projects?categoria=desenvolvimento-web"
                else:
                    url_alvo = f"https://www.99freelas.com.br/projects?q={urllib.parse.quote(termo)}"
                    
                page.goto(url_alvo)
                
                try:
                    page.wait_for_selector(".result-list", timeout=10000)
                except Exception:
                    logger.info(f"[99Freelas] Nenhuma vaga encontrada para {termo}.")
                    continue
                    
                projetos = page.locator(".result-list .result-item")
                total = projetos.count()
                logger.info(f"[99Freelas] Encontradas {total} vagas para {termo}.")
                
                # Varre até as 10 primeiras de cada termo
                for i in range(min(total, limit_per_term)):
                    projeto = projetos.nth(i)
                    link_tag = projeto.locator("h1.title a")
                    
                    if link_tag.count() == 0:
                        continue
                        
                    titulo = link_tag.inner_text()
                    href = link_tag.get_attribute("href")
                    url_vaga = f"https://www.99freelas.com.br{href}"
                    
                    # Tenta clicar em "Expandir" para ler o texto todo da vaga
                    expandir_btn = projeto.locator("text='Expandir'")
                    if expandir_btn.count() > 0:
                        try:
                            expandir_btn.first.click()
                            page.wait_for_timeout(800) # Espera a animação de expansão do site concluir
                        except Exception:
                            pass
                    
                    # Extração Profunda (Raw Text)
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
                        logger.info(f"[99Freelas] Vaga ignorada (assinatura premium): {titulo}")
                        continue
                    
                    resultados.append({
                        "plataforma": "99Freelas",
                        "titulo": titulo,
                        "url": url_vaga,
                        "texto_bruto": texto_bruto
                    })
                    
            browser.close()
        return resultados
