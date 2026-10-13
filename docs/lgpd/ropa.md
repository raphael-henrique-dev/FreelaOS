# Registro de Operações de Tratamento de Dados Pessoais (ROPA)
**FreelaOS — Sistema Operacional para Freelancers**  
*Documento em conformidade com o Artigo 37 da Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD)*  
*Versão: 1.0 — Data de Elaboração: 13 de outubro de 2026*

---

## 1. Identificação do Controlador e Operadores

| Atribuição | Detalhes |
| :--- | :--- |
| **Controlador dos Dados** | FreelaOS Soluções Tecnológicas |
| **Contato do Encarregado (DPO)** | dpo@freelaos.com.br / privacidade@freelaos.com.br |
| **Operadores e Subprocessadores** | • **Supabase Inc.** (Banco de dados PostgreSQL gerenciado, autenticação e armazenamento)<br>• **OpenAI / Google Gemini / Groq / OpenRouter** (Provedores de Modelos de Linguagem para inferência de compatibilidade e redação de propostas com minimização prévia de PII)<br>• **Infraestrutura Cloud / Host Docker** (Execução dos microsserviços FastAPI e automação Playwright) |

---

## 2. Inventário de Operações de Tratamento de Dados

### Operação 1: Cadastro, Autenticação e Gestão de Perfil de Titulares
* **Descrição:** Criação e manutenção de conta de freelancer na plataforma via e-mail/senha ou provedores OAuth (Google, GitHub).
* **Dados Coletados:** Nome completo, endereço de e-mail, foto de perfil (quando fornecida via OAuth), fuso horário, cidade, habilidades profissionais, bio, valores mínimos de hora e projeto.
* **Finalidade:** Viabilizar o acesso à plataforma, personalizar as recomendações de vagas e compor o contexto técnico para formulação de propostas.
* **Base Legal:** Execução de Contrato (Artigo 7º, V da LGPD).
* **Prazo de Retenção:** Durante todo o período de vigência da conta, ou até o exercício do direito de eliminação pelo titular (Art. 18, VI).

---

### Operação 2: Gestão de Sessões em Plataformas Terceiras (99Freelas / Workana)
* **Descrição:** Armazenamento local temporário de cookies de sessão (`phpsessid`, `session_id`) ou execução assistida de login no navegador headless (Playwright) para prospecção em nome do titular.
* **Dados Coletados:** Identificador de sessão e cookies gerados pelos portais de trabalho remoto integrados pelo próprio usuário.
* **Finalidade:** Permitir que os robôs autônomos (Scout e Sender) capturem vagas e enviem as propostas aprovadas diretamente na conta do freelancer.
* **Base Legal:** Execução de Contrato a pedido do Titular (Artigo 7º, V da LGPD).
* **Prazo de Retenção:** Mantidos enquanto durar a integração ativa ou até desconexão manual/eliminação definitiva de conta (`playwright_sessions/<user_id>`).

---

### Operação 3: Minimização e Higienização de PII em Vagas de Terceiros
* **Descrição:** Processamento automático do texto de vagas captadas pelo Scout para expurgar e-mails, telefones/WhatsApp, CPFs e CNPJs de clientes contratantes antes de qualquer envio a modelos externos de IA.
* **Dados Coletados / Tratados:** Título da vaga, descrição, orçamento estimado, prazo e identificadores públicos da vaga.
* **Finalidade:** Impedir o compartilhamento indevido de dados pessoais de terceiros com provedores externos de LLM, atendendo ao Princípio da Minimização e da Segurança da Informação.
* **Base Legal:** Legítimo Interesse (Artigo 7º, IX da LGPD) e Cumprimento de Obrigação Legal/Princípio da Segurança (Artigo 6º, III e VII da LGPD).
* **Medida Técnica Aplicada:** Higienização via módulo `pii_sanitizer.py` por expressões regulares com mascaramento obrigatório antes de interpolação em prompts.

---

### Operação 4: Inferência de Adequação e Redação de Propostas Comerciais (IA)
* **Descrição:** Envio das especificações higienizadas da vaga e do resumo de habilidades do freelancer aos provedores de inferência de IA (OpenAI, Gemini, Groq) para pontuação de compatibilidade (Score Fit 0-100) e geração de proposta.
* **Dados Pessoais Transmitidos:** Apenas resumo de qualificações técnicas do freelancer titular (sem credenciais, documentos ou dados sensíveis) e requisitos públicos da oportunidade (sem dados de contato do cliente).
* **Finalidade:** Geração de propostas comerciais persuasivas e cálculo de relevância da vaga para ganho de produtividade do titular.
* **Base Legal:** Execução de Contrato (Artigo 7º, V) e Consentimento Específico (Artigo 7º, I da LGPD).
* **Retenção no Provedor:** Provedores contratados via API empresarial com cláusula de não utilização de dados do cliente para treinamento de modelos fundacionais.

---

### Operação 5: Gestão de Comprovações de Consentimento
* **Descrição:** Registro de data/hora, endereço IP, User-Agent e versão dos termos acordados pelo usuário no login, cadastro ou atualização de políticas.
* **Dados Coletados:** `perfil_id`, tipo de consentimento (`termos`, `privacidade`, `ia_terceiros`), versão aceita, timestamp UTC, IP do cliente, User-Agent.
* **Finalidade:** Cumprimento da obrigação de demonstrar a manifestação livre, informada e inequívoca da vontade do titular (ônus da prova do consentimento - Artigo 8º, § 2º da LGPD).
* **Base Legal:** Cumprimento de Obrigação Legal (Artigo 7º, II da LGPD).
* **Prazo de Retenção:** 5 (cinco) anos após o encerramento da conta para fins probatórios e prescricionais civis.

---

### Operação 6: Rotina Periódica de Expurgo de Logs Operacionais
* **Descrição:** Execução automatizada de limpeza de registros em `atividades_agentes` com idade superior a 90 dias.
* **Finalidade:** Minimização de dados armazenados e respeito ao ciclo de vida útil da informação.
* **Base Legal:** Princípio da Necessidade e Não Discriminação (Artigo 6º, III e IX da LGPD).

---

## 3. Direitos dos Titulares e Medidas de Atendimento (Art. 18)

| Direito do Titular | Mecanismo de Atendimento no FreelaOS | Tempo de Resposta |
| :--- | :--- | :--- |
| **Confirmação e Acesso aos Dados** | Rota autenticada `GET /api/privacy/export?user_id=...` e interface em `/configuracoes`. | Imediato / Tempo real (download JSON) |
| **Portabilidade de Dados** | Exportação padronizada em JSON contendo perfil, configurações, oportunidades, clientes e mensagens. | Imediato / Tempo real |
| **Eliminação de Dados Pessoais (Hard Delete)** | Rota autenticada `DELETE /api/privacy/account` com exigência de digitação estrita de `EXCLUIR`. Destruição imediata de linhas do banco de dados e pastas de automação em disco. | Imediato e irreversível |
| **Revogação de Consentimento** | Configurações do painel do usuário e opção de cancelamento de integrações de automação ou exclusão definitiva. | Imediato |

---

## 4. Medidas Técnicas e de Segurança Adotadas

1. **Criptografia em Trânsito:** Toda a comunicação HTTP e WebSocket é intermediada via TLS 1.3 / HTTPS.
2. **Isolamento Multitenant (RLS):** Uso de Row-Level Security no PostgreSQL (Supabase) impedindo que qualquer usuário consulte ou manipule registros de outros inquilinos.
3. **Higienização Pré-LLM:** Mascaramento obrigatório de dados de contato (e-mails, números de telefone, CPFs, CNPJs) antes do envio a provedores externos de IA.
4. **Isolamento de Credenciais:** As sessões de automação em disco (`playwright_sessions/<perfil_id>`) são restritas ao contêiner de execução, não expostas na API pública e expurgadas na exclusão de conta.
5. **Auditoria de Acesso:** Verificação estrita de titularidade do token JWT via `verify_user_ownership` em todos os endpoints de manipulação de dados pessoais.
