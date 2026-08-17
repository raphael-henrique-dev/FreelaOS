import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Bot,
  BrainCircuit,
  Compass,
  FileText,
  Send,
  CheckCircle2,
  Zap,
  ArrowLeft
} from 'lucide-react'
import iconeFreela from "../../assets/icon.png"

export const Route = createFileRoute('/login')({
  component: Login,
})

type AuthMode = 'login' | 'register' | 'forgot_password'

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function Login() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [ageAccepted, setAgeAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Redireciona usuário já logado ou que retornou de OAuth
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('perfis')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          navigate({ to: '/onboarding' })
        } else {
          navigate({ to: '/' })
        }
      }
    }
    checkSession()
  }, [navigate])

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setOauthLoading(provider)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || `Erro ao conectar com ${provider}`)
      setOauthLoading(null)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Informe seu e-mail para receber as instruções de recuperação.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
      toast.success('Link de recuperação enviado! Verifique sua caixa de entrada.')
      setMode('login')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar e-mail de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (mode === 'register') {
      if (!termsAccepted || !ageAccepted) {
        toast.error('Você precisa aceitar os termos e confirmar sua idade.')
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        })
        if (error) throw error
        if (data.session) {
          toast.success('Bem-vindo ao FreelaOS! Finalize a criação da sua conta.')
          navigate({ to: '/onboarding' })
        } else if (data.user) {
          toast.success('Conta criada! Por favor, verifique seu e-mail.')
          setIsConfirmingEmail(true)
        }
      } catch (error: any) {
        toast.error(error.message || 'Erro ao criar conta')
      } finally {
        setLoading(false)
      }
    } else {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success('Login realizado com sucesso!')

        const { data: profile } = await supabase
          .from('perfis')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!profile) {
          navigate({ to: '/onboarding' })
        } else {
          navigate({ to: '/' })
        }
      } catch (error: any) {
        toast.error(error.message || 'Erro ao fazer login')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-6 lg:p-12 overflow-hidden">
      {/* Background Decorativo Glows */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-primary/10 blur-[160px] rounded-full pointer-events-none" />

      {/* Grid Pattern Subtil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Container Principal Split Screen */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LADO ESQUERDO: Showcase Visual dos Agentes (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-2xl border border-border/40 bg-card/20 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Luz de destaque interno */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Topo do Showcase */}
          <div className="space-y-3 relative z-10">
            <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
              Sua equipe autônoma de prospecção.
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O FreelaOS opera 24/7 varrendo plataformas, calculando compatibilidade e redigindo propostas de alto impacto para você fechar mais projetos com menos esforço.
            </p>
          </div>

          {/* Grid de Cards dos 4 Agentes */}
          <div className="space-y-3 my-6 relative z-10">
            
            {/* Agente 1: Scout */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border/40 bg-background/40 backdrop-blur-md transition-all hover:border-border hover:bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Compass className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Scout IA</p>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">Varredura </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Extrai requisitos, orçamentos e termos técnicos em tempo real.</p>
              </div>
            </div>

            {/* Agente 2: Analista */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border/40 bg-background/40 backdrop-blur-md transition-all hover:border-border hover:bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Analista IA</p>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Score Fit 0-100</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Recomenda apenas o que for aderente ao seu perfil.</p>
              </div>
            </div>

            {/* Agente 3: Redator */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border/40 bg-background/40 backdrop-blur-md transition-all hover:border-border hover:bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Redator IA</p>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Copy Persuasiva</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Gera propostas comerciais altamente personalizadas.</p>
              </div>
            </div>

            {/* Agente 4: Sender */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border/40 bg-background/40 backdrop-blur-md transition-all hover:border-border hover:bg-background/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Send className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Sender RPA</p>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Envio Automático</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Envia a proposta automaticamente ao cliente direto da plataforma.</p>
              </div>
            </div>

          </div>

          {/* Rodapé do Showcase com Live Badge */}
          <div className="pt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground relative z-10">
            <div className="flex items-center gap-2">
            </div>
            <span className="text-[11px] text-muted-foreground">Tecnologia Multi-LLM</span>
          </div>

        </div>

        {/* LADO DIREITO: Card de Autenticação */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="w-full rounded-2xl border border-border/50 bg-card/40 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300">
            
            {/* Header da Marca */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <img src={iconeFreela} alt="FreelaOS Icon" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center">
                  Freela<span className="text-primary font-extrabold">OS</span>
                </h1>
                <p className="text-xs text-muted-foreground">Sistema Operacional para Freelancers</p>
              </div>
            </div>

            {isConfirmingEmail ? (
              <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300 py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-8 ring-primary/5">
                  <Mail size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Confirme seu e-mail</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enviamos um link de confirmação para <br />
                    <span className="font-semibold text-foreground">{email}</span>.
                  </p>
                  <p className="text-xs text-muted-foreground/80 pt-2">
                    Clique no link enviado para ativar sua conta e desbloquear sua equipe de agentes autônomos.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setIsConfirmingEmail(false)
                    setMode('login')
                    setPassword('')
                  }}
                  className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20"
                >
                  Voltar para o Login
                </Button>
              </div>
            ) : mode === 'forgot_password' ? (
              <form onSubmit={handleForgotPassword} className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Recuperação de Senha</h2>
                  <p className="text-xs text-muted-foreground">
                    Digite seu e-mail cadastrado para receber o link de redefinição.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/40 pl-10 h-11 border-border/60 focus-visible:ring-primary/40 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/20"
                  >
                    {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => setMode('login')}
                    className="w-full h-10 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar para o Login
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                {/* Abas Alternadoras Entrar / Cadastrar */}
                <div className="grid grid-cols-2 p-1 bg-background/50 rounded-xl border border-border/40 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`py-2 rounded-lg transition-all ${
                      mode === 'login'
                        ? 'bg-card text-foreground font-semibold shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`py-2 rounded-lg transition-all ${
                      mode === 'register'
                        ? 'bg-card text-foreground font-semibold shadow-sm border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Criar Conta
                  </button>
                </div>

                {/* Botões de OAuth (Google e GitHub) */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || oauthLoading !== null}
                    onClick={() => handleOAuthLogin('google')}
                    className="h-11 bg-background/30 border-border/60 hover:bg-muted/40 hover:border-border text-xs font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <GoogleIcon />
                    <span>{oauthLoading === 'google' ? 'Conectando...' : 'Google'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || oauthLoading !== null}
                    onClick={() => handleOAuthLogin('github')}
                    className="h-11 bg-background/30 border-border/60 hover:bg-muted/40 hover:border-border text-xs font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <GithubIcon />
                    <span>{oauthLoading === 'github' ? 'Conectando...' : 'GitHub'}</span>
                  </Button>
                </div>

                {/* Divisor */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <span className="relative bg-card/60 px-3 text-[11px] uppercase tracking-wider text-muted-foreground/80 backdrop-blur-sm rounded-full">
                    ou continue com e-mail
                  </span>
                </div>

                {/* Formulário Principal */}
                <form className="space-y-3.5" onSubmit={handleSubmit}>
                  {mode === 'register' && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Seu nome completo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="bg-background/40 pl-10 h-11 border-border/60 focus-visible:ring-primary/40 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background/40 pl-10 h-11 border-border/60 focus-visible:ring-primary/40 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Senha</label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background/40 pl-10 pr-10 h-11 border-border/60 focus-visible:ring-primary/40 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot_password')}
                          className="text-[11px] text-primary hover:underline transition-colors">
                          Esqueceu a senha?
                        </button>
                      )}
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-2.5 pt-1 pb-1 animate-in fade-in duration-200 text-xs">
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-border/60 bg-background/50 accent-primary cursor-pointer"
                        />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                          Aceito os termos de uso e política de privacidade.
                        </span>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          checked={ageAccepted}
                          onChange={(e) => setAgeAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-border/60 bg-background/50 accent-primary cursor-pointer"
                        />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                          Confirmo que tenho 18 anos ou mais.
                        </span>
                      </label>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || oauthLoading !== null}
                    className="w-full h-11 text-sm font-semibold mt-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01]"
                  >
                    {loading ? (
                      'Processando...'
                    ) : mode === 'register' ? (
                      <span className="flex items-center gap-2">
                        Criar Conta Gratuita <ArrowRight className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Acessar Plataforma <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
