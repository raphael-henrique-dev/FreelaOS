import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency, projects, type Project } from "@/lib/mock-data";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [{ title: "Projetos · FreelaOS" }] }),
  component: ProjetosPage,
});

const columns: { id: Project["status"]; title: string; accent: string }[] = [
  { id: "backlog", title: "Backlog", accent: "bg-muted-foreground" },
  { id: "andamento", title: "Em andamento", accent: "bg-primary" },
  { id: "aguardando", title: "Aguardando cliente", accent: "bg-warning" },
  { id: "concluido", title: "Concluído", accent: "bg-success" },
];

function ProjetosPage() {
  return (
    <PageContainer>
      <PageHeader title="Projetos" description="Kanban dos projetos ativos e do pipeline." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = projects.filter((p) => p.status === col.id);
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
                {items.map((p) => (
                  <Card
                    key={p.id}
                    className="cursor-grab border-border/60 bg-background/60 p-3 transition hover:border-primary/40 hover:shadow-elegant"
                  >
                    <p className="text-xs text-muted-foreground">{p.client}</p>
                    <p className="mt-0.5 text-sm font-medium leading-snug">{p.title}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.stack.map((s) => (
                        <Badge key={s} variant="outline" className="border-border/60 bg-transparent text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                      <span className="text-muted-foreground">{p.deadline}</span>
                      <span className="font-semibold">{currency(p.value)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}