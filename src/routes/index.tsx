import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Briefcase, CheckCircle2, PercentSquare, Send, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  agents,
  currency,
  dashboardStats,
  opportunities,
  opportunitiesPerDay,
  scoreColor,
  statusVariant,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FreelaOS" },
      { name: "description", content: "Visão geral do seu negócio freelancer com métricas em tempo real." },
    ],
  }),
  component: Dashboard,
});

const stats = [
  { label: "Projetos hoje", value: dashboardStats.found, delta: "+18%", icon: Briefcase },
  { label: "Propostas enviadas", value: dashboardStats.proposals, delta: "+9%", icon: Send },
  { label: "Taxa de resposta", value: `${dashboardStats.responseRate}%`, delta: "+4pp", icon: PercentSquare },
  { label: "Projetos fechados", value: dashboardStats.closed, delta: "+2", icon: CheckCircle2 },
  { label: "Receita do mês", value: currency(dashboardStats.revenue), delta: "+22%", icon: TrendingUp },
];

function Dashboard() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-gradient-glow opacity-70" />
      <div className="relative mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Bom te ver de volta</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Sua equipe de IA <span className="text-gradient">produziu 12 oportunidades</span> hoje.
            </h1>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/oportunidades">
              Ver oportunidades <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-1 text-[11px] font-medium text-success">{s.delta} vs. semana anterior</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/60 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Oportunidades por dia</CardTitle>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">Scout IA</Badge>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={opportunitiesPerDay} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="opGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.19 265)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.68 0.19 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.65 0.015 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0.015 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.19 0.015 265)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="oklch(0.68 0.19 265)" strokeWidth={2} fill="url(#opGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agentes em execução</CardTitle>
              <p className="text-xs text-muted-foreground">Atividade em tempo real</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {agents.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg"
                    style={{ background: `color-mix(in oklab, ${a.color} 20%, transparent)` }}
                  >
                    {a.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <StatusDot status={a.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.lastActivity}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Últimas oportunidades</CardTitle>
              <p className="text-xs text-muted-foreground">Descobertas nas últimas 6 horas</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/oportunidades">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Título</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.slice(0, 5).map((op) => (
                  <TableRow key={op.id} className="border-border/50">
                    <TableCell className="font-medium">
                      <Link to="/oportunidades/$id" params={{ id: op.id }} className="hover:text-primary">
                        {op.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{op.client} · {op.createdAt}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{op.platform}</TableCell>
                    <TableCell>{currency(op.budget)}</TableCell>
                    <TableCell className={`font-semibold ${scoreColor(op.score)}`}>{op.score}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(op.status)}>{op.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    working: { color: "bg-primary", label: "Trabalhando" },
    idle: { color: "bg-muted-foreground", label: "Livre" },
    monitoring: { color: "bg-success", label: "Monitorando" },
  };
  const s = map[status] ?? map.idle;
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${s.color} animate-pulse-dot`} />
      {s.label}
    </span>
  );
}
