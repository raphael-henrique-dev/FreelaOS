import urllib.request
import json
import time

# ATENÇÃO: Substitua este ID pelo seu ID de usuário real copiado do Supabase (tabela perfis)
USER_ID = "9b6a917c-58ec-4380-9c50-3b2368e123f4"

scout_url = "http://localhost:8000/api/scout/analyze"
scout_proposta_teste = {
    "texto": "Preciso de um desenvolvedor urgente para criar um sistema de gestão de barbearia. Tem que ser em React e Nodejs. O orçamento é de 2500 reais e preciso disso para o final do mês. Meu nome é Carlos e não quero sistema pronto, quero do zero.",
    "plataforma": "99Freelas"
}

scout_data = json.dumps(scout_proposta_teste).encode('utf-8')
scout_req = urllib.request.Request(scout_url, data=scout_data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    print("1. [SCOUT IA] Analisando a vaga bruta...")
    with urllib.request.urlopen(scout_req) as response:
        resp_json = json.loads(response.read().decode('utf-8'))
        print(" -> Scout processou a vaga. ID:", resp_json.get("vaga_id"))
        
        vaga_id = resp_json.get("vaga_id")
        
        if vaga_id and USER_ID == "9b6a917c-58ec-4380-9c50-3b2368e123f4":
            print("\n2. [ANALISTA IA] Avaliando aderência ao seu perfil...")
            time.sleep(1) # Aguarda um segundo só por garantia
            
            analista_url = "http://localhost:8000/api/analista/evaluate"
            analista_payload = {
                "vaga_id": str(vaga_id),
                "user_id": USER_ID
            }
            
            analista_data = json.dumps(analista_payload).encode('utf-8')
            analista_req = urllib.request.Request(analista_url, data=analista_data, headers={'Content-Type': 'application/json'}, method='POST')
            
            with urllib.request.urlopen(analista_req) as analista_resp:
                analista_json = json.loads(analista_resp.read().decode('utf-8'))
                print(" -> Análise concluída!")
                print(f" -> SCORE FINAL: {analista_json.get('score')}/100")
                print(f" -> PARECER DA IA: {analista_json.get('explicacao')}")
        else:
            print("\n(Análise IA pulada porque o USER_ID não foi configurado no arquivo teste_envio.py)")
            
except urllib.error.HTTPError as e:
    print(f"Erro na requisição: {e.code}")
    print("Detalhes do erro:", e.read().decode('utf-8'))
except Exception as e:
    print("Erro inesperado:", e)
