# FreelaOS

**O Cursor para Freelancers.**
FreelaOS é um Sistema Operacional para Freelancers totalmente baseado em Inteligência Artificial. Muito além de um CRM convencional, o FreelaOS atua como uma equipe comercial autônoma trabalhando em background 24 horas por dia para alavancar a sua aquisição de clientes.

## 🚀 Como funciona a Equipe de Agentes?

O sistema roda em um **Piloto Automático** configurável, orquestrando 4 agentes distintos:

* 🕵️‍♂️ **Scout IA**: Monitora ativamente plataformas de freelancers (ex: 99Freelas) varrendo novas oportunidades com base no seu perfil e habilidades técnicas.
* 🧠 **Analista IA**: Inspeciona os requisitos das vagas recém-coletadas e gera um "Score de Compatibilidade" (0-100) avaliando risco, valor hora e alinhamento tecnológico.
* ✍️ **Redator IA**: Assim que uma vaga ultrapassa sua "nota de corte", ele entra em cena gerando uma proposta comercial altamente persuasiva, humana e personalizada com seu portfólio.
* 🚀 **Sender (Robô)**: Responsável por agir como suas mãos. Se a trava de Revisão Humana Obrigatória estiver desligada, ele acessa o painel do cliente de forma invisível e submete a proposta automaticamente.

## 🛠️ Tecnologias e Arquitetura

**Frontend (Interface Premium e Fluida):**
* React 19 + TypeScript
* Vite & TanStack Router
* Tailwind CSS v4 + Componentes Radix UI (Dark Mode nativo)

**Backend e Cérebro (Agentes):**
* Python 3.12 + FastAPI (Rotas e Background Tasks)
* Playwright Assíncrono (Web Scraping e RPA)
* Gemini 3.5 e Flash Lite (Modelos LLM)

**Banco de Dados:**
* Supabase (PostgreSQL, Auth e Edge Functions)

## ⚙️ Instalação e Execução (Ambiente Local)

### 1. Iniciando a Interface (Frontend)
```bash
# Na raiz do projeto
npm install
npm run dev
```

### 2. Ligando o Motor de Inteligência Artificial (Backend)
```bash
cd agents
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Instala os binários de navegador invisível para o Extrator e Sender
playwright install chromium

# Roda o servidor na porta 8000
uvicorn main:app --reload
```

### 3. Variáveis de Ambiente
Você precisará criar um `.env` com as integrações das APIs:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

## 🔒 Segurança de Sessão
Por lidar com extração e submissão de dados via Playwright, a sessão do navegador local é preservada na pasta `/playwright_sessions`. Nunca versione estes arquivos.

### EM DESENVOLVIMENTO ###
