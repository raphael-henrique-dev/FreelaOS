# Arquitetura e Planejamento: FreelaOS

Este documento detalha a arquitetura técnica, as estratégias de integração de IA, estimativa de custos e o roadmap (fases de implementação) para transformar o FreelaOS em um produto real.

## 1. Arquitetura Técnica Recomendada

O sistema deve ser construído separando a interface responsiva da complexidade dos agentes de IA, garantindo segurança e escalabilidade.

- **Frontend (Interface):** 
  - React 19 + TypeScript.
  - Framework: Vite / TanStack Start & Router.
  - Estilização: Tailwind CSS v4 + Componentes Radix UI (foco em estética premium, dark-mode first).
- **Backend / Autenticação / Banco de Dados:**
  - **Supabase**: Servirá como banco de dados principal (PostgreSQL), sistema de autenticação e armazenamento de vetores (pgvector) para a memória das IAs.
- **Orquestração de Inteligência Artificial:**
  - Python rodando funções Serverless (Edge Functions) ou processos em background (Workers).
  - Frameworks: Vercel AI SDK ou LangChain.
- **Workers (Trabalhadores de Fundo):**
  - Rotinas agendadas (Cron Jobs) que rodam independentemente do usuário estar com o sistema aberto, essenciais para o **Scout IA**.

## 2. Estratégia de Integração das IAs e Custos

O custo com as APIs de IA (OpenAI, Anthropic, Google) é baseado no uso (*pay-as-you-go*), medido em "tokens". A estratégia principal para otimização de custos é **usar o modelo certo para a tarefa certa**:

### 🕵️‍♂️ Scout IA (Buscador de Oportunidades)
- **Como funciona:** Utiliza web scraping (Puppeteer, Apify) ou feeds RSS das plataformas de freelancers (Workana, Upwork) rodando de hora em hora.
- **Integração IA:** Os dados brutos extraídos são enviados para um modelo rápido e barato para estruturar a vaga (extrair título, orçamento, tecnologias).
- **Modelo recomendado:** `gpt-4o-mini` (OpenAI) ou `Gemini 1.5 Flash` (Google).
- **Custo estimado:** Frações de centavos por vaga estruturada.

### 🧠 Analista IA e ✍️ Redator IA
- **Como funciona:** Avalia a vaga contra o perfil do freelancer e redige propostas persuasivas e personalizadas. O sistema injeta o contexto do freelancer (tecnologias, preço/hora, estilo de escrita) no prompt.
- **Modelo recomendado:** `Claude 3.5 Sonnet` (Anthropic), `gpt-4o` (OpenAI) ou `Gemini 1.5 Pro` (Google) devido à sua superioridade em lógica e escrita humanizada. Possui mecanismos de *fallback* para modelos menores (como Gemini Flash) em caso de indisponibilidade.
- **Custo estimado:** US$ 0,01 a US$ 0,05 por proposta gerada/análise complexa.

### 🚀 Agente Sender (Robô de Automação)
- **Como funciona:** Age como as "mãos" do usuário. Após a proposta ser escrita (manualmente ou pela IA em background), o Sender utiliza o Playwright em modo invisível (headless) para utilizar a sessão previamente autenticada do usuário, preencher os formulários reais com a proposta, valor e prazo, e submeter.
- **Integração:** Automação RPA cirúrgica mapeando os IDs e formulários das plataformas (ex: 99Freelas), lidando até com modais de confirmação de termos.
- **Custo estimado:** Custo zero de API de IA, rodando apenas como rotina de backend.

### 💬 Assistente IA (Relacionamento)
- **Como funciona:** Lê as respostas dos clientes e sugere os próximos passos.
- **Integração IA:** Utiliza **RAG** (Retrieval-Augmented Generation). As conversas passadas e propostas enviadas são convertidas em vetores e salvas no Supabase. Quando o cliente responde, a IA recupera esse contexto histórico para formular respostas consistentes.
- **Custo médio global:** Para um uso intenso durante um mês, o custo total de APIs para um freelancer dificilmente ultrapassará a faixa de **US$ 5 a US$ 10**.

## 3. Planejamento de Execução (Roadmap / MVP)

Para evitar um escopo inatingível inicial, o desenvolvimento será focado em fases, começando pelo que gera mais valor imediato: a curadoria de vagas.

### Fase 1: MVP do Scout e Analista (CONCLUÍDO)
- [x] Interface de Dashboard mostrando as oportunidades encontradas.
- [x] Script de integração com 1 plataforma (99Freelas).
- [x] Avaliação automática da vaga gerando o "Score de Compatibilidade" e explicação.
- **Objetivo alcançado:** O usuário para de procurar vagas manualmente e apenas avalia as que têm fit com o seu perfil.

### Fase 2: Geração de Propostas e Orquestração (Redator IA e Sender) (CONCLUÍDO)
- [x] Adição do botão "Gerar Proposta" nos cards de vagas aprovadas pelo usuário.
- [x] Configuração de perfil do usuário (skills, portfólio) e Tons de Proposta para guiar a IA.
- [x] Editor interativo para revisar a proposta gerada antes de salvar como rascunho ou enviar.
- [x] Delegação 100% autônoma (Orquestração): O Redator IA pode rodar em background gerando as propostas sozinho baseado na nota (score limite) definida pelo usuário.
- [x] Implementação do Agente Sender para submeter e enviar as propostas diretamente na plataforma (ex: 99Freelas) sem necessidade do usuário copiar e colar.
- [x] Loop Contínuo (Piloto Automático): Pipeline completo operando invisível em background a cada 3h com trava de segurança (Revisão Humana Obrigatória) opcional.

### Fase 3: Acompanhamento e Financeiro (Assistente e Financeiro IA)
- Painel estilo Kanban para arrastar projetos (Lead -> Em negociação -> Fechado).
- Assistente IA sugerindo respostas para mensagens de clientes baseando-se no histórico (RAG).
- Controle simples de fluxo de caixa e faturamento do projeto.

### 📝 Backlog (Melhorias Técnicas)
- [ ] Migrar Redator IA e Analista IA para o modelo `Claude 3.5 Sonnet` (Anthropic) visando melhoria na qualidade da escrita e persuasão.
