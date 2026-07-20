import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency, invoices, revenuePerMonth, statusVariant } from "@/lib/mock-data";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro · FreelaOS" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const monthly = 21400;
  const yearly = 178200;
  const paid = invoices.filter((i) => i.status === "Pago").length;
  const pending = invoices.filter((i) => i.status !== "Pago").length;
  const stats = [
    { label: "Receita mensal", value: currency(monthly), delta: "+22%" },
    { label: "Receita anual", value: currency(yearly), delta: "+38%" },
    { label: "Projetos pagos", value: paid.toString(), delta: "+3" },
    { label: "Projetos pendentes", value: pending.toString(), delta: "-1" },
  ];

  return (
    <PageContainer>
      <PageHeader title="Financeiro" description="Controle de recebíveis operado pelo Financeiro IA." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-1 text-[11px] font-medium text-success">{s.delta}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Faturamento por mês</CardTitle>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenuePerMonth} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
              <XAxis dataKey="month" stroke="oklch(0.65 0.015 260)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.65 0.015 260)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.19 0.015 265)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => currency(v)}
              />
              <Bar dataKey="value" fill="oklch(0.68 0.19 265)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Recebíveis</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id} className="border-border/50">
                  <TableCell className="font-medium">{i.client}</TableCell>
                  <TableCell className="text-muted-foreground">{i.project}</TableCell>
                  <TableCell>{currency(i.value)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}