import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency, statusVariant } from "@/lib/mock-data";

export const Route = createFileRoute("/propostas/")({
  head: () => ({ meta: [{ title: "Propostas · FreelaOS" }] }),
  component: PropostasList,
});

function PropostasList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*")
        .eq("perfil_id", session.user.id)
        .not("proposta_ia", "is", null)
        .order("criado_em", { ascending: false });
        
      if (data) {
        // filter out empty ones
        const valid = data.filter(d => d.proposta_ia && d.proposta_ia.trim() !== "");
        const mappedData = valid.map((item: any) => ({
          id: item.id || item.ID,
          title: item.titulo || item.TITULO,
          client: item.cliente || item.CLIENTE || "Confidencial",
          platform: item.plataforma || item.PLATAFORMA,
          stack: item.stack || item.STACK || [],
          budget: item.orcamento || item.ORCAMENTO,
          status: item.status || item.STATUS,
          proposta_ia: item.proposta_ia
        }));
        setItems(mappedData);
      }
      setLoading(false);
    }
    load();
  }, []);
  return (
    <PageContainer>
      <PageHeader
        title="Propostas"
        description="Textos gerados pelo Redator IA a partir das oportunidades qualificadas."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {loading && (
          <div className="col-span-full py-10 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando propostas...
          </div>
        )}
        
        {!loading && items.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            <p>Nenhuma proposta rascunhada ainda.</p>
            <p className="text-sm mt-1">Quando a IA gerar propostas automaticamente, elas aparecerão aqui.</p>
          </div>
        )}

        {!loading && items.map((op) => (
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
                {op.proposta_ia}
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