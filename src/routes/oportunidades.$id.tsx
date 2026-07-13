import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Sparkles, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/page-header";
import { currency, opportunities, scoreColor, statusVariant } from "@/lib/mock-data";

export const Route = createFileRoute("/oportunidades/$id")({
  loader: ({ params }) => {
    const op = opportunities.find((o) => o.id === params.id);
    if (!op) throw notFound();
    return { op };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.op.title} · FreelaOS` : "Oportunidade" },
    ],
  }),
  component: OpDetail,
  notFoundComponent: () => (
    <PageContainer>
      <p className="text-muted-foreground">Oportunidade não encontrada.</p>
    </PageContainer>
  ),
});

function OpDetail() {
  const { op } = Route.useLoaderData();
  const navigate = useNavigate();
  return (
    <PageContainer>
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/oportunidades">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border/60 bg-background/40">{op.platform}</Badge>
              <Badge variant={statusVariant(op.status)}>{op.status}</Badge>
              <span className="text-xs text-muted-foreground">{op.createdAt}</span>
            </div>
            <CardTitle className="mt-2 text-2xl leading-tight">{op.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {op.client} · {op.clientReviews} avaliações
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed text-foreground/90">{op.description}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Meta label="Valor" value={currency(op.budget)} />
              <Meta label="Prazo" value={op.deadline} />
              <Meta label="Plataforma" value={op.platform} />
              <Meta label="Cliente" value={op.client} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Stack</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {op.stack.map((s: string) => (
                  <Badge key={s} variant="outline" className="border-border/60 bg-background/40">{s}</Badge>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              onClick={() => navigate({ to: "/propostas/$id", params: { id: op.id } })}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Gerar proposta com Redator IA
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Análise da IA</CardTitle>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">Analista IA</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/40 p-5 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Score geral</p>
              <p className={`mt-1 text-5xl font-semibold ${scoreColor(op.score)}`}>
                {op.score}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Compatibilidade calculada em {(op.score / 20).toFixed(1)}s</p>
            </div>
            <div className="space-y-2">
              {op.reasons.positive.map((r: string) => (
                <Reason key={r} text={r} positive />
              ))}
              {op.reasons.negative.map((r: string) => (
                <Reason key={r} text={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function Reason({ text, positive }: { text: string; positive?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/40 p-2.5 text-sm">
      {positive ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <span className="text-foreground/90">{text}</span>
    </div>
  );
}