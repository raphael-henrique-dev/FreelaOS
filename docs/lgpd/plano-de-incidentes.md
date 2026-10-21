# Plano de Resposta a Incidentes de Segurança com Dados Pessoais
**FreelaOS — Sistema Operacional para Freelancers**  
*Documento de Governança e Segurança da Informação — Artigo 48 da Lei nº 13.709/2018 (LGPD)*  
*Versão: 1.0 — Data de Elaboração: 13 de outubro de 2026*

---

## 1. Objetivo e Escopo

Este plano estabelece os procedimentos e diretrizes para identificação, contenção, investigação, mitigação e comunicação de quaisquer incidentes de segurança da informação que possam acarretar risco ou dano relevante aos titulares de dados pessoais tratados pelo **FreelaOS**.

---

## 2. Definição de Incidente de Segurança com Dados Pessoais

Considera-se incidente de segurança qualquer evento adverso, confirmado ou sob suspeita razoável, que resulte em:
- Acesso não autorizado a dados pessoais (ex: quebra de isolamento multitenant, vazamento de credenciais).
- Destruição, perda, alteração ou divulgação acidental ou ilícita de dados de titulares.
- Comprometimento de integridade ou confidencialidade dos arquivos de sessão do navegador ou chaves de API.

---

## 3. Matriz de Severidade

| Nível de Severidade | Critérios de Classificação | Ação Imediata |
| :---: | :--- | :--- |
| **Baixa** | Tentativa isolada e mal sucedida de ataque; incidente que não envolveu dados pessoais de titulares; incidente contido localmente sem exposição. | Registro em log interno de segurança e correção no ciclo padrão de manutenção. |
| **Média** | Vazamento de dados cadastrais não sensíveis de número reduzido de titulares, sem exposição de credenciais ou senhas; indisponibilidade temporária de serviço sem perda de dados. | Convocação do Time de Resposta em até 4 horas. Correção prioritária e avaliação de impacto aos titulares. |
| **Alta / Crítica** | Vazamento de credenciais de plataformas de terceiros, chaves privadas, sessões ativas do Playwright ou quebra sistêmica de RLS com exposição de dados de múltiplos titulares. | Convocação imediata (tempo de resposta < 1h). Desconexão emergencial de contêineres afetados, rotação de chaves e avaliação de comunicação à ANPD. |

---

## 4. Fases de Resposta ao Incidente

```
[1. Detecção] ➔ [2. Contenção] ➔ [3. Investigação & Análise] ➔ [4. Comunicação] ➔ [5. Lições Aprendidas]
```

### Fase 1: Detecção e Notificação Interna
* **Canais de alerta:** Logs do FastAPI, monitoramento de saúde do Docker, métricas de taxa de erro no Supabase, relatórios de vulnerabilidade ou reporte de usuários.
* Qualquer membro do time técnico que identificar indício de incidente deve acionar imediatamente o Encarregado de Dados (DPO) pelo canal prioritário de segurança.

### Fase 2: Contenção Imediata
* Isolar os contêineres Docker ou processos afetados.
* Revogar imediatamente tokens de sessão comprometidos (`supabase.auth.admin.signOut` ou expurgo de cookies em disco).
* Se necessário, ativar modo de manutenção temporário na API para impedir tráfego malicioso adicional.

### Fase 3: Investigação e Avaliação de Danos
* Identificar a causa raiz (ex: vulnerabilidade de software, falha de RLS, injeção de prompt em textos raspados de vagas).
* Levantar os titulares específicos impactados e a volumetria de dados expostos.
* Avaliar se houve risco a direitos e liberdades dos titulares.

### Fase 4: Comunicação (Artigo 48 da LGPD)
* **Comunicação à ANPD (Autoridade Nacional de Proteção de Dados):**
  - Nos casos em que o incidente possa acarretar risco ou dano relevante aos titulares, a comunicação será realizada em prazo razoável (conforme regulamentação da ANPD), contendo:
    1. Descrição da natureza dos dados pessoais afetados.
    2. Informações sobre os titulares envolvidos.
    3. Indicação das medidas técnicas e de segurança utilizadas.
    4. Riscos relacionados ao incidente.
    5. Medidas tomadas ou que serão tomadas para reverter ou mitigar os efeitos do prejuízo.
* **Comunicação aos Titulares Afetados:**
  - Envio de comunicado direto e claro via e-mail cadastrado, orientando os titulares sobre eventuais medidas que devam adotar (ex: alteração de senhas nos portais integrados).

### Fase 5: Lições Aprendidas e Aprimoramento
* Registro formal do incidente no Relatório de Pós-Incidente.
* Implementação de testes automatizados adicionais para prevenir regressões.
* Atualização deste plano e dos controles arquiteturais correspondentes.

---

## 5. Contatos de Emergência do Comitê de Privacidade

* **Encarregado pelo Tratamento de Dados (DPO):** `dpo@freelaos.com.br`
* **Líder Técnico de Segurança:** `seguranca@freelaos.com.br`
* **Canal para Titulares:** `privacidade@freelaos.com.br`
