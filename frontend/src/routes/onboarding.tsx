import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { User } from '@supabase/supabase-js'

export const Route = createFileRoute('/onboarding')({
  component: Onboarding,
})

function Onboarding() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [habilidades, setHabilidades] = useState<string[]>([])
  const [novaHabilidade, setNovaHabilidade] = useState('')
  const [idiomas, setIdiomas] = useState<{idioma: string, nivel: string}[]>([])
  const [senioridade, setSenioridade] = useState('Pleno')
  const [areaAtuacao, setAreaAtuacao] = useState('Desenvolvimento e TI')
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

  const addHabilidade = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (novaHabilidade.trim() && !habilidades.includes(novaHabilidade.trim())) {
        setHabilidades([...habilidades, novaHabilidade.trim().charAt(0).toUpperCase() + novaHabilidade.trim().slice(1)])
        setNovaHabilidade('')
      }
    }
  }

  const removeHabilidade = (hab: string) => {
    setHabilidades(habilidades.filter(h => h !== hab))
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const { error } = await supabase.from('perfis').insert({
        id: user.id,
        nome: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name || 'Usuário',
        habilidades: habilidades,
        idiomas: idiomas,
        senioridade,
        area_atuacao: areaAtuacao,
        valor_hora_minimo: Number(valorHora) || 0,
        valor_projeto_minimo: Number(valorProjeto) || 0,
        moeda_base: moedaBase
      })

      if (error) throw error

      toast.success('Conta criada. Bem-vindo/a ao FreelaOS! ')
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
            A IA vai usar essas informações para analisar as oportunidades encontradas e te direcionar ao melhor match possível.
          </p>
        </div>

        <form className="space-y-5 mt-6" onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Suas Habilidades</label>
              {habilidades.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {habilidades.map((s) => (
                    <Badge 
                      key={s} 
                      variant="outline" 
                      className="border-border/60 bg-background/40 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors group"
                      onClick={() => removeHabilidade(s)}
                      title="Clique para remover"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                value={novaHabilidade}
                onChange={e => setNovaHabilidade(e.target.value)}
                onKeyDown={addHabilidade}
                placeholder="Digite uma stack e aperte Enter..."
                className="bg-background/50"
              />
            </div>
            <div className="space-y-0">
              <label className="text-sm font-medium text-foreground">Idiomas</label>
              <div className="mt-0 space-y-0">
                {idiomas.map((idioma, idx) => (
                  <div key={idx} className="flex gap-0 items-center">
                    <Input 
                      value={idioma.idioma} 
                      onChange={e => {
                        const newIdiomas = [...idiomas];
                        newIdiomas[idx].idioma = e.target.value;
                        setIdiomas(newIdiomas);
                      }} 
                      placeholder="Ex: Inglês" 
                      className="border-border/50 bg-background/40" 
                    />
                    <select 
                      value={idioma.nivel} 
                      onChange={e => {
                        const newIdiomas = [...idiomas];
                        newIdiomas[idx].nivel = e.target.value;
                        setIdiomas(newIdiomas);
                      }}
                      className="flex h-10 rounded-md border border-input bg-background/40 px-2 py-2 text-sm ring-offset-background"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                      <option value="Fluente">Fluente</option>
                      <option value="Nativo">Nativo</option>
                    </select>
                    <Button variant="ghost" size="icon" type="button" onClick={() => setIdiomas(idiomas.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" type="button" onClick={() => setIdiomas([...idiomas, { idioma: "", nivel: "Básico" }])} className="mt-2 text-xs">
                + Adicionar Idioma
              </Button>
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
              <label className="text-sm font-medium text-foreground">Área de Atuação</label>
              <select 
                value={areaAtuacao} 
                onChange={e => setAreaAtuacao(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Desenvolvimento e TI">Desenvolvimento e TI</option>
                <option value="Design e Multimedia">Design e Multimedia</option>
                <option value="Escrita e Tradução">Escrita e Tradução</option>
                <option value="Marketing e Vendas">Marketing e Vendas</option>
                <option value="Suporte Administrativo">Suporte Administrativo</option>
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
