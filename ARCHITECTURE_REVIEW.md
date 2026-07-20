# Architecture Review: FreelaOS

Este documento contém a avaliação arquitetural completa do projeto **FreelaOS** (Frontend: React/Vite/Lovable | Backend: FastAPI). A revisão visa preparar o projeto para escalabilidade, independência de ferramentas temporárias e adoção de boas práticas (DDD, SOLID, Clean Architecture).

---

## 🔴 Problemas Críticos de Arquitetura
*Estes pontos dificultarão o crescimento da aplicação e necessitam de intervenção urgente.*

1. **Falta de Separação de Responsabilidades no Backend (Anti-padrão "Fat Router"):**
   - Os arquivos em `agents/` (`scout.py`, `analista.py`, etc.) misturam lógica de HTTP (routers), regras de negócio, chamadas ao LLM (com retry manual e *hardcoded*) e acesso direto ao banco de dados (Supabase) **tudo dentro da mesma função da rota**.
   - Isso viola fortemente a **Clean Architecture** e dificulta qualquer teste unitário ou reaproveitamento de código.

2. **Acesso ao Banco Dividido (Two Sources of Truth):**
   - O Frontend consulta o Supabase de forma direta via cliente JS em páginas gigantes (ex: `configuracoes.tsx`).
   - O Backend também altera e lê do mesmo banco em seus scripts FastAPI. 
   - Idealmente, o Backend (API) deve ser a única interface de acesso aos domínios de negócio para evitar regras duplicadas, ou, caso opte-se pelo modelo Serverless DB puro no Front, os agentes devem atuar apenas como *workers* (event-driven). Misturar os dois estilos gera inconsistência de regras de negócio.

3. **Acoplamento Severo no React e Hardcoded URLs:**
   - Componentes React realizam chamadas `fetch("http://localhost:8000/api/...")` de forma *hardcoded* (direto no arquivo de rota). Não há injeção de dependências ou uso de variáveis de ambiente gerenciáveis (ex: `VITE_API_URL`).
   - Não há um Service Layer no frontend.

## 🟠 Melhorias Importantes
*Correções de alto valor para estabilizar a manutenção antes de crescer.*

1. **Componentes React Gigantes:**
   - O arquivo `configuracoes.tsx` tem **~640 linhas** e o `oportunidades.index.tsx` possui **~500 linhas**. Eles realizam manipulação de estado, formatação, data fetching e renderização de UI complexa. 
   - **Solução:** Fragmentar em múltiplos componentes menores. Extrair a lógica de banco/API para hooks personalizados (ex: `useOportunidades`, `useConfiguracoes`).

2. **Abstração da Camada de Inteligência Artificial (LLM):**
   - Lógicas idênticas de retry (ex: `for attempt in range(max_retries): time.sleep(...)`) e instanciação do *google-genai* estão duplicadas em quase todos os agentes (`scout.py`, `analista.py`).
   - **Solução:** Criar um serviço centralizado (`LLMService`) que encapsule a infraestrutura da IA, provendo suporte genérico a retries, fallbacks (como a queda do 3.5 para o 3.1) e formatação (limpeza de JSON).

3. **Tratamento de Estado Assíncrono no Frontend:**
   - Abandonar a tríade "useEffect + useState + fetch local" em prol de ferramentas robustas de data-fetching como o **React Query** (`@tanstack/react-query`).

## 🟡 Melhorias Recomendadas
*Boas práticas que elevarão o padrão técnico de um MVP para um SaaS enterprise.*

- **Definição Clara de Tipos/Modelos:** Fazer o "sync" dos tipos entre a API (Pydantic Models) e o TypeScript. Isso pode ser feito gerando os tipos a partir do schema do Supabase e do OpenAPI (Swagger) gerado automaticamente pelo FastAPI.
- **Tratamento Global de Erros:** Unificar exceções no backend através de Middlewares/Exception Handlers do FastAPI. No frontend, usar Axios interceptors e toasts genéricos (já utiliza o *sonner*, mas espalhado pelas chamadas).

## 🟢 Limpeza (Dead Code & Lovable Legacy)
*Arquivos e rastros para remoção imediata, libertando o projeto da amarra do MVP gerador.*

- **Diretório e config do Lovable:** Remover pasta `.lovable` e `project.json` na raiz.
- **Legacy Error Reporting:** Remover os arquivos `src/lib/lovable-error-reporting.ts`, `src/lib/error-capture.ts` e `src/lib/error-page.ts`. Eles implementam um fallback customizado intrusivo que polui a captura real de exceptions do React (Error Boundaries padrão).
- **Scripts Soltos de Teste:** Em `agents/`, arquivos como `teste_envio.py` e `test_scout.py` parecem ser scripts isolados de exploração manual. Devem ser movidos para uma estrutura adequada de `tests/` com *pytest* ou descartados.

## 📁 Estrutura Sugerida (Domain Driven Design)
Esta reestruturação suportará dezenas de agentes e domínios independentes.

### Sugestão para o Backend (`agents/` -> `backend/`):
```text
backend/
├── src/
│   ├── main.py                     # Entrypoint (inicia FastAPI e CORS)
│   ├── core/
│   │   ├── config.py               # Carregamento de variáveis de ambiente (.env)
│   │   ├── database.py             # Instância singleton do Supabase Client
│   │   └── llm_client.py           # Cliente unificado de LLM com retry e fallback
│   ├── domain/
│   │   ├── models/                 # Modelos Pydantic (Oportunidade, Perfil, Vaga)
│   │   └── schemas/                # Schemas de request/response das APIs
│   ├── modules/ (Domínios)
│   │   ├── opportunities/
│   │   │   ├── router.py           # Endpoints HTTP limpos (apenas recebe e retorna)
│   │   │   ├── service.py          # Lógica de negócio (Analista/Scout)
│   │   │   └── repository.py       # Interação com a tabela "oportunidades"
│   │   ├── communications/         # Sender, Inbox Monitor
│   │   │   ├── ...
```

### Sugestão para o Frontend (`src/`):
```text
src/
├── app/                            # Configurações globais (Router, Providers TanStack)
├── core/
│   ├── api.ts                      # Instância do Axios / Interceptors configurados
│   └── types/                      # Interfaces TypeScript base
├── shared/
│   └── components/                 # Componentes UI reutilizáveis (shadcn/ui limpos)
├── modules/                        # Features agrupadas por contexto de negócio
│   ├── opportunities/
│   │   ├── components/             # Componentes específicos (OportunidadeCard, etc)
│   │   ├── hooks/                  # Data fetching (useOpportunities.ts)
│   │   └── services/               # Chamadas à API do domínio
│   ├── settings/
│   └── agents/
```

## 📈 Roadmap de Refatoração

**Fase 1: Desacoplamento do MVP (Imediato)**
1. **Limpeza:** Remover todos os artefatos legados apontados na seção verde.
2. **Setup Base URL:** Trocar as `localhost:8000` hardcoded por uma constante no `vite.env` e criar um utilitário `api.ts` genérico.

**Fase 2: Arquitetura Limpa no Backend (Semana 2)**
1. **Repository Pattern:** Remover comandos de `.insert()` e `.update()` de dentro das rotas do FastAPI em todos os agentes, movendo-os para classes de Repositório.
2. **Service Layer (LLM):** Extrair a lógica do `genai.Client` para uma função central, garantindo que os retries (ex: fallback pro Flash-Lite) fiquem encapsulados.
3. **Agentes como Serviços:** Transformar `scout.py`, `analista.py` em lógicas invocáveis, separadas das rotas do FastAPI (`router`).

**Fase 3: Refatoração React (Semanas 3-4)**
1. **Divisão Visual:** Quebrar o `configuracoes.tsx` e `oportunidades.index.tsx` em pelo menos 3 componentes (ex: Header, List/Form e Item).
2. **Delegação da Regra:** Passar consultas de banco de dados pesadas feitas no front para chamadas na API do backend (centralizando o acesso aos dados em um único lugar).
3. **Estado Global/Cache:** Adicionar o **React Query** para controlar estados de `isLoading`, `isError` sem os `useState` complexos atuais.

---
*Conclusão:*
A base atual viabilizou rapidamente a visão, mas seu acoplamento direto com recursos de infraestrutura e repetição estrutural limita a integração orgânica de novos agentes IA. O passo mais importante hoje é isolar o acesso ao LLM e ao banco de dados no backend, retirando estas responsabilidades diretas dos Web Routers e do Frontend.*
