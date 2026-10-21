# Avaliação de Legítimo Interesse (LIA — Legitimate Interests Assessment)
**FreelaOS — Sistema Operacional para Freelancers**  
*Documento de fundamentação legal para tratamento de dados pessoais com base no Artigo 7º, IX e Artigo 10 da Lei nº 13.709/2018 (LGPD)*  
*Versão: 1.0 — Data de Elaboração: 13 de outubro de 2026*

---

## 1. Contexto e Hipótese Avaliada

O **FreelaOS** emprega agentes de prospecção autônoma (Scout IA) para monitorar e consolidar oportunidades de trabalho freelancer publicadas em plataformas públicas e semi-públicas (99Freelas e Workana). 

Nesse processo, textos de propostas e descrições de projetos contêm, por vezes, identificadores do anunciante da vaga (como nome de usuário público, descrição técnica da necessidade e, ocasionalmente, dados de contato inseridos no corpo do anúncio pelo próprio contratante).

Este documento registra a aplicação do **Teste de Ponderação em Três Fases** exigido pela LGPD e pelas diretrizes da Autoridade Nacional de Proteção de Dados (ANPD).

---

## 2. Teste de Três Fases (Three-Part Test)

### Fase 1: Teste da Finalidade (Purpose Test)
* **Qual é o interesse legítimo do controlador ou de terceiros?**  
  O interesse legítimo consiste em possibilitar aos profissionais freelancers a identificação rápida e qualificada de projetos abertos no mercado, otimizando seu tempo de busca, competitividade e subsistência econômica no mercado de prestação de serviços intelectuais.
* **A finalidade é legítima e lícita?**  
  Sim. Trata-se de atividade econômica regular de intermediação técnica e apoio à contratação de serviços autônomos, amparada pela livre iniciativa (Art. 170 da Constituição Federal).
* **Existe interesse claro e concreto?**  
  Sim. Os clientes publicam vagas abertas exatamente com o objetivo expresso de atrair profissionais qualificados para a execução de suas demandas.

### Fase 2: Teste da Necessidade (Necessity Test)
* **O tratamento é estritamente necessário para alcançar a finalidade?**  
  Sim. Sem a extração dos requisitos técnicos, escopo do projeto, prazo e orçamento estimado, é impossível calcular a pontuação de compatibilidade (Score Fit) e redigir uma proposta comercial coerente.
* **Existem meios menos intrusivos para atingir o mesmo objetivo?**  
  Foram adotadas salvaguardas adicionais para garantir que apenas os dados mínimos necessários sejam utilizados:
  1. O FreelaOS restringe a coleta ao escopo público da vaga.
  2. Implementou-se um algoritmo obrigatório de **Minimização de PII (`pii_sanitizer.py`)**, que remove ativamente quaisquer números de telefone, WhatsApp, endereços de e-mail, CPFs ou CNPJs antes de qualquer encaminhamento a modelos de linguagem terceiros.
  3. Dados de terceiros não são comercializados, compartilhados com anunciantes nem utilizados para fins de marketing direto.

### Fase 3: Teste do Balanceamento e Salvaguardas (Balancing Test)
* **Qual é a natureza dos dados tratados?**  
  Trata-se exclusivamente de dados profissionais cadastrais e descrições comerciais de serviços demandados. **Não há tratamento de dados sensíveis** (Artigo 5º, II da LGPD) nem de dados de crianças e adolescentes.
* **Qual é a expectativa razoável do titular (contratante da vaga)?**  
  Ao publicar voluntariamente uma vaga em uma plataforma de freelancers, o contratante tem a expectativa legítima de que profissionais interessados analisem os requisitos da demanda e formulem propostas técnicas pertinentes ao projeto anunciado.
* **Qual é o impacto sobre os direitos e liberdades individuais do titular?**  
  O impacto é desprezível e positivo, pois converge diretamente para o atendimento do pedido do titular (receber propostas para seu projeto). A higienização de dados de contato impede qualquer risco colateral de vazamento involuntário para terceiros.
* **Salvaguardas implementadas pelo FreelaOS:**
  - Higienização obrigatória de PII via Regex antes da interpolação de qualquer prompt de IA.
  - Bloqueio de persistência permanente de dados de terceiros desnecessários.
  - Revisão humana disponível antes do envio formal de mensagens ao contratante.
  - Transparência total aos usuários através da Política de Privacidade pública.

---

## 3. Conclusão da Avaliação

A ponderação demonstra que o tratamento dos dados do anúncio de oportunidades pelo Scout IA cumpre integralmente os requisitos de **legitimidade, necessidade, proporcionalidade e salvaguardas**, constituindo fundamento idôneo sob a égide do **Artigo 7º, IX da Lei nº 13.709/2018 (LGPD)**.
