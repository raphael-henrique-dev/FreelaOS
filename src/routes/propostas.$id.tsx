import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Save, Send, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/page-header";
import { currency, statusVariant } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/propostas/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("oportunidades").select("*").eq("id", params.id).single();
    if (!data) throw notFound();

    const op = {
      id: data.id,
      title: data.titulo,
      client: data.cliente || "Confidencial",
      platform: data.plataforma,
      status: data.status,
      description: data.descricao,
      budget: data.orcamento,
      deadline: data.prazo,
      stack: data.stack || [],
      score: data.score || 0,
      proposta_ia: data.proposta_ia || "",
    };
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
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelo, setModelo] = useState("");

  async function fetchRedatorAPI(isManual: boolean = false) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      const res = await fetch("http://localhost:8000/api/redator/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaga_id: op.id, user_id: session.user.id })
      });
      
      if (!res.ok) throw new Error("Erro na API");
      const json = await res.json();
      setText(json.proposta || "");
      setModelo(json.modelo_utilizado || "padrao");
      if (isManual) toast.success("Nova proposta gerada com sucesso!");
    } catch (e) {
      toast.error("Falha ao gerar proposta com Redator IA.");
      setText("Erro ao conectar com o Agente Redator.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (op.proposta_ia) {
      setText(op.proposta_ia);
      setModelo("Background Automático");
    } else {
      fetchRedatorAPI(false);
    }
  }, [op.id]);

  return (
    <PageContainer>
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/propostas">
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
                <Sparkles className="mr-1 h-3 w-3" /> Gerada pelo Redator IA {modelo ? `(${modelo})` : ""}
              </Badge>
            </div>

            <Textarea
              value={loading ? "O Redator IA está escrevendo a proposta baseada no seu perfil..." : text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="min-h-[520px] resize-none border-border/50 bg-background/40 font-mono text-sm leading-relaxed"
            />

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-4">
              <Button variant="outline" onClick={() => fetchRedatorAPI(true)} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Gerar nova proposta
              </Button>
              <Button variant="outline" onClick={() => toast.success("Proposta salva como rascunho")} disabled={loading}>
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