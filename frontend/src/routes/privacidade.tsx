import { createFileRoute, Link } from '@tanstack/react-router'
import { Shield, ArrowLeft, Lock, Database, Bot, FileText, UserCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/privacidade')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Glows de Fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Barra de Navegação Superior */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-foreground">Freela<span className="text-primary font-extrabold">OS</span></span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Acesso
            </Button>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10 space-y-10">
        {/* Cabeçalho */}
        <div className="space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Shield className="h-3.5 w-3.5" /> Conformidade com a LGPD (Lei Federal nº 13.709/2018)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-sm text-muted-foreground">
            Versão vigente: <strong>v1.0</strong> · Última atualização: 13 de outubro de 2026
          </p>
        </div>

        {/* Artigos da Política */}
        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
          
          {/* Seção 1 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <Database className="h-4 w-4 text-primary" />
              <h2>1. Visão Geral e Controlador dos Dados</h2>
            </div>
            <p>
              O <strong>FreelaOS</strong> ("Nós", "Plataforma") é um sistema operacional baseado em Inteligência Artificial 
              desenvolvido para automatizar a curadoria de vagas, análise de compatibilidade e redação de propostas para freelancers independentes.
            </p>
            <p>
              Esta Política esclarece de forma transparente, clara e acessível como tratamos os dados pessoais de nossos usuários ("Titulares") 
              e de terceiros relacionados, em observância estrita aos princípios da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <UserCheck className="h-4 w-4 text-primary" />
              <h2>2. Dados Pessoais Coletados e Finalidades</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Dados Cadastrais e de Acesso:</strong> Nome completo, endereço de e-mail e identificadores de autenticação (OAuth via GitHub e Google).
                <em> Finalidade:</em> Criação de conta, autenticação segura e comunicação de alertas da plataforma. 
                <em> Base Legal:</em> Execução de Contrato (Art. 7º, V da LGPD).
              </li>
              <li>
                <strong className="text-foreground">Perfil Profissional:</strong> Habilidades técnicas, senioridade, pretensão de valor hora/projeto, biografia e resumo de portfólio.
                <em> Finalidade:</em> Calibrar os agentes de inteligência artificial (Scout, Analista e Redator) para calcular scores de compatibilidade de vagas.
                <em> Base Legal:</em> Execução de Contrato e Consentimento Específico (Art. 7º, I e V).
              </li>
              <li>
                <strong className="text-foreground">Credenciais e Sessões de Plataformas Terceiras:</strong> Cookies de sessão armazenados localmente no ambiente do usuário ou importados de forma criptografada para interação com 99Freelas e Workana.
                <em> Finalidade:</em> Automatizar o envio de propostas e monitoramento de mensagens previamente autorizado pelo freelancer.
                <em> Base Legal:</em> Consentimento do Titular.
              </li>
              <li>
                <strong className="text-foreground">Dados de Oportunidades e Terceiros (Clientes):</strong> Títulos, descrições públicas de vagas e nomes públicos de proponentes de serviços extraídos de plataformas de freelancing.
                <em> Finalidade:</em> Análise de compatibilidade de trabalho para o usuário contratante do FreelaOS.
                <em> Base Legal:</em> Legítimo Interesse (Art. 7º, IX da LGPD), mediante teste de balanceamento e aplicação de rotinas de sanitização prévia.
              </li>
              <li>
                <strong className="text-foreground">Logs de Atividades dos Agentes:</strong> Histórico de ações tomadas pelo Scout, Analista, Redator e Sender.
                <em> Finalidade:</em> Transparência, auditabilidade e rastreabilidade para o próprio usuário na Dynamic Island e histórico de execução.
              </li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <Bot className="h-4 w-4 text-primary" />
              <h2>3. Tratamento por Inteligência Artificial e Transferência Internacional</h2>
            </div>
            <p>
              Para prestar os serviços de qualificação de projetos e geração de propostas, o FreelaOS integra operadores de tecnologia de ponta 
              como Google Cloud (Gemini), OpenAI, Groq, OpenRouter e Supabase (Infraestrutura e Banco de Dados).
            </p>
            <p>
              <strong className="text-foreground">Minimização e Sanitização de PII:</strong> Antes de qualquer transmissão de texto bruto de vagas ou briefings para modelos de IA, aplicamos rotinas automatizadas de sanitização de dados que ofuscam números de telefone, e-mails, documentos de identificação pessoal e links de contato direto de terceiros, garantindo o princípio da necessidade (Art. 6º, III).
            </p>
            <p>
              Os servidores de processamento das LLMs podem estar localizados fora do território brasileiro (notadamente nos Estados Unidos), configurando Transferência Internacional de Dados (Art. 33 da LGPD), resguardada por termos de conformidade e compromisso de não utilização dos dados para treinamento público dos modelos pelos operadores.
            </p>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <Lock className="h-4 w-4 text-primary" />
              <h2>4. Retenção e Segurança dos Dados</h2>
            </div>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acessos não autorizados, perdas ou alterações ilícitas. 
              As comunicações são criptografadas via protocolo HTTPS/TLS e as credenciais de banco são protegidas com Row Level Security (RLS).
            </p>
            <p>
              <strong className="text-foreground">Política de Retenção:</strong> Registros de atividade de agentes são mantidos por até 90 dias, sendo periodicamente expurgados de forma automatizada. Dados cadastrais e oportunidades permanecem enquanto a conta do titular estiver ativa ou até solicitação de eliminação.
            </p>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <FileText className="h-4 w-4 text-primary" />
              <h2>5. Seus Direitos como Titular (Artigo 18 da LGPD)</h2>
            </div>
            <p>
              Você possui total controle sobre seus dados pessoais no FreelaOS. Através da aba <strong>Configurações</strong> da plataforma, você pode exercer diretamente:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Confirmação e Acesso:</strong> Visualizar todos os dados mantidos sobre você.</li>
              <li><strong>Correção:</strong> Alterar informações incompletas, inexatas ou desatualizadas no seu perfil.</li>
              <li><strong>Portabilidade (Exportação):</strong> Baixar um arquivo estruturado em formato JSON contendo a totalidade dos seus dados cadastrais, oportunidades, clientes e histórico.</li>
              <li><strong>Eliminação Definitiva (Direito ao Esquecimento):</strong> Solicitar a exclusão irreversível de sua conta e a destruição completa de seus dados em nossos bancos e discos de sessão.</li>
              <li><strong>Revogação do Consentimento:</strong> Desconectar integrações ou encerrar o uso dos agentes a qualquer momento.</li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <Shield className="h-4 w-4 text-primary" />
              <h2>6. Contato do Encarregado de Proteção de Dados (DPO)</h2>
            </div>
            <p>
              Para esclarecer dúvidas sobre esta Política, solicitar esclarecimentos adicionais ou fazer requerimentos relativos à privacidade, entre em contato diretamente com o nosso Encarregado pelo e-mail:
            </p>
            <p className="font-mono text-xs bg-background/60 p-3 rounded-lg border border-border/40 inline-block text-primary">
              privacidade@freelaos.app
            </p>
          </section>

        </div>

        {/* Rodapé da Página */}
        <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 FreelaOS. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="hover:text-foreground transition-colors underline">Termos de Uso</Link>
            <Link to="/login" className="hover:text-foreground transition-colors underline">Acessar Conta</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
