# Relatório de Impacto à Proteção de Dados Pessoais (RIPD / DPIA)
**FreelaOS — Sistema Operacional para Freelancers**  
*Documento elaborado com fulcro no Artigo 38 da Lei nº 13.709/2018 (LGPD) e diretrizes de IA Confiável*  
*Versão: 1.0 — Data de Elaboração: 13 de outubro de 2026*

---

## 1. Descrição do Sistema e Tecnologias Empregadas

O **FreelaOS** é uma plataforma que integra:
1. **Robotic Process Automation (RPA) via Playwright:** Navegadores headless automatizados para varredura de portais de freelancers (Scout) e envio de propostas (Sender).
2. **Pipelines de IA Generativa Multi-LLM (OpenAI, Gemini, Groq, OpenRouter):** Modelos de inteligência artificial para cálculo de pontuação de compatibilidade (Analista IA) e redação persuasiva de propostas personalizadas (Redator IA).
3. **Persistência em Nuvem (Supabase / PostgreSQL):** Armazenamento estruturado com regras de isolamento por inquilino via Row-Level Security (RLS).

---

## 2. Identificação e Avaliação de Riscos à Privacidade

| ID | Risco Identificado | Severidade Inicial | Probabilidade | Mitigação Técnica e Organizacional Implementada | Severidade Residual |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **R01** | Vazamento involuntário de dados de contato (e-mails, números de telefone celular, CPF/CNPJ) de clientes anunciantes de vagas para provedores externos de LLM durante a geração de propostas. | **ALTA** | **MÉDIA** | Implementação do módulo `pii_sanitizer.py` que executa regex com substituição obrigatória por tokens genéricos (`[E-MAIL REMOVIDO]`, `[TELEFONE REMOVIDO]`, etc.) antes da montagem dos prompts nos serviços `AnalistaService` e `RedatorService`. | **BAIXA** |
| **R02** | Disparo automático indevido de propostas comerciais de baixa qualidade ou fora da vontade do titular sem supervisão humana (RPA autônomo). | **MÉDIA** | **MÉDIA** | Configuração da chave `revisao_humana_obrigatoria` ativada por padrão. O agente Sender grava as propostas como "Rascunho" no Backlog até a aprovação explícita do usuário, salvo se o titular desativar conscientemente a salvaguarda nas Configurações. | **BAIXA** |
| **R03** | Violação de isolamento multitenancy entre freelancers concorrentes na mesma base de dados. | **CRÍTICA** | **BAIXA** | Aplicação estrita de Row-Level Security (RLS) no PostgreSQL do Supabase em todas as tabelas (`perfis`, `configuracoes_usuario`, `oportunidades`, `clientes`, `mensagens`, `atividades_agentes`, `consentimentos`). Validação adicional via middleware JWT no backend FastAPI (`verify_user_ownership`). | **MUITO BAIXA** |
| **R04** | Persistência indevida de dados após o titular solicitar a exclusão de sua conta (direito ao esquecimento). | **ALTA** | **BAIXA** | Implementação de Hard Delete completo em cascata no banco de dados e remoção física recursiva do diretório de sessões Playwright (`playwright_sessions/<perfil_id>`) em disco no endpoint `DELETE /api/privacy/account`. | **MUITO BAIXA** |
| **R05** | Ausência de comprovação de consentimento válido em caso de auditoria da ANPD. | **MÉDIA** | **MÉDIA** | Registro formal com versionamento de consentimentos (`v1.0`), carimbo de data/hora UTC, endereço IP e cabeçalho User-Agent na tabela dedicada `consentimentos`. Modal bloqueante para novos usuários e reaceite obrigatório em novas versões. | **MUITO BAIXA** |

---

## 3. Conformidade com os Princípios da LGPD (Art. 6º)

1. **Finalidade:** O tratamento de dados destina-se única e exclusivamente a auxiliar o profissional freelancer na busca e redação de propostas de trabalho.
2. **Adequação:** As informações solicitadas e processadas possuem aderência direta à atividade de prospecção e envio de propostas.
3. **Necessidade (Minimização):** Somente o resumo profissional e os requisitos técnicos do projeto são compartilhados com as APIs de inteligência artificial.
4. **Livre Acesso:** O titular possui ferramenta automatizada para download integral de seus dados em JSON a qualquer instante (`/configuracoes`).
5. **Qualidade dos Dados:** O titular possui autonomia total para editar seu perfil, habilidades, valores e modelos de propostas.
6. **Transparência:** Termos de Uso e Política de Privacidade acessíveis publicamente, com redação simples, direta e isenta de termos ambíguos.
7. **Segurança:** Tráfego HTTPS/TLS 1.3, banco de dados isolado com RLS, higienização algorítmica de dados pessoais e guarda mínima de logs (90 dias).
8. **Prevenção:** Adoção de rotinas contínuas de sanitização de PII antes de qualquer tráfego para APIs de terceiros.
9. **Não Discriminação:** Os agentes de IA não realizam filtragem por gênero, etnia, credo ou qualquer dado sensível.
10. **Responsabilização e Prestação de Contas:** Manutenção de logs de atividades dos agentes com expurgo programado e geração de relatórios de consentimento auditáveis.

---

## 4. Parecer Conclusivo

Considerando as medidas de controle arquitetural, a sanitização ativa de PII, o isolamento por RLS e os mecanismos de portabilidade e eliminação automática, conclui-se que o FreelaOS apresenta **nível de risco residual baixo e plenamente tolerável**, estando formalmente apto a operar em total conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
