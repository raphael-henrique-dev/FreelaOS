import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [{ title: "Projetos · FreelaOS" }] }),
  component: ProjetosPage,
});

type KanbanColumn = "backlog" | "andamento" | "aguardando" | "concluido";

const columns: { id: KanbanColumn; title: string; accent: string }[] = [
  { id: "backlog", title: "Backlog", accent: "bg-muted-foreground" },
  { id: "aguardando", title: "Aguardando cliente", accent: "bg-warning" },
  { id: "andamento", title: "Em andamento", accent: "bg-primary" },
  { id: "concluido", title: "Concluído", accent: "bg-success" },
];

function ProjetosPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("oportunidades")
        .select(`id, titulo, cliente, orcamento, valor_proposta, status, prazo_proposta, stack`)
        .eq("perfil_id", session.user.id);
        
      if (data) {
        // Mapear os status reais das oportunidades para as colunas do Kanban
        const mappedProjects = data.map((op: any) => {
          let column: KanbanColumn | null = null;
          
          const status = op.status || "";
          
          // "Proposta enviada" e "Em negociação" -> Aguardando cliente
          if (["Proposta enviada", "Proposta Enviada", "Em negociação"].includes(status)) {
            column = "aguardando";
          }
          // "Proposta aceita", "Projeto fechado", "Em andamento" -> Em andamento
          else if (["Proposta aceita", "Projeto fechado", "Em andamento"].includes(status)) {
            column = "andamento";
          }
          // "Finalizado", "Entregue", "Concluído" -> Concluído
          else if (["Finalizado", "Entregue", "Concluído"].includes(status)) {
            column = "concluido";
          }
          // Se o usuário já revisou/salvou a proposta_ia, o status deve ser "Rascunho" ou "Proposta salva"
          // Se for "Aprovada" também fica no backlog.
          else if (["Aprovada", "Rascunho", "Proposta salva"].includes(status) || (op.proposta_ia && op.proposta_ia.length > 0)) {
            column = "backlog";
          }
          
          if (!column) return null; // Ignora as vagas comuns
          
          return {
            id: op.id,
            title: op.titulo,
            client: op.cliente || "Cliente",
            stack: op.stack || [],
            deadline: op.prazo_proposta || "Prazo a definir",
            value: op.valor_proposta || op.orcamento || 0,
            columnId: column
          };
        }).filter(Boolean);
        
        setProjects(mappedProjects);
      }
      setLoading(false);
    }
    
    fetchProjects();
  }, []);

  return (
    <PageContainer>
      <PageHeader title="Projetos" description="Kanban dos projetos ativos e do pipeline." />

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>Carregando projetos...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const items = projects.filter((p) => p.columnId === col.id);
            return (
              <div key={col.id} className="flex min-h-[400px] flex-col rounded-2xl border border-border/60 bg-card/40 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.accent}`} />
                    <p className="text-sm font-medium">{col.title}</p>
                  </div>
                  <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  {items.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/50">
                      Vazio
                    </div>
                  )}
                  {items.map((p) => (
                    <Link key={p.id} to="/oportunidades/$id" params={{ id: p.id }} className="block">
                      <Card
                        className="cursor-pointer border-border/60 bg-background/60 p-3 transition hover:border-primary/40 hover:bg-muted/30"
                      >
                        <p className="text-xs text-muted-foreground">{p.client}</p>
                        <p className="mt-0.5 text-sm font-medium leading-snug">{p.title}</p>
                        {p.stack && p.stack.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {p.stack.slice(0, 3).map((s: string) => (
                              <Badge key={s} variant="outline" className="border-border/60 bg-transparent text-[10px]">
                                {s}
                              </Badge>
                            ))}
                            {p.stack.length > 3 && (
                              <Badge variant="outline" className="border-border/60 bg-transparent text-[10px]">
                                +{p.stack.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                          <span className="text-muted-foreground">{p.deadline}</span>
                          <span className="font-semibold text-primary/90">{currency(p.value)}</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}