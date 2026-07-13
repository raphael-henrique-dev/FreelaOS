import urllib.request
import json

url = "http://localhost:8000/api/scout/analyze"
payload = {
    "texto": "Preciso de um desenvolvedor urgente para criar um sistema de gestão de barbearia. Tem que ser em React e Nodejs. O orçamento é de 2500 reais e preciso disso para o final do mês. Meu nome é Carlos e não quero sistema pronto, quero do zero.",
    "plataforma": "99Freelas"
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    print("Enviando requisição para o agente (Isso pode levar alguns segundos)...")
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.getcode())
        print("Resposta:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"Erro na requisição: {e.code}")
    print("Detalhes do erro:", e.read().decode('utf-8'))
except Exception as e:
    print("Erro inesperado:", e)
