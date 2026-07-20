import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Github, Linkedin, Sparkles, Zap, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/core/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/page-header";

import { useConfiguracoesData, useSaveConfiguracoes, defaultIntegrations } from "@/queries/configuracoes";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · FreelaOS" }] }),
  component: ConfigPageWrapper,
});

const availableModels = [
  { id: "padrao", name: "Padrão", desc: "Tom equilibrado com estrutura: intro, entendimento, plano e valor." },
  { id: "consultivo", name: "Consultivo", desc: "Foco em perguntas estratégicas e sugestões de melhoria." },
  { id: "direto", name: "Direto ao ponto", desc: "Texto curto, objetivo, focando no preço e prazo." },
  { id: "personalizado", name: "Personalizado", desc: "Crie seu próprio modelo de proposta instruindo o agente com suas regras." }
];

function ConfigPageWrapper() {
  const { data, isLoading, error } = useConfiguracoesData();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center text-destructive">
          Erro ao carregar configurações. {(error as Error)?.message}
        </div>
      </PageContainer>
    );
  }

  return <ConfigPage initialData={data} />;
}

function ConfigPage({ initialData }: { initialData: any }) {
  const { mutateAsync: saveConfig, isPending: saving } = useSaveConfiguracoes();

  const userId = initialData.user.id;
  
  // Parse initial data
  const perfil = initialData.perfil || {};
  const config = initialData.config || {};

  // Perfil State
  const [nome, setNome] = useState(perfil.nome || "");
  const [email] = useState(initialData.user.email || "");
  const [cidade, setCidade] = useState(perfil.cidade || "");
  const [fuso, setFuso] = useState(perfil.fuso_horario || "GMT-3");
  const [bio, setBio] = useState(perfil.bio || "");
  
  const parts = (perfil.nome || "Usuário").split(" ").filter(Boolean);
  const defaultIniciais = parts.length > 1 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0]?.substring(0, 2).toUpperCase() || "US";
  const [iniciais] = useState(defaultIniciais);

  // Stacks & Experience
  const [habilidades, setHabilidades] = useState<string[]>(perfil.habilidades || []);
  const [novaHabilidade, setNovaHabilidade] = useState("");
  const [senioridade, setSenioridade] = useState(perfil.senioridade || "Pleno");

  // Pricing & Languages
  const [idiomas, setIdiomas] = useState<{idioma: string, nivel: string}[]>(perfil.idiomas || []);
  const [valorHora, setValorHora] = useState<number>(perfil.valor_hora_minimo || 0);
  const [valorProjeto, setValorProjeto] = useState<number>(perfil.valor_projeto_minimo || 0);
  const [moedaBase, setMoedaBase] = useState(perfil.moeda_base || "BRL");

  // Configurações
  const initialIntegrations = defaultIntegrations.map(int => {
    if (config.integracoes) {
      const val = config.integracoes[int.id];
      if (typeof val === 'boolean') {
        return { ...int, enabled: val };
      } else if (val && typeof val === 'object') {
        return { ...int, enabled: val.enabled, ignoreExclusive: val.ignoreExclusive ?? true };
      }
    }
    return int;
  });

  const [integracoes, setIntegracoes] = useState(initialIntegrations);
  
  const [modeloAtivo, setModeloAtivo] = useState(Array.isArray(config.modelos_proposta) ? "padrao" : (config.modelos_proposta?.ativo || "padrao"));
  const [promptPersonalizado, setPromptPersonalizado] = useState(config.modelos_proposta?.personalizado_prompt || "");
  const [limiteAutomacao, setLimiteAutomacao] = useState(config.modelos_proposta?.limite_automacao ?? 70);
  const [automacaoAtivada, setAutomacaoAtivada] = useState(config.modelos_proposta?.automacao_ativada ?? true);
  const [revisaoHumana, setRevisaoHumana] = useState(config.revisao_humana_obrigatoria ?? true);

  const [connecting99, setConnecting99] = useState(false);
  const [isConnected99, setIsConnected99] = useState(initialData.isConnected99);

  const handleSave = async () => {
    const integracoesJson = integracoes.reduce((acc, curr) => ({ ...acc, [curr.id]: { enabled: curr.enabled, ignoreExclusive: curr.ignoreExclusive } }), {});
    
    await saveConfig({
      userId,
      perfilPayload: {
        nome, cidade, fuso_horario: fuso, bio, habilidades, senioridade, idiomas,
        valor_hora_minimo: valorHora, valor_projeto_minimo: valorProjeto, moeda_base: moedaBase
      },
      configPayload: {
        integracoes: integracoesJson,
        modelos_proposta: { ativo: modeloAtivo, personalizado_prompt: promptPersonalizado, limite_automacao: limiteAutomacao, automacao_ativada: automacaoAtivada },
        revisao_humana_obrigatoria: revisaoHumana
      }
    });
  };

  const addHabilidade = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && novaHabilidade.trim()) {
      e.preventDefault();
      if (!habilidades.includes(novaHabilidade.trim())) {
        setHabilidades([...habilidades, novaHabilidade.trim().charAt(0).toUpperCase() + novaHabilidade.trim().slice(1)]);
      }
      setNovaHabilidade("");
    }
  };

  const removeHabilidade = (hab: string) => {
    setHabilidades(habilidades.filter(h => h !== hab));
  };

  function toggleIntegration(id: string, checked: boolean) {
    setIntegracoes(prev => prev.map(int => int.id === id ? { ...int, enabled: checked } : int));
  }

  function toggleIgnoreExclusive(id: string, checked: boolean) {
    setIntegracoes(prev => prev.map(int => int.id === id ? { ...int, ignoreExclusive: checked } : int));
  };

  const handleConnect99Freelas = async () => {
    setConnecting99(true);
    toast.info("Abrindo navegador... Faça o login na janela que aparecerá.", { duration: 8000 });
    
    try {
      const res = await api.post("/api/auth/99freelas", { user_id: userId });
      if (res.data && res.data.status === "success") {
        toast.success(res.data.message);
        setIsConnected99(true);
      } else {
        toast.error(res.data?.message || "Erro desconhecido ao conectar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Falha de conexão com a API.");
    } finally {
      setConnecting99(false);
    }
  };

  const handleDisconnect99Freelas = async () => {
    if (!confirm("Tem certeza que deseja desconectar o 99Freelas? O bot não poderá mais enviar propostas automaticamente.")) return;
    
    try {
      const res = await api.delete("/api/auth/99freelas", { data: { user_id: userId } });
      if (res.data) {
        toast.success(res.data.message);
        setIsConnected99(false);
      } else {
        toast.error(res.data?.message || "Erro desconhecido ao desconectar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Falha de conexão com a API.");
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Configurações" 
        description="Perfil, portfólio, stacks e integrações." 
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* PERFIL */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-lg font-semibold text-primary-foreground shadow-glow">
                {iniciais}
              </div>
              <div>
                <p className="text-lg font-semibold">{nome || "Configurar Nome"}</p>
                <p className="text-sm text-muted-foreground">{senioridade} · {habilidades.length} stacks</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1 border-border/50 bg-background/40" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={email} disabled className="mt-1 border-border/50 bg-background/40 opacity-70" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cidade / Estado</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: São Paulo, SP" className="mt-1 border-border/50 bg-background/40" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fuso Horário</Label>
                <Input value={fuso} onChange={e => setFuso(e.target.value)} placeholder="Ex: GMT-3" className="mt-1 border-border/50 bg-background/40" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bio Profissional</Label>
              <Textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Conte um pouco sobre a sua experiência e seu foco de trabalho..."
                className="mt-1 min-h-[100px] border-border/50 bg-background/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* PORTFOLIO & STACKS */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Portfólio & Stacks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Tecnologias dominadas</Label>
              <div className="mt-2 flex flex-wrap gap-2">
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
              <Input 
                value={novaHabilidade}
                onChange={e => setNovaHabilidade(e.target.value)}
                onKeyDown={addHabilidade}
                placeholder="Digite uma stack e aperte Enter..." 
                className="mt-3 border-border/50 bg-background/40" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Senioridade Atual</Label>
              <select 
                value={senioridade} 
                onChange={e => setSenioridade(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Júnior">Júnior</option>
                <option value="Pleno">Pleno</option>
                <option value="Sênior">Sênior</option>
                <option value="Especialista">Especialista</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="w-full"><Github className="mr-2 h-4 w-4" /> Conectar GitHub</Button>
              <Button variant="outline" size="sm" className="w-full"><Linkedin className="mr-2 h-4 w-4" /> Conectar LinkedIn</Button>
            </div>
          </CardContent>
        </Card>

        {/* IDIOMAS & PRECIFICAÇÃO */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Precificação & Idiomas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Valor Hora Mínimo</Label>
                <Input type="number" value={valorHora} onChange={e => setValorHora(Number(e.target.value))} className="mt-1 border-border/50 bg-background/40" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor Projeto Mínimo</Label>
                <Input type="number" value={valorProjeto} onChange={e => setValorProjeto(Number(e.target.value))} className="mt-1 border-border/50 bg-background/40" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Moeda Base</Label>
                <select 
                  value={moedaBase} 
                  onChange={e => setMoedaBase(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="BRL">BRL (Real)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Idiomas</Label>
              <div className="mt-2 space-y-2">
                {idiomas.map((idioma, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
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
                      className="flex h-10 rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                      <option value="Fluente">Fluente</option>
                      <option value="Nativo">Nativo</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => setIdiomas(idiomas.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIdiomas([...idiomas, { idioma: "", nivel: "Básico" }])} className="mt-2 text-xs">
                + Adicionar Idioma
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* MODELOS DE PROPOSTA */}
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Modelos de Proposta IA</CardTitle>
            <p className="text-xs text-muted-foreground">Escolha qual template o Redator IA deve usar como base nas suas bids.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {availableModels.map((t) => {
                const isSelected = modeloAtivo === t.id;
                return (
                  <div 
                    key={t.id} 
                    onClick={() => setModeloAtivo(t.id)}
                    className={`rounded-xl border p-4 relative group transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 bg-background/40 hover:border-primary/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${isSelected ? 'text-primary' : ''}`}>{t.name}</p>
                      {isSelected ? <Sparkles className="h-4 w-4 text-primary" /> : <div className="h-4 w-4 rounded-full border border-muted-foreground/30 transition-colors group-hover:border-primary/50" />}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.desc}
                    </p>
                  </div>
                )
              })}
            </div>
            
            {modeloAtivo === "personalizado" && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs text-muted-foreground">Suas Instruções Customizadas</Label>
                <Textarea 
                  value={promptPersonalizado}
                  onChange={e => setPromptPersonalizado(e.target.value)}
                  placeholder="Escreva como você quer que a IA monte sua proposta. Ex: 'Seja sempre muito descontraído, use emojis, e nunca feche o preço sem negociar prazo...'"
                  className="mt-1 min-h-[120px] border-border/50 bg-background/40"
                />
              </div>
            )}

            <div className="pt-4 border-t border-border/50">
              <Label className="text-xs text-muted-foreground flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span>Automação do Redator IA</span>
                  <Switch 
                    checked={automacaoAtivada}
                    onCheckedChange={setAutomacaoAtivada}
                  />
                </div>
                <span className={`font-mono px-2 py-0.5 rounded text-xs transition-colors ${automacaoAtivada ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {limiteAutomacao} / 100
                </span>
              </Label>
              <p className="text-[11px] text-muted-foreground mb-3 mt-2">
                Se ativado, quando uma vaga receber um Score do Analista IA maior ou igual ao limite abaixo, o Redator IA vai rascunhar a proposta automaticamente em background.
              </p>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={limiteAutomacao} 
                onChange={(e) => setLimiteAutomacao(parseInt(e.target.value))}
                disabled={!automacaoAtivada}
                className={`w-full accent-primary ${!automacaoAtivada ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="pt-4 border-t border-border/50">
              <Label className="text-xs text-muted-foreground flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span>Revisão Humana Obrigatória (Segurança)</span>
                  <Switch 
                    checked={revisaoHumana}
                    onCheckedChange={setRevisaoHumana}
                  />
                </div>
              </Label>
              <p className="text-[11px] text-muted-foreground mb-1 mt-2 leading-relaxed">
                Se ativado, o robô final (Sender) não enviará propostas automaticamente, deixando-as como "Rascunho" para sua aprovação no Backlog. Se desativado, o Piloto Automático enviará as propostas direto para o cliente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* INTEGRACOES */}
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Integrações de Agentes e APIs</CardTitle>
            <p className="text-xs text-muted-foreground">Ative ou desative as fontes de dados do seu Sistema Operacional.</p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {integracoes.map((i) => (
              <div key={i.id} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/40 p-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">
                      <Zap className={`h-4 w-4 ${i.enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.desc}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={i.enabled} 
                    onCheckedChange={(checked) => toggleIntegration(i.id, checked)} 
                  />
                </div>
                
                {i.id === "99freelas" && i.enabled && (
                  <div className="mt-2 flex flex-col border-t border-border/50 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ignore-exclusive" className="text-xs text-muted-foreground cursor-pointer">
                        Ignorar projetos exclusivos (assinantes Premium)?
                      </Label>
                      <Switch
                        id="ignore-exclusive"
                        checked={i.ignoreExclusive}
                        onCheckedChange={(checked) => toggleIgnoreExclusive(i.id, checked)}
                        className="scale-75"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <p className="text-[12px] text-muted-foreground max-w-[200px]">
                        Conexão com a plataforma: 
                      </p>
                      {isConnected99 ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700">
                            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            Conectado
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleDisconnect99Freelas}
                            className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            Desconectar
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={handleConnect99Freelas} disabled={connecting99}>
                          {connecting99 ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                          {connecting99 ? "Aguardando login..." : "Conectar Conta"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}