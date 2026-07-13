import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Save, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/page-header";
import { currency, opportunities } from "@/lib/mock-data";

export const Route = createFileRoute("/propostas/$id")({
  loader: ({ params }) => {
    const op = opportunities.find((o) => o.id === params.id);
    if (!op) throw notFound();
    return { op };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `Proposta · ${loaderData.op.title}` : "Proposta" }],
  }),
  component: PropostaEditor,
  notFoundComponent: () => (
    <PageContainer>
      <p className="text-muted-foreground">Proposta não encontrada.</p>
    </PageContainer>
  ),
});

function PropostaEditor() {
  const { op } = Route.useLoaderData();
  const initial = `Olá, ${op.client}!

Analisei o projeto "${op.title}" e vejo forte compatibilidade com meu perfil. Tenho experiência sólida com ${op.stack.join(", ")} e já entreguei escopos similares nos últimos 12 meses.

Minha proposta para o escopo descrito:

• Discovery técnico + wireframes de referência (2 dias)
• Desenvolvimento incremental com entregas semanais
• Testes E2E, revisão de acessibilidade e deploy

Investimento sugerido: ${currency(op.budget)}
Prazo: ${op.deadline}

Posso enviar mais amostras do meu portfólio se fizer sentido. Fico à disposição para uma call rápida.

Abraço,
Lucas Ribeiro`;
  const [text, setText] = useState(initial);

  return (
    <PageContainer>
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/oportunidades/$id" params={{ id: op.id }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Proposta para</p>
                <h1 className="truncate text-xl font-semibold">{op.title}</h1>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                <Sparkles className="mr-1 h-3 w-3" /> Gerada por Redator IA
              </Badge>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[520px] resize-none border-border/50 bg-background/40 font-mono text-sm leading-relaxed"
            />

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-4">
              <Button variant="outline" onClick={() => toast.success("Proposta salva como rascunho")}>
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => toast.success("Proposta enviada ao cliente")}
              >
                <Send className="mr-2 h-4 w-4" /> Enviar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Contexto</p>
              <Row label="Cliente" value={op.client} />
              <Row label="Plataforma" value={op.platform} />
              <Row label="Valor" value={currency(op.budget)} />
              <Row label="Prazo" value={op.deadline} />
              <Row label="Score" value={`${op.score}/100`} />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Sugestões do Redator</p>
              <p className="text-xs text-muted-foreground">Tom mais direto ao ponto</p>
              <p className="text-xs text-muted-foreground">Adicionar case de sucesso similar</p>
              <p className="text-xs text-muted-foreground">Reduzir escopo para caber no orçamento</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}