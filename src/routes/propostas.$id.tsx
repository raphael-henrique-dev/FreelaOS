import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Save, Send, Sparkles, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      valor_proposta: data.valor_proposta || 0,
      prazo_proposta: data.prazo_proposta || "",
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
  const [valor, setValor] = useState(0);
  const [prazo, setPrazo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [modelo, setModelo] = useState("");
  const [isSentLocal, setIsSentLocal] = useState(false);
  
  const isSent = (op.status === "Proposta enviada") || isSentLocal;

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
      setValor(json.valor || 0);
      setPrazo(json.prazo || "");
      setModelo(json.modelo_utilizado || "padrao");
      if (isManual) toast.success("Nova proposta gerada com sucesso!");
    } catch (e) {
      toast.error("Falha ao gerar proposta com Redator IA.");
      setText("Erro ao conectar com o Agente Redator.");
    } finally {
      setLoading(false);
    }
  }

  async function submitProposta() {
    setSending(true);
    toast.info("Enviando proposta invisível pelo robô...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      const res = await fetch("http://localhost:8000/api/sender/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          vaga_id: op.id, 
          user_id: session.user.id,
          texto: text,
          valor: valor,
          prazo: prazo
        })
      });
      
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message);
        setIsSentLocal(true);
      } else {
        toast.error(json.detail || "Erro inesperado ao enviar.");
      }
    } catch (e: any) {
      toast.error(e.message || "Falha na comunicação com o robô.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (op.proposta_ia) {
      setText(op.proposta_ia);
      setValor(op.valor_proposta);
      setPrazo(op.prazo_proposta);
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
              disabled={loading || isSent}
              className="min-h-[400px] resize-none border-border/50 bg-background/40 font-mono text-sm leading-relaxed"
            />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Valor Estimado pela IA (R$)</Label>
                <Input 
                  type="number" 
                  value={valor} 
                  onChange={(e) => setValor(Number(e.target.value))} 
                  disabled={loading || isSent}
                  className="mt-1 border-border/50 bg-background/40"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prazo Estimado pela IA</Label>
                <Input 
                  type="text" 
                  value={prazo} 
                  onChange={(e) => setPrazo(e.target.value)} 
                  disabled={loading || isSent}
                  placeholder="Ex: 7 dias"
                  className="mt-1 border-border/50 bg-background/40"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/50 pt-4">
              <Button variant="outline" asChild disabled={loading || sending}>
                <Link to="/oportunidades/$id" params={{ id: op.id }}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Ir para oportunidade
                </Link>
              </Button>
              {isSent ? (
                <div className="flex items-center text-green-500 font-medium ml-2">
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Proposta enviada ao cliente
                </div>
              ) : (
                <>
                  <Button variant="outline" onClick={() => fetchRedatorAPI(true)} disabled={loading || sending}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Gerar nova proposta
                  </Button>
                  <Button variant="outline" onClick={() => toast.success("Proposta salva como rascunho")} disabled={loading || sending}>
                    <Save className="mr-2 h-4 w-4" /> Salvar
                  </Button>
                  <Button
                    className="bg-gradient-primary text-primary-foreground shadow-glow"
                    onClick={submitProposta}
                    disabled={loading || sending}
                  >
                    {sending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {sending ? "Enviando..." : "Enviar e Aplicar Diretamente"}
                  </Button>
                </>
              )}
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