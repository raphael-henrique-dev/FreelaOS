import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { agents, type Agent } from "@/lib/mock-data";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes IA · FreelaOS" },
      { name: "description", content: "Sua equipe de agentes de IA especializados: prospecção, análise, propostas e mais." },
    ],
  }),
  component: AgentesPage,
});

function AgentesPage() {
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </PageContainer>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    working: { label: "Trabalhando", className: "bg-primary/15 text-primary border-primary/30" },
    idle: { label: "Livre", className: "bg-muted text-muted-foreground border-border" },
    monitoring: { label: "Monitorando", className: "bg-success/15 text-success border-success/30" },
  };
  const s = statusMap[agent.status] ?? statusMap.idle;

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