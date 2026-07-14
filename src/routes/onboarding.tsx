import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { User } from '@supabase/supabase-js'

export const Route = createFileRoute('/onboarding')({
  component: Onboarding,
})

function Onboarding() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [habilidades, setHabilidades] = useState('')
  const [idiomas, setIdiomas] = useState('')
  const [senioridade, setSenioridade] = useState('Pleno')
  const [moedaBase, setMoedaBase] = useState('BRL')
  const [valorHora, setValorHora] = useState('')
  const [valorProjeto, setValorProjeto] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        if (user.user_metadata?.full_name) {
          // O nome já está salvo no Supabase Auth, não precisamos mais do estado local
        }
      } else {
        navigate({ to: '/login' })
      }
    })
  }, [navigate])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    
    // Converte string separada por virgulas em Array limpando espaços
    const skillsArray = habilidades.split(',').map(s => s.trim()).filter(Boolean)
    const languagesArray = idiomas.split(',').map(s => s.trim()).filter(Boolean)

    try {
      const { error } = await supabase.from('perfis').insert({
        id: user.id,
        nome: user.user_metadata?.full_name || 'Usuário',
        habilidades: skillsArray,
        idiomas: languagesArray,
        senioridade,
        valor_hora_minimo: Number(valorHora) || 0,
        valor_projeto_minimo: Number(valorProjeto) || 0,
        moeda_base: moedaBase
      })

      if (error) throw error

      toast.success('Perfil configurado! A Inteligência Artificial já te conhece.')
      navigate({ to: '/' }) // Redireciona para o Dashboard
      
    } catch (error: any) {
      toast.error('Erro ao salvar o perfil: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-border/50 bg-card/60 p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Configure seu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            A IA vai usar essas informações para analisar as vagas e te dar o melhor Score possível.
          </p>
        </div>

        <form className="space-y-5 mt-6" onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Suas Habilidades</label>
              <Input
                required
                value={habilidades}
                onChange={e => setHabilidades(e.target.value)}
                placeholder="Ex: React, Node, Python"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Idiomas</label>
              <Input
                required
                value={idiomas}
                onChange={e => setIdiomas(e.target.value)}
                placeholder="Ex: Português, Inglês"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Moeda Base</label>
              <select 
                value={moedaBase} 
                onChange={e => setMoedaBase(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="BRL">BRL (Real Brasileiro)</option>
                <option value="USD">USD (Dólar Americano)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Senioridade</label>
              <select 
                value={senioridade} 
                onChange={e => setSenioridade(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Júnior">Júnior</option>
                <option value="Pleno">Pleno</option>
                <option value="Sênior">Sênior</option>
                <option value="Especialista">Especialista</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Valor Mínimo / Hora ({moedaBase})</label>
              <Input
                type="number"
                required
                value={valorHora}
                onChange={e => setValorHora(e.target.value)}
                placeholder="Ex: 50"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Valor Mínimo p/ Projetos Fechados ({moedaBase})</label>
            <Input
              type="number"
              required
              value={valorProjeto}
              onChange={e => setValorProjeto(e.target.value)}
              placeholder="Ex: 1000"
              className="bg-background/50"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 text-base mt-4">
            {loading ? 'Salvando...' : 'Finalizar Configuração'}
          </Button>
        </form>
      </div>
    </div>
  )
}
