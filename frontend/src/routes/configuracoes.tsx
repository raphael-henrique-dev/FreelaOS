import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Github, 
  Linkedin, 
  Sparkles, 
  Zap, 
  Save, 
  Loader2, 
  Trash2,
  ShieldCheck,
  Download,
  AlertTriangle,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutateAsync: saveConfig, isPending: saving } = useSaveConfiguracoes();

  const userId = initialData.user.id;
  
  // Parse initial data
  const perfil = initialData.perfil || {};
  const config = initialData.config || {};

  // LGPD Privacy & Data Rights State
  const [exportingData, setExportingData] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const res = await api.get(`/api/privacy/export?user_id=${userId}`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `freelaos-dados-pessoais-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Dados pessoais exportados com sucesso!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Falha ao exportar dados.");
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim() !== "EXCLUIR") {
      toast.error("Digite exatamente EXCLUIR para confirmar a exclusão definitiva.");
      return;
    }
    setDeletingAccount(true);
    try {
      await api.delete("/api/privacy/account", {
        data: {
          user_id: userId,
          confirmacao: "EXCLUIR",
        },
      });
      toast.success("Sua conta e todos os dados foram eliminados permanentemente.");
      setDeleteModalOpen(false);
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erro ao excluir conta.");
      setDeletingAccount(false);
    }
  };

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
  const [areaAtuacao, setAreaAtuacao] = useState(perfil.area_atuacao || "Desenvolvimento e TI");

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
  const [promptPersonalizado, setPromptPersonalizado] = useState(config.modelos_proposta?.personalizado_prompt ?? "");
  const [limiteAutomacao, setLimiteAutomacao] = useState(config.modelos_proposta?.limite_automacao ?? 70);
  const [limiteDescarte, setLimiteDescarte] = useState(config.modelos_proposta?.limite_descarte ?? 30);
  const [automacaoAtivada, setAutomacaoAtivada] = useState(config.modelos_proposta?.automacao_ativada ?? true);
  const [orcamentoAbaixoMediaAtivado, setOrcamentoAbaixoMediaAtivado] = useState<boolean>(
    config.modelos_proposta?.orcamento_abaixo_media_ativado ?? false
  );
  const [orcamentoAbaixoMediaModo, setOrcamentoAbaixoMediaModo] = useState<"5" | "10" | "25" | "outro">(
    config.modelos_proposta?.orcamento_abaixo_media_modo ?? "10"
  );
  const [orcamentoAbaixoMediaPercentual, setOrcamentoAbaixoMediaPercentual] = useState<number>(
    Number(config.modelos_proposta?.orcamento_abaixo_media_percentual ?? 10)
  );
  const [revisaoHumana, setRevisaoHumana] = useState(config.revisao_humana_obrigatoria ?? true);
  const [intervalHours, setIntervalHours] = useState(config.interval_hours ?? 3);

  const [connecting99, setConnecting99] = useState(false);
  const [isConnected99, setIsConnected99] = useState(initialData.isConnected99);
  
  const [connectingWorkana, setConnectingWorkana] = useState(false);
  const [isConnectedWorkana, setIsConnectedWorkana] = useState(initialData.isConnectedWorkana);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPlatform, setAuthPlatform] = useState<"99freelas" | "workana" | null>(null);
  const [authCookies, setAuthCookies] = useState("");

  const [syncingGithub, setSyncingGithub] = useState(false);
  const [showGithubOptions, setShowGithubOptions] = useState(false);

  // Check if Github is connected by looking at auth identities
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.identities) {
        setIsGithubConnected(data.user.identities.some(id => id.provider === 'github'));
      }
    });
  });

  const handleConnectGithub = async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: 'github' });
    if (error) {
      // Caso a conta já tenha sido vinculada ou seja a conta principal de login
      if (error.message.includes("identity is already linked")) {
         toast.success("GitHub já está conectado!");
         setIsGithubConnected(true);
      } else {
         // Fallback se linkIdentity falhar por não suportar
         const { error: err2 } = await supabase.auth.signInWithOAuth({ 
           provider: 'github',
           options: {
             redirectTo: window.location.origin + '/configuracoes',
             scopes: 'repo read:user'
           }
         });
         if (err2) toast.error("Erro ao conectar com GitHub.");
      }
    }
  };

  const handleDisconnectGithub = async () => {
    setShowGithubOptions(false);
    if (!confirm("Tem certeza que deseja desconectar o GitHub? O Redator IA não usará mais seus repositórios.")) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado.");
      
      const identity = user.identities?.find(id => id.provider === 'github');
      
      if (identity) {
        const { error } = await supabase.auth.unlinkIdentity(identity);
        if (error) {
           toast.error("Erro ao desconectar: " + error.message);
        } else {
           // Limpa o resumo gerado do banco de dados (Kill switch)
           await supabase
             .from("configuracoes_usuario")
             .update({ github_resumo: null })
             .eq("perfil_id", user.id);
             
           toast.success("GitHub desconectado com sucesso!");
           setIsGithubConnected(false);
           queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
        }
      } else {
         toast.error("Nenhuma conexão do GitHub encontrada.");
      }
    } catch (err: any) {
      toast.error("Falha ao desconectar.");
    }
  };

  const handleSyncGithub = async () => {
    setSyncingGithub(true);
    toast.info("Lendo seus repositórios no GitHub...", { duration: 5000 });
    
    try {
      // Pega a sessão atual para pegar o provider_token, se existir
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      
      const res = await api.post("/api/auth/github/sync", { 
        user_id: userId,
        provider_token: providerToken 
      });
      
      if (res.data && res.data.status === "success") {
        toast.success("Portfólio sincronizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      } else {
        toast.error(res.data?.message || "Erro ao sincronizar repositórios.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Falha ao sincronizar com o backend.");
    } finally {
      setSyncingGithub(false);
    }
  };

  const handleSave = async () => {
    const pctNum = Number(orcamentoAbaixoMediaPercentual);
    if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
      toast.error("O percentual abaixo da média deve estar entre 0.0 e 100.0.");
      return;
    }

    const integracoesJson = integracoes.reduce((acc, curr) => ({ ...acc, [curr.id]: { enabled: curr.enabled, ignoreExclusive: curr.ignoreExclusive } }), {});
    
    await saveConfig({
      userId,
      perfilPayload: {
        nome, cidade, fuso_horario: fuso, bio, habilidades, senioridade, idiomas, area_atuacao: areaAtuacao,
        valor_hora_minimo: valorHora, valor_projeto_minimo: valorProjeto, moeda_base: moedaBase
      },
      configPayload: {
        integracoes: integracoesJson,
        modelos_proposta: {
          ativo: modeloAtivo,
          personalizado_prompt: promptPersonalizado,
          limite_automacao: limiteAutomacao,
          automacao_ativada: automacaoAtivada,
          limite_descarte: limiteDescarte,
          orcamento_abaixo_media_ativado: orcamentoAbaixoMediaAtivado,
          orcamento_abaixo_media_modo: orcamentoAbaixoMediaModo,
          orcamento_abaixo_media_percentual: Number(pctNum.toFixed(2)),
        },
        revisao_humana_obrigatoria: revisaoHumana,
        interval_hours: intervalHours
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
    const llmModels = ['openai', 'claude', 'groq', 'gemini', 'nvidia'];
    
    setIntegracoes(prev => {
      if (checked && llmModels.includes(id)) {
        return prev.map(int => {
          if (int.id === id) return { ...int, enabled: true };
          if (llmModels.includes(int.id)) return { ...int, enabled: false };
          return int;
        });
      }
      return prev.map(int => int.id === id ? { ...int, enabled: checked } : int);
    });
  }

  function toggleIgnoreExclusive(id: string, checked: boolean) {
    setIntegracoes(prev => prev.map(int => int.id === id ? { ...int, ignoreExclusive: checked } : int));
  };

    const openAuthModal = (platform: "99freelas" | "workana") => {
    setAuthPlatform(platform);
    setAuthCookies("");
    setAuthModalOpen(true);
  };

  const handleAuthSubmit = async () => {
    if (!authPlatform || !authCookies) {
      toast.error("Cole o JSON dos cookies.");
      return;
    }
    
    const is99 = authPlatform === "99freelas";
    const setConnecting = is99 ? setConnecting99 : setConnectingWorkana;
    const setIsConnected = is99 ? setIsConnected99 : setIsConnectedWorkana;
    const endpoint = is99 ? "/api/auth/99freelas" : "/api/auth/workana";
    
    setAuthModalOpen(false);
    setConnecting(true);
    toast.info("Injetando cookies na sessão...", { duration: 4000 });
    
    try {
      const res = await api.post(endpoint, { 
        user_id: userId,
        cookies_json: authCookies
      });
      if (res.data && res.data.status === "success") {
        toast.success(res.data.message || "Cookies injetados com sucesso!");
        setIsConnected(true);
      } else {
        toast.error(res.data?.message || "Erro desconhecido ao injetar.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Falha de conexão.");
    } finally {
      setConnecting(false);
      setAuthCookies("");
    }
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

  const handleConnectWorkana = async () => {
    setConnectingWorkana(true);
    toast.info("Abrindo navegador... Faça o login na janela que aparecerá.", { duration: 8000 });
    
    try {
      const res = await api.post("/api/auth/workana", { user_id: userId });
      if (res.data && res.data.status === "success") {
        toast.success(res.data.message);
        setIsConnectedWorkana(true);
      } else {
        toast.error(res.data?.message || "Erro desconhecido ao conectar.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Falha de conexão com a API.");
    } finally {
      setConnectingWorkana(false);
    }
  };

  const handleDisconnectWorkana = async () => {
    if (!confirm("Tem certeza que deseja desconectar a Workana? O robô parará de ler as vagas dessa plataforma.")) return;
    
    try {
      const res = await api.delete("/api/auth/workana", { data: { user_id: userId } });
      if (res.data) {
        toast.success(res.data.message);
        setIsConnectedWorkana(false);
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
                className="mt-1 min-h-[540px] border-border/50 bg-background/40"
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
              <Label className="text-xs text-muted-foreground">Área de Atuação</Label>
              <select 
                value={areaAtuacao} 
                onChange={e => setAreaAtuacao(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Desenvolvimento e TI">Desenvolvimento e TI</option>
                <option value="Design e Multimedia">Design e Multimedia</option>
                <option value="Escrita e Tradução">Escrita e Tradução</option>
                <option value="Marketing e Vendas">Marketing e Vendas</option>
                <option value="Suporte Administrativo">Suporte Administrativo</option>
              </select>
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
            <div className="flex flex-col gap-2 pt-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  * As integrações com o GitHub e o Linkedin alimentam a base de dados com suas informações técnicas e profissionais, fornecendo aos modelos de inteligência maior repertório para elaborar propostas.
                </p>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`w-full ${isGithubConnected ? 'border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700' : ''}`}
                    onClick={isGithubConnected ? () => setShowGithubOptions(!showGithubOptions) : handleConnectGithub}
                  >
                    <Github className="mr-2 h-4 w-4" /> 
                    {isGithubConnected ? "GitHub Conectado" : "Conectar GitHub"}
                  </Button>
                  
                  {showGithubOptions && (
                    <div className="absolute top-full left-0 mt-1 w-full z-10 rounded-md border border-border bg-popover shadow-md outline-none animate-in fade-in zoom-in-95">
                      <button 
                        className="w-full relative flex cursor-pointer select-none items-center justify-center rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10 transition-colors"
                        onClick={handleDisconnectGithub}
                      >
                        Desconectar
                      </button>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <Button variant="outline" size="sm" className="w-full"><Linkedin className="mr-2 h-4 w-4" /> Conectar LinkedIn</Button>
                </div>
              </div>
              
              {isGithubConnected && (
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full text-xs" 
                    onClick={handleSyncGithub}
                    disabled={syncingGithub}
                  >
                    {syncingGithub ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3 text-primary" />}
                    {syncingGithub ? "Sincronizando..." : "Sincronizar Repositórios (IA)"}
                  </Button>
                  <div className="w-full"></div>
                </div>
              )}

              {isGithubConnected && config.github_resumo && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1 text-primary">
                    <Github className="h-3 w-3" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Seu Perfil Segundo a IA</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {config.github_resumo}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* IDIOMAS & PRECIFICAÇÃO */}
        {/* <Card className="border-border/60 bg-card/60">
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
        </Card> */}

        {/* MODELOS DE PROPOSTA */}
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Modelos de Proposta IA</CardTitle>
            <p className="text-xs text-muted-foreground">Escolha qual modelo o Redator IA deve usar como base nas suas propostas.</p>
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
                  <span>Descarte Automático (Analista IA)</span>
                </div>
                <span className="font-mono px-2 py-0.5 rounded text-xs transition-colors bg-primary/10 text-primary">
                  {limiteDescarte} / 100
                </span>
              </Label>
              <p className="text-[11px] text-muted-foreground mb-3 mt-2">
                Qualquer vaga cujo Score calculado seja MENOR que este valor será imediatamente descartada e enviada para a lixeira (Ignorada) (0 para desligar).
              </p>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={limiteDescarte} 
                onChange={(e) => setLimiteDescarte(parseInt(e.target.value))}
                className="w-full accent-primary"
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

            <div className="pt-4 border-t border-border/50">
              <Label className="text-xs text-muted-foreground flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span>Enviar orçamento abaixo da média</span>
                  <Switch
                    checked={orcamentoAbaixoMediaAtivado}
                    onCheckedChange={setOrcamentoAbaixoMediaAtivado}
                  />
                </div>
                <span className={`font-mono px-2 py-0.5 rounded text-xs transition-colors ${orcamentoAbaixoMediaAtivado ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {orcamentoAbaixoMediaAtivado ? `-${orcamentoAbaixoMediaPercentual}% da média` : "Desativado"}
                </span>
              </Label>
              <p className="text-[11px] text-muted-foreground mb-3 mt-2 leading-relaxed">
                Se ativado, logo após enviar a proposta no 99Freelas, o Sender clicará em "Melhorar proposta", extrairá o valor médio das propostas concorrentes e ajustará seu orçamento para ficar na margem abaixo da média configurada.
              </p>

              {orcamentoAbaixoMediaAtivado && (
                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { id: "5" as const, label: "5% abaixo", val: 5 },
                      { id: "10" as const, label: "10% abaixo", val: 10 },
                      { id: "25" as const, label: "25% abaixo", val: 25 },
                      { id: "outro" as const, label: "Outro", val: orcamentoAbaixoMediaPercentual },
                    ].map((opt) => {
                      const active = orcamentoAbaixoMediaModo === opt.id;
                      return (
                        <Button
                          key={opt.id}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setOrcamentoAbaixoMediaModo(opt.id);
                            if (opt.id !== "outro") {
                              setOrcamentoAbaixoMediaPercentual(opt.val);
                            }
                          }}
                          className="text-xs font-medium"
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>

                  {orcamentoAbaixoMediaModo === "outro" && (
                    <div className="flex items-center gap-3 pt-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Percentual personalizado (0.0 a 100.0%):
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={orcamentoAbaixoMediaPercentual}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value);
                          if (Number.isNaN(raw)) {
                            setOrcamentoAbaixoMediaPercentual(0);
                          } else {
                            setOrcamentoAbaixoMediaPercentual(Math.max(0, Math.min(100, raw)));
                          }
                        }}
                        className="max-w-[140px] border-border/50 bg-background/40 font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/50">
              <Label className="text-xs text-muted-foreground mb-3 flex items-center gap-3">
                <span>Frequência de Varredura (Piloto Automático)</span>
              </Label>
              <select 
                value={intervalHours} 
                onChange={e => setIntervalHours(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background/40 px-3 py-1 text-sm ring-offset-background"
              >
                <option value={1}>A cada 1 hora</option>
                <option value={3}>A cada 3 horas</option>
                <option value={6}>A cada 6 horas</option>
                <option value={12}>A cada 12 horas</option>
                <option value={24}>Uma vez por dia (24h)</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Define de quanto em quanto tempo o Piloto Automático acorda para procurar novas vagas nas plataformas conectadas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* INTEGRACOES */}
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Integrações de Plataformas e I.A</CardTitle>
            <p className="text-xs text-muted-foreground">Ative ou desative as fontes de dados e modelos de inteligência artificial do freela.</p>
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
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleConnect99Freelas} disabled={connecting99}>
                            {connecting99 ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            {connecting99 ? "Aguardando login..." : "Conectar Conta"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openAuthModal("99freelas")} disabled={connecting99}>
                            Importar Cookies
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {i.id === "workana" && i.enabled && (
                  <div className="mt-2 flex flex-col border-t border-border/50 pt-3 space-y-3">
                    <div className="flex items-center space-x-3">
                      <p className="text-[12px] text-muted-foreground max-w-[200px]">
                        Conexão com a plataforma: 
                      </p>
                      {isConnectedWorkana ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700">
                            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            Conectado
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleDisconnectWorkana}
                            className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            Desconectar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleConnectWorkana} disabled={connectingWorkana}>
                            {connectingWorkana ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            {connectingWorkana ? "Aguardando login..." : "Conectar Conta"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openAuthModal("workana")} disabled={connectingWorkana}>
                            Importar Cookies
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD) */}
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Privacidade e Proteção de Dados (LGPD)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Gerencie seus direitos como titular sob a Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados).
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status e Diretrizes */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-background/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Termos de Uso
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Versão v1.0 vigente e aceita.
                </p>
                <a
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary underline inline-flex items-center gap-1 pt-1 hover:text-primary/80"
                >
                  Consultar termos <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Política de Privacidade
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Versão v1.0 com ciclo de retenção ativo.
                </p>
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary underline inline-flex items-center gap-1 pt-1 hover:text-primary/80"
                >
                  Consultar política <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Minimização de PII (IA)
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Higienização ativa contra vazamento de e-mails, telefones e CPFs/CNPJs.
                </p>
              </div>
            </div>

            {/* Portabilidade de Dados (Artigo 18, II e V) */}
            <div className="rounded-xl border border-border/50 bg-background/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  Portabilidade e Acesso aos Dados (Art. 18, II e V)
                </h4>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Obtenha uma cópia completa de todos os seus dados cadastrais, histórico de propostas, oportunidades captadas, clientes e mensagens em formato JSON estruturado.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={exportingData}
                className="whitespace-nowrap gap-2 text-xs border-border/70 hover:bg-muted/40 cursor-pointer"
              >
                {exportingData ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" /> Exportar Dados (JSON)
                  </>
                )}
              </Button>
            </div>

            {/* Zona de Perigo: Eliminação Definitiva (Artigo 18, VI) */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Eliminação Definitiva da Conta (Art. 18, VI)
                </h4>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Exercício do direito de esquecimento. Esta ação exclui permanentemente seu perfil, todas as vagas rastreadas, propostas geradas, contatos, logs de agentes e arquivos de sessão do navegador.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteConfirmInput("");
                  setDeleteModalOpen(true);
                }}
                className="whitespace-nowrap gap-2 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir Minha Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Injetar Cookies: {authPlatform === '99freelas' ? '99Freelas' : 'Workana'}</DialogTitle>
            <DialogDescription>
              Se o login interativo falhar ou você estiver num servidor (Render), use este método. Exporte os cookies usando a extensão EditThisCookie e cole abaixo:
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={authCookies}
              onChange={(e) => setAuthCookies(e.target.value)}
              placeholder='[ { "domain": ".99freelas.com.br", "name": "PHPSESSID", ... } ]'
              className="min-h-[150px] font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAuthSubmit}>Injetar Sessão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão de Conta LGPD */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[480px] border-destructive/40 bg-card/95 backdrop-blur-xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Excluir Conta Permanentemente
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Você está prestes a exercer o seu direito à eliminação de dados (Art. 18, VI da LGPD).
              Todos os seus dados pessoais, configurações, propostas, histórico de oportunidades e arquivos
              de sessão Playwright serão <strong>apagados imediatamente sem possibilidade de recuperação</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <p className="text-foreground font-medium">
              Para prosseguir, digite a palavra <strong className="text-destructive font-mono">EXCLUIR</strong> no campo abaixo:
            </p>
            <Input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="border-destructive/40 bg-background/50 font-mono text-center tracking-wider text-sm focus-visible:ring-destructive"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deletingAccount}
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deletingAccount || deleteConfirmInput.trim() !== "EXCLUIR"}
              onClick={handleDeleteAccount}
              className="text-xs font-semibold gap-1.5"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Excluindo Dados...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" /> Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}