import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Activity, Power, Loader2, FileText, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { useAutopilotStatus, useToggleAutopilot, useAgentActivities } from "@/queries/agentes";
import { AgentLogsSheet } from "@/components/agent-logs-sheet";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes IA · FreelaOS" },
      { name: "description", content: "Sua equipe de agentes de IA especializados: prospecção, análise, propostas e mais." },
    ],
  }),
  component: AgentesPageWrapper,
});

function AgentesPageWrapper() {
  const { data, isLoading, error } = useAutopilotStatus();

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
          Erro ao carregar configurações.
        </div>
      </PageContainer>
    );
  }

  return <AgentesPage userId={data.userId} initialAutopilot={data.autopilot} intervalHours={data.intervalHours} />;
}

function useAutopilotCountdown(isActive: boolean, intervalHours: number) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      localStorage.removeItem("autopilot_next_run");
      setTimeLeft(null);
      return;
    }

    const intervalMs = intervalHours * 3600 * 1000;
    
    let nextRunStr = localStorage.getItem("autopilot_next_run");
    let nextRun = nextRunStr ? parseInt(nextRunStr, 10) : 0;
    
    const updateTimer = () => {
      const now = Date.now();
      if (!nextRunStr || nextRun <= now) {
        nextRun = now + intervalMs;
        localStorage.setItem("autopilot_next_run", nextRun.toString());
        nextRunStr = nextRun.toString();
      }
      setTimeLeft(Math.max(0, Math.floor((nextRun - now) / 1000)));
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [isActive, intervalHours]);

  if (timeLeft === null) return null;

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface FreelaAgent {
  id: string;
  key: string;
  name: string;
  role: string;
  description: string;
  color: string;
  emoji: string;
  metricLabel: string;
}

const AGENTS_LIST: FreelaAgent[] = [
  {
    id: "scout",
    key: "Scout",
    name: "Scout IA",
    role: "Varredura & Prospecção",
    description: "Varre 99Freelas e Workana em busca de projetos freelance aderentes à sua stack.",
    color: "#6366f1",
    emoji: "🕵️",
    metricLabel: "Atividades registradas",
  },
  {
    id: "analista",
    key: "Analista",
    name: "Analista IA",
    role: "Qualificação & Score",
    description: "Analisa a descrição das vagas, calcula o fit cultural/técnico e pontua de 0 a 100.",
    color: "#ec4899",
    emoji: "🧠",
    metricLabel: "Vagas avaliadas",
  },
  {
    id: "redator",
    key: "Redator",
    name: "Redator IA",
    role: "Geração de Propostas",
    description: "Cria propostas comerciais persuasivas sob medida usando seu perfil e tom ideal.",
    color: "#14b8a6",
    emoji: "✍️",
    metricLabel: "Propostas geradas",
  },
  {
    id: "sender",
    key: "Sender",
    name: "Sender IA",
    role: "Envio & Automação",
    description: "Prepara ou submete propostas nas plataformas com segurança e validação.",
    color: "#8b5cf6",
    emoji: "🚀",
    metricLabel: "Ações de envio",
  },
  {
    id: "nexus",
    key: "Nexus",
    name: "Nexus IA",
    role: "Comunicações & Copiloto",
    description: "Seu copiloto executivo: acompanha conversas com clientes, elabora respostas inteligentes e dá insights estratégicos.",
    color: "#f59e0b",
    emoji: "💬",
    metricLabel: "Status do copiloto",
  },
];

function AgentesPage({ userId, initialAutopilot, intervalHours }: { userId: string, initialAutopilot: boolean, intervalHours: number }) {
  const { mutateAsync: toggleAutopilot, isPending } = useToggleAutopilot();
  const countdown = useAutopilotCountdown(initialAutopilot, intervalHours);
  
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedAgentForLogs, setSelectedAgentForLogs] = useState<string | null>(null);

  const { data: rawLogs } = useAgentActivities(userId, 100);

  const handleToggle = () => {
    toggleAutopilot({ userId, newState: !initialAutopilot });
  };

  const handleOpenLogs = (agentKey?: string) => {
    setSelectedAgentForLogs(agentKey || null);
    setLogsOpen(true);
  };

  // Mapeamento dinâmico de métricas e status por agente
  const agentStats = useMemo(() => {
    const logs = Array.isArray(rawLogs) ? rawLogs : [];
    const stats: Record<string, { lastActivity: string; metricValue: string; status: "working" | "monitoring" | "idle" }> = {};

    const latestGlobalLog = logs[0];
    const isGlobalFinished = latestGlobalLog && (latestGlobalLog.status === "concluido" || (latestGlobalLog.agente === "Motor" && latestGlobalLog.status !== "processando"));

    AGENTS_LIST.forEach((agent) => {
      const agentLogs = logs.filter((l: any) => 
        l.agente?.toLowerCase() === agent.key.toLowerCase() || 
        (agent.key === "Nexus" && l.agente?.toLowerCase() === "assistente")
      );
      const latestLog = agentLogs[0];

      let lastActivity = "Aguardando próximo ciclo";
      let status: "working" | "monitoring" | "idle" = initialAutopilot ? "monitoring" : "idle";

      if (latestLog) {
        lastActivity = latestLog.acao;
        
        const logTime = new Date(latestLog.criado_em).getTime();
        const isRecent = Date.now() - logTime < 60000; // 60 segundos de janela ativa

        if (latestLog.status === "processando" && isRecent && !isGlobalFinished) {
          status = "working";
        }
      }

      let metricValue = agentLogs.length.toString();
      if (agent.key === "Nexus") {
        metricValue = "Disponível";
      }

      stats[agent.key] = {
        lastActivity,
        metricValue,
        status,
      };
    });

    return stats;
  }, [rawLogs, initialAutopilot]);

  return (
    <PageContainer>
      <PageHeader
        title="Agentes IA"
        description="Sua equipe autônoma trabalhando 24/7 pelo seu negócio."
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenLogs()}
            className="gap-2 shadow-sm hover:border-[oklab(54.1337%_.0963843_-.226968_/_0.4)] transition-all"
          >
            <Activity className="h-4 w-4 text-primary" /> Ver logs em tempo real
          </Button>
        }
      />

      {/* MASTER SWITCH: MOTOR */}
      <Card className={`mb-6 border-2 transition-colors ${initialAutopilot ? 'border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] bg-primary/5' : 'border-border/60 bg-card/60'}`}>
        <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-6">
          <div className="flex items-center gap-4">
            <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition-colors ${initialAutopilot ? 'border-primary/30 bg-primary/20' : 'border-muted-foreground/20 bg-muted'}`}>
              <Power className={`h-8 w-8 transition-colors ${initialAutopilot ? 'text-primary' : 'text-muted-foreground/60'}`} />
              {initialAutopilot && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Piloto Automático</h2>
              <p className="text-sm text-muted-foreground">
                {initialAutopilot 
                  ? `Orquestrador LIGADO. O fluxo Extrator > Scout > Analista > Redator > Sender rodará a cada ${intervalHours} hora(s).`
                  : "Orquestrador DESLIGADO. O fluxo automatizado está em pausa."}
              </p>
              {countdown && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-mono text-primary font-medium shadow-sm">
                  <Activity className="h-4 w-4 animate-pulse" />
                  Próximo ciclo em: {countdown}
                </div>
              )}
            </div>
          </div>
          <Button 
            size="lg" 
            variant={initialAutopilot ? "destructive" : "default"}
            className={initialAutopilot ? "" : "bg-gradient-primary shadow-glow"}
            onClick={handleToggle}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {initialAutopilot ? "Desligar Motor" : "Ligar Motor"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS_LIST.map((agent) => {
          const stats = agentStats[agent.key] || {
            lastActivity: "Sem registro",
            metricValue: "0",
            status: "idle" as const,
          };

          return (
            <AgentCard 
              key={agent.id} 
              agent={agent} 
              stats={stats} 
              onViewLogs={() => handleOpenLogs(agent.key)}
            />
          );
        })}
      </div>

      {/* Drawer de Logs */}
      <AgentLogsSheet 
        open={logsOpen} 
        onOpenChange={setLogsOpen} 
        userId={userId} 
        selectedAgent={selectedAgentForLogs} 
      />
    </PageContainer>
  );
}

function AgentCard({ 
  agent, 
  stats, 
  onViewLogs 
}: { 
  agent: FreelaAgent; 
  stats: { lastActivity: string; metricValue: string; status: "working" | "monitoring" | "idle" }; 
  onViewLogs: () => void; 
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const statusMap = {
    working: { label: "Trabalhando", className: "bg-primary/15 text-primary border-primary/30" },
    idle: { label: "Livre", className: "bg-muted text-muted-foreground border-border" },
    monitoring: { label: "Monitorando", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  };
  
  const s = statusMap[stats.status] ?? statusMap.idle;

  return (
    <Card 
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className="group relative overflow-hidden border-border/60 bg-card/60 transition-all hover:border-[oklab(54.1337%_.0963843_-.226968_/_0.4)] hover:shadow-elegant flex flex-col justify-between"
    >
      {/* Efeito Spotlight Interativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, color-mix(in oklab, ${agent.color} 22%, transparent), transparent 75%)`,
        }}
      />

      {/* Iluminação ambiente fixa no topo direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-50"
        style={{ background: agent.color }}
      />
      <CardContent className="relative z-10 space-y-4 p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-border/50 text-2xl shadow-elegant"
              style={{ background: `color-mix(in oklab, ${agent.color} 30%, transparent)` }}
            >
              {agent.emoji}
            </div>
            <Badge variant="outline" className={s.className}>
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current ${stats.status === "working" ? "animate-ping" : ""}`} />
              {s.label}
            </Badge>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-semibold">{agent.name}</h3>
              <span className="text-xs text-muted-foreground">· {agent.role}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{agent.description}</p>
          </div>

          <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Última atividade</p>
            <p className="mt-1 text-xs text-foreground/90 font-medium line-clamp-2">{stats.lastActivity}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{agent.metricLabel}</p>
            <p className="text-lg font-semibold">{stats.metricValue}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewLogs} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <FileText className="h-3.5 w-3.5" /> Ver logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}