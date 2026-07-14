import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Eye, EyeOff, Mail } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [ageAccepted, setAgeAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isRegistering) {
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
            data: { full_name: name }
          }
        })
        if (error) throw error
        if (data.session) {
          toast.success('Conta criada! Bem-vindo ao FreelaOS.')
          navigate({ to: '/onboarding' })
        } else if (data.user) {
          toast.success('Conta criada! Por favor, verifique seu e-mail.')
          setIsConfirmingEmail(true)
          setIsRegistering(false)
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
      
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-border/40 bg-card/30 p-8 shadow-2xl backdrop-blur-2xl relative z-10 transition-all duration-500">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">FreelaOS</h1>
          <p className="text-sm text-muted-foreground">
            {isRegistering ? 'Crie sua conta para começar' : 'Seu Assistente Pessoal Freelancer'}
          </p>
        </div>

        {isConfirmingEmail ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Mail size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Verifique seu e-mail</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para <br/>
                <span className="font-medium text-foreground">{email}</span>.
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                Clique no link enviado para ativar sua conta e liberar o seu acesso.
              </p>
            </div>
            <Button 
              type="button" 
              onClick={() => {
                setIsConfirmingEmail(false)
                setPassword('')
              }} 
              className="w-full h-11 text-base font-semibold"
            >
              Confirmei meu e-mail
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegistering && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-background/50 h-11"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 h-11"
              />
            </div>
            <div className="space-y-2 relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isRegistering && (
              <div className="space-y-3 pt-2 pb-2 animate-in fade-in duration-300">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    required 
                    checked={termsAccepted} 
                    onChange={e => setTermsAccepted(e.target.checked)} 
                    className="mt-1 w-4 h-4 rounded border-border/50 bg-background/50 accent-primary cursor-pointer transition-all" 
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                    Aceito os termos de uso e condições da plataforma.
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    required 
                    checked={ageAccepted} 
                    onChange={e => setAgeAccepted(e.target.checked)} 
                    className="mt-1 w-4 h-4 rounded border-border/50 bg-background/50 accent-primary cursor-pointer transition-all" 
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                    Confirmo que tenho 18 anos ou mais.
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02]">
                {loading ? 'Processando...' : (isRegistering ? 'Finalizar Cadastro' : 'Entrar no Sistema')}
              </Button>
              
              {!isRegistering ? (
                <div className="relative w-full group">
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={loading} 
                    onClick={() => setIsRegistering(true)}
                    className="relative w-full h-11 bg-transparent hover:bg-transparent border-border/50 transition-colors duration-300 group-hover:border-transparent group-hover:text-white"
                  >
                    Criar Nova Conta
                  </Button>
                </div>
              ) : (
                <Button 
                  type="button" 
                  variant="ghost" 
                  disabled={loading} 
                  onClick={() => setIsRegistering(false)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Voltar para o Login
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
