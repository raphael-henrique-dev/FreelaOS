import { useState, useEffect } from "react";
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

import { supabase } from "@/lib/supabase"; 
import { currency, scoreColor, statusVariant, Opportunity } from "@/lib/mock-data";

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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOportunidades() {
      // Faz a busca na tabela OPORTUNIDADES
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*")
        .order("criado_em", { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar vagas:", error);
      } else if (data) {
        // Mapeamos o retorno (que está em português) para a estrutura esperada (inglês)
        const mappedData = data.map((item: any) => ({
          id: item.ID || item.id,
          title: item.TITULO || item.titulo,
          client: item.CLIENTE || item.cliente,
          platform: item.PLATAFORMA || item.plataforma,
          stack: item.STACK || item.stack || [],
          budget: item.ORCAMENTO || item.orcamento,
          deadline: item.PRAZO || item.prazo,
          score: item.SCORE || item.score,
          status: item.STATUS || item.status,
        }));
        setOpportunities(mappedData as Opportunity[]);
      }
      setLoading(false);
    }

    fetchOportunidades();
  }, []);

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
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Carregando oportunidades da base de dados...
                  </TableCell>
                </TableRow>
              )}

              {!loading && opportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma oportunidade encontrada ainda. Que tal rodar o Scout IA?
                  </TableCell>
                </TableRow>
              )}

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
                      {(op.stack || []).slice(0, 2).map((s) => (
                        <Badge key={s} variant="outline" className="border-border/60 bg-background/40 text-xs">
                          {s}
                        </Badge>
                      ))}
                      {(op.stack || []).length > 2 ? (
                        <span className="text-xs text-muted-foreground">+{(op.stack || []).length - 2}</span>
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