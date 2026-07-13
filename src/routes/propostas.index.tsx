import { createFileRoute, Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency, opportunities, statusVariant } from "@/lib/mock-data";

export const Route = createFileRoute("/propostas/")({
  head: () => ({ meta: [{ title: "Propostas · FreelaOS" }] }),
  component: PropostasList,
});

function PropostasList() {
  const items = opportunities.filter((o) =>
    ["Proposta enviada", "Em negociação", "Ganha", "Analisando"].includes(o.status),
  );
  return (
    <PageContainer>
      <PageHeader
        title="Propostas"
        description="Textos gerados pelo Redator IA a partir das oportunidades qualificadas."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((op) => (
          <Card key={op.id} className="border-border/60 bg-card/60 transition hover:border-primary/40">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-border/60 bg-background/40">{op.platform}</Badge>
                <Badge variant={statusVariant(op.status)}>{op.status}</Badge>
              </div>
              <div>
                <Link to="/propostas/$id" params={{ id: op.id }} className="text-base font-semibold hover:text-primary">
                  {op.title}
                </Link>
                <p className="text-xs text-muted-foreground">{op.client}</p>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                Olá! Analisei seu projeto com atenção e vejo forte fit com meu portfólio em {op.stack.slice(0, 2).join(", ")}...
              </p>
              <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs">
                <span className="text-muted-foreground">Valor sugerido</span>
                <span className="font-semibold">{currency(op.budget)}</span>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full border-border/60">
                <Link to="/propostas/$id" params={{ id: op.id }}>Abrir proposta</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}