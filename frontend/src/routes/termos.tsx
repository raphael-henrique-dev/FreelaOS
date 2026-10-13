import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, Scale, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/termos')({
  component: TermsPage,
})

function TermsPage() {
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
            <Scale className="h-3.5 w-3.5" /> Termos de Uso e Condições Gerais
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Termos de Uso da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            Versão vigente: <strong>v1.0</strong> · Última atualização: 13 de outubro de 2026
          </p>
        </div>

        {/* Artigos dos Termos */}
        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground">
          
          {/* Seção 1 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h2>1. Aceite dos Termos e Capacidade Civil</h2>
            </div>
            <p>
              Ao criar uma conta ou utilizar a plataforma <strong>FreelaOS</strong>, você declara ter lido, compreendido e aceitado expressamente 
              estes Termos de Uso e nossa <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
            </p>
            <p>
              O uso da plataforma é restrito a pessoas físicas plenamente capazes (maiores de 18 anos) ou pessoas jurídicas regularmente constituídas, 
              que exercem atividade profissional autônoma ou prestação de serviços técnicos.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <FileText className="h-4 w-4 text-primary" />
              <h2>2. Objeto e Natureza da Ferramenta</h2>
            </div>
            <p>
              O FreelaOS é um sistema de software para gestão e prospecção comercial apoiado por agentes de inteligência artificial. 
              A plataforma atua como uma ferramenta de produtividade para auxiliar o usuário na descoberta de oportunidades, 
              avaliação de compatibilidade e rascunho de propostas comerciais.
            </p>
            <p>
              O FreelaOS <strong>não é intermediador de mão de obra</strong>, não é plataforma de pagamentos de terceiros e não possui vínculo 
              com os clientes finais ou com plataformas externas de freelancing (como 99Freelas ou Workana).
            </p>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2>3. Princípio da Supervisão Humana e Responsabilidade do Usuário</h2>
            </div>
            <p>
              <strong className="text-foreground">O usuário é o diretor absoluto da sua operação.</strong> Embora a plataforma forneça recursos 
              de geração automática de propostas por IA e automações de preenchimento, o usuário permanece integralmente responsável por:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Revisar a precisão técnica, veracidade, prazos e preços estipulados em qualquer proposta submetida a clientes.</li>
              <li>Garantir a veracidade de suas habilidades, portfólio e capacidade técnica de entrega dos projetos aceitos.</li>
              <li>Cumprir com os Termos de Serviço de qualquer plataforma terceira com a qual integre suas credenciais ou cookies de acesso.</li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2>4. Integrações de Terceiros e Credenciais</h2>
            </div>
            <p>
              Ao utilizar recursos que exigem autenticação ou injeção de cookies de plataformas terceiras (ex: 99Freelas, Workana), 
              o usuário concede autorização técnica ao robô de automação local para executar ações estritamente em seu nome.
            </p>
            <p>
              O usuário pode revogar ou desvincular tais credenciais e sessões a qualquer instante através do menu de Configurações da plataforma, 
              o que resultará na interrupção imediata de qualquer agente associado.
            </p>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <Scale className="h-4 w-4 text-primary" />
              <h2>5. Limitação de Responsabilidade</h2>
            </div>
            <p>
              A contratação de projetos freelancer depende exclusivamente da decisão dos clientes finais, da conjuntura de mercado e da qualidade da negociação conduzida pelo profissional. 
              Portanto, o FreelaOS não garante volume mínimo de propostas aceitas, faturamento ou retorno financeiro decorrente do uso da ferramenta.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3 p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-base">
              <FileText className="h-4 w-4 text-primary" />
              <h2>6. Encerramento e Cancelamento da Conta</h2>
            </div>
            <p>
              O usuário pode rescindir o presente contrato e solicitar a exclusão definitiva de sua conta e de todos os dados correspondentes 
              a qualquer momento, diretamente pela funcionalidade de "Excluir Conta" presente nas Configurações, em atendimento ao Art. 18 da LGPD.
            </p>
          </section>

        </div>

        {/* Rodapé da Página */}
        <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 FreelaOS. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacidade" className="hover:text-foreground transition-colors underline">Política de Privacidade</Link>
            <Link to="/login" className="hover:text-foreground transition-colors underline">Acessar Conta</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
