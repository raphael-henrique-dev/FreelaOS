import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Briefcase, CheckCircle2, PercentSquare, Send, TrendingUp, Sparkles } from "lucide-react";

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

import { useOportunidades } from "@/queries/oportunidades";

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
  { label: "Propostas enviadas", value: dashboardStats.proposals, delta: "+9%", icon: Send },
  { label: "Taxa de resposta", value: `${dashboardStats.responseRate}%`, delta: "+4pp", icon: PercentSquare },
  { label: "Projetos fechados", value: dashboardStats.closed, delta: "+2", icon: CheckCircle2 },
  { label: "Receita do mês", value: currency(dashboardStats.revenue), delta: "+22%", icon: TrendingUp },
];

function Dashboard() {
  const { data: rawOpportunities, isLoading } = useOportunidades();
  const data = rawOpportunities || [];
  
  const latestOps = data.filter((op: any) => op.status !== "Ignorada").slice(0, 5);
  
  // 1. Conectar Gráfico de Oportunidades
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', '');
  });

  const chartData = last7Days.map(dayStr => {
    const count = data.filter((op: any) => {
      const opDate = new Date(op.criado_em).toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', '');
      return opDate === dayStr;
    }).length;
    return { day: dayStr, count };
  });

  // 2. Conectar Painel de Agentes
  const now = new Date();
  const lastOp = data[0] ? new Date(data[0].criado_em) : null;
  const diffMinutes = lastOp ? Math.floor((now.getTime() - lastOp.getTime()) / 60000) : Infinity;
  
  let tempoStr = "Sem atividade";
  if (diffMinutes < 1) tempoStr = "Agora mesmo";
  else if (diffMinutes < 60) tempoStr = `Há ${diffMinutes} min`;
  else if (diffMinutes < 1440) tempoStr = `Há ${Math.floor(diffMinutes / 60)}h`;
  
  const isWorking = diffMinutes < 10;

  const dynamicAgents = [
    { id: "1", name: "Scout IA", emoji: "🕵️", status: isWorking ? "working" : "monitoring", color: "#6366f1", lastActivity: tempoStr },
    { id: "2", name: "Analista IA", emoji: "🧠", status: isWorking ? "working" : "idle", color: "#ec4899", lastActivity: tempoStr },
    { id: "3", name: "Redator IA", emoji: "✍️", status: "idle", color: "#14b8a6", lastActivity: "Aguardando comando" },
  ];

  // 3. Oportunidades hoje
  const todayStr = new Date().toLocaleDateString("pt-BR");
  const opsToday = data.filter((op: any) => new Date(op.criado_em).toLocaleDateString("pt-BR") === todayStr).length;


  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-gradient-glow opacity-70" />
      <div className="relative mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Bom te ver de volta</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Sua equipe de IA <span className="text-gradient">produziu {opsToday} {opsToday === 1 ? 'oportunidade' : 'oportunidades'}</span> hoje.
            </h1>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/oportunidades">
              Ver oportunidades <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Projetos hoje</p>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{opsToday}</p>
              <p className="mt-1 text-[11px] font-medium text-success">+18% vs. semana anterior</p>
            </CardContent>
          </Card>
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
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="opGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.19 265)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.68 0.19 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.65 0.015 260)" fontSize={11} tickLine={false} axisLine={false} style={{ textTransform: "capitalize" }} />
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
              {dynamicAgents.map((a) => (
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
              <p className="text-xs text-muted-foreground">Descobertas pelo Scout IA nas últimas horas</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/oportunidades">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestOps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Nenhuma oportunidade analisada ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  latestOps.map((op: any) => (
                    <TableRow key={op.id} className="border-border/50">
                      <TableCell className="max-w-[400px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <Link to="/oportunidades/$id" params={{ id: op.id }} className="font-medium hover:text-primary leading-tight">
                              {op.titulo}
                            </Link>
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap bg-background/50">{op.plataforma}</Badge>
                          </div>
                          {op.stack && op.stack.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {op.stack.slice(0, 3).map((s: string) => (
                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 bg-background/40 text-muted-foreground">
                                  {s}
                                </span>
                              ))}
                              {op.stack.length > 3 && <span className="text-[10px] text-muted-foreground">+{op.stack.length - 3}</span>}
                            </div>
                          )}

                          {/* Parecer do Analista IA */}
                          {/* {op.explicacao_score && (
                            <div className="mt-1 flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10">
                              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                <span className="font-medium text-foreground/80">Parecer IA:</span> {op.explicacao_score}
                              </p>
                            </div>
                          )} */}
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-4">R$ {op.orcamento}</TableCell>
                      <TableCell className="align-top pt-4">
                        <span className={`font-semibold ${scoreColor(op.score || 0)}`}>{op.score || 0}/100</span>
                      </TableCell>
                      <TableCell className="align-top pt-4">
                        <Badge variant={statusVariant(op.status)}>{op.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
