import { createFileRoute } from "@tanstack/react-router";
import { Activity, Power, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { agents, type Agent } from "@/lib/mock-data";
import { useAutopilotStatus, useToggleAutopilot } from "@/queries/agentes";

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

  return <AgentesPage userId={data.userId} initialAutopilot={data.autopilot} />;
}

function AgentesPage({ userId, initialAutopilot }: { userId: string, initialAutopilot: boolean }) {
  const { mutateAsync: toggleAutopilot, isPending } = useToggleAutopilot();

  const handleToggle = () => {
    toggleAutopilot({ userId, newState: !initialAutopilot });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Agentes IA"
        description="Sua equipe autônoma trabalhando 24/7 pelo seu negócio."
        actions={
          <Button variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" /> Ver logs
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
                  ? "Orquestrador LIGADO. O fluxo Extrator > Scout > Redator > Sender rodará a cada 3 horas."
                  : "Orquestrador DESLIGADO. O fluxo automatizado está em pausa."}
              </p>
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
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} isAuto={initialAutopilot} />
        ))}
      </div>
    </PageContainer>
  );
}

function AgentCard({ agent, isAuto }: { agent: Agent, isAuto: boolean }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    working: { label: "Trabalhando", className: "bg-primary/15 text-primary border-primary/30" },
    idle: { label: "Livre", className: "bg-muted text-muted-foreground border-border" },
    monitoring: { label: "Monitorando", className: "bg-success/15 text-success border-success/30" },
  };
  
  // Se o piloto automático estiver ligado e o agente não estiver working, forçamos 'monitoring'
  const agentStatus = isAuto && agent.status === 'idle' ? 'monitoring' : agent.status;
  const s = statusMap[agentStatus] ?? statusMap.idle;

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/60 transition hover:border-primary/30 hover:shadow-elegant">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: agent.color }}
      />
      <CardContent className="relative space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-border/50 text-2xl shadow-elegant"
            style={{ background: `color-mix(in oklab, ${agent.color} 30%, transparent)` }}
          >
            {agent.emoji}
          </div>
          <Badge variant="outline" className={s.className}>
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
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

        <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Última atividade</p>
          <p className="mt-1 text-foreground/90">{agent.lastActivity}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{agent.metricLabel}</p>
            <p className="text-lg font-semibold">{agent.metricValue}</p>
          </div>
          <Button variant="ghost" size="sm">Configurar</Button>
        </div>
      </CardContent>
    </Card>
  );
}