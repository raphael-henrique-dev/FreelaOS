import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Github, Linkedin, Sparkles, Zap, Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · FreelaOS" }] }),
  component: ConfigPage,
});

const defaultIntegrations = [
  { id: "99freelas", name: "99Freelas", desc: "Sincronize propostas e mensagens", enabled: false, ignoreExclusive: true },
  { id: "workana", name: "Workana", desc: "Coleta automática de projetos", enabled: false },
  { id: "github", name: "GitHub", desc: "Vincule portfólio e repositórios", enabled: false },
  { id: "linkedin", name: "LinkedIn", desc: "Sync de experiência profissional", enabled: false },
  { id: "openai", name: "OpenAI", desc: "Motor padrão dos agentes", enabled: false },
  { id: "claude", name: "Claude", desc: "Motor alternativo para propostas longas", enabled: false },
  { id: "gemini", name: "Google Gemini", desc: "Análise multimodal de briefings", enabled: false },
];

const availableModels = [
  { id: "padrao", name: "Padrão", desc: "Tom equilibrado com estrutura: intro, entendimento, plano e valor." },
  { id: "consultivo", name: "Consultivo", desc: "Foco em perguntas estratégicas e sugestões de melhoria." },
  { id: "direto", name: "Direto ao ponto", desc: "Texto curto, objetivo, focando no preço e prazo." },
  { id: "personalizado", name: "Personalizado", desc: "Crie seu próprio modelo de proposta instruindo o agente com suas regras." }
];

function ConfigPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Perfil State
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [fuso, setFuso] = useState("GMT-3");
  const [bio, setBio] = useState("");
  const [iniciais, setIniciais] = useState("");

  // Stacks & Experience
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [novaHabilidade, setNovaHabilidade] = useState("");
  const [senioridade, setSenioridade] = useState("");

  // Configurações
  const [integracoes, setIntegracoes] = useState(defaultIntegrations);
  const [modeloAtivo, setModeloAtivo] = useState("padrao");
  const [promptPersonalizado, setPromptPersonalizado] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        setEmail(user.email || "");

        // Carrega Perfil
        const { data: perfil } = await supabase
          .from("perfis")
          .select("*")
          .eq("id", user.id)
          .single();

        if (perfil) {
          setNome(perfil.nome || "");
          setCidade(perfil.cidade || "");
          setFuso(perfil.fuso_horario || "GMT-3");
          setBio(perfil.bio || "");
          setHabilidades(perfil.habilidades || []);
          setSenioridade(perfil.senioridade || "Pleno");

          const parts = (perfil.nome || "Usuário").split(" ").filter(Boolean);
          if (parts.length > 1) {
            setIniciais((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
          } else if (parts.length === 1) {
            setIniciais(parts[0].substring(0, 2).toUpperCase());
          }
        }

        // Carrega Configuracoes
        const { data: config } = await supabase
          .from("configuracoes_usuario")
          .select("*")
          .eq("perfil_id", user.id)
          .single();

        if (config) {
          if (config.integracoes) {
            setIntegracoes(prev => prev.map(int => {
              const val = config.integracoes[int.id];
              if (typeof val === 'boolean') {
                return { ...int, enabled: val };
              } else if (val && typeof val === 'object') {
                return { ...int, enabled: val.enabled, ignoreExclusive: val.ignoreExclusive ?? true };
              }
              return int;
            }));
          }
          if (config.modelos_proposta) {
            if (Array.isArray(config.modelos_proposta)) {
              setModeloAtivo("padrao");
            } else {
              setModeloAtivo(config.modelos_proposta.ativo || "padrao");
              setPromptPersonalizado(config.modelos_proposta.personalizado_prompt || "");
            }
          }
        } else {
          // Se não existir, insere default
          const defaultIntJson = defaultIntegrations.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.enabled }), {});
          await supabase.from("configuracoes_usuario").insert({
            perfil_id: user.id,
            integracoes: defaultIntJson,
            modelos_proposta: { ativo: "padrao", personalizado_prompt: "" }
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações", error);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // Salva Perfil
      const { error: perfilError } = await supabase
        .from("perfis")
        .update({
          nome,
          cidade,
          fuso_horario: fuso,
          bio,
          habilidades,
          senioridade
        })
        .eq("id", userId);

      if (perfilError) throw perfilError;

      // Salva Configurações
      const integracoesJson = integracoes.reduce((acc, curr) => ({ ...acc, [curr.id]: { enabled: curr.enabled, ignoreExclusive: curr.ignoreExclusive } }), {});
      
      const { error: configError } = await supabase
        .from("configuracoes_usuario")
        .update({
          integracoes: integracoesJson,
          modelos_proposta: { ativo: modeloAtivo, personalizado_prompt: promptPersonalizado }
        })
        .eq("perfil_id", userId);

      if (configError) throw configError;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
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

  if (loadingData) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

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
                  <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-3">
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
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}