import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency, opportunities, scoreColor, statusVariant } from "@/lib/mock-data";

export const Route = createFileRoute("/oportunidades/")({
  head: () => ({
    meta: [
      { title: "Oportunidades · FreelaOS" },
      { name: "description", content: "Projetos encontrados pelos seus agentes de IA nas plataformas de freelancer." },
    ],
  }),
  component: OpList,
});

function OpList() {
  return (
    <PageContainer>
      <PageHeader
        title="Oportunidades"
        description="Projetos coletados por Scout IA e qualificados por Analista IA."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" /> Filtrar
            </Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground">
              Nova busca
            </Button>
          </>
        }
      />

      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por título, cliente ou stack..." className="border-border/50 bg-background/40 pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Stack</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((op) => (
                <TableRow key={op.id} className="border-border/50">
                  <TableCell className="max-w-[280px] font-medium">
                    <Link to="/oportunidades/$id" params={{ id: op.id }} className="hover:text-primary">
                      {op.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{op.client}</TableCell>
                  <TableCell>{op.platform}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {op.stack.slice(0, 2).map((s) => (
                        <Badge key={s} variant="outline" className="border-border/60 bg-background/40 text-xs">
                          {s}
                        </Badge>
                      ))}
                      {op.stack.length > 2 ? (
                        <span className="text-xs text-muted-foreground">+{op.stack.length - 2}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{currency(op.budget)}</TableCell>
                  <TableCell className="text-muted-foreground">{op.deadline}</TableCell>
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
    </PageContainer>
  );
}