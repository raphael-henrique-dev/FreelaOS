import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Trash2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/page-header";
import { currency, scoreColor, statusVariant } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";

export const Route = createFileRoute("/oportunidades/$id")({
  loader: async ({ params }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data } = await api.get(`/api/opportunities/${params.id}`);
      if (!data) throw notFound();
      
      // Busca os ids para navegação (Prev / Next)
      let prevId = null;
      let nextId = null;
      
      if (session?.user?.id) {
        const { data: allOps } = await api.get(`/api/opportunities?user_id=${session.user.id}`);
          
        if (allOps) {
          let search = "";
          let statuses = [];
          let platforms = [];
          let minScore = 0;
          if (typeof window !== "undefined") {
            search = localStorage.getItem("freelaos_ops_search") || "";
            statuses = JSON.parse(localStorage.getItem("freelaos_ops_statuses") || "[]");
            platforms = JSON.parse(localStorage.getItem("freelaos_ops_platforms") || "[]");
            minScore = parseInt(localStorage.getItem("freelaos_ops_score") || "0", 10);
          }

          const filteredOps = allOps.filter((op: any) => {
            if (op.status === "Ignorada") return false;
            
            if (search) {
              const term = search.toLowerCase();
              const titleMatch = op.titulo?.toLowerCase().includes(term);
              const clientMatch = (op.clientes?.nome || op.cliente)?.toLowerCase().includes(term);
              const stackMatch = op.stack?.some((s: string) => s.toLowerCase().includes(term));
              if (!titleMatch && !clientMatch && !stackMatch) return false;
            }
            if (statuses.length > 0 && !statuses.includes(op.status)) return false;
            if (platforms.length > 0 && !platforms.includes(op.plataforma)) return false;
            if (minScore > 0 && (op.score || 0) < minScore) return false;
            return true;
          });

          const idx = filteredOps.findIndex((o: any) => o.id === params.id);
          if (idx > 0) prevId = filteredOps[idx - 1].id; // Mais recente (Anterior na tela)
          if (idx !== -1 && idx < filteredOps.length - 1) nextId = filteredOps[idx + 1].id; // Mais antiga (Próxima)
        }
      }
      
      // Mapeia para um formato mais limpo para o frontend
      const op = {
        id: data.id,
        title: data.titulo,
        client: data.clientes?.nome || data.cliente || "Confidencial",
        platform: data.plataforma,
        status: data.status,
        createdAt: new Date(data.criado_em).toLocaleDateString("pt-BR"),
        description: data.descricao,
        budget: data.orcamento,
        deadline: data.prazo,
        stack: data.stack || [],
        score: data.score || 0,
        explicacao: data.explicacao_score || "Nenhum parecer gerado.",
        url: data.url || "",
        proposta_ia: data.proposta_ia || "",
      };
      return { op, prevId, nextId };
    } catch(e) {
      console.error(e);
      throw notFound();
    }
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
  const { op, prevId, nextId } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [loadingParecer, setLoadingParecer] = useState(false);

  async function handleGerarParecer() {
    setLoadingParecer(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Usuário não logado");
      
      const res = await api.post("/api/analista/evaluate", { vaga_id: op.id, user_id: session.user.id });
      
      // Recarrega para buscar os dados frescos (score, status, parecer)
      window.location.reload();
    } catch (e: any) {
      alert("Erro ao acionar Analista IA: " + e.message);
    } finally {
      setLoadingParecer(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Deseja realmente ignorar esta oportunidade?")) return;
    try {
      await api.delete(`/api/opportunities/${op.id}`);
      navigate({ to: "/oportunidades" });
    } catch (error: any) {
      alert("Erro ao remover oportunidade: " + error.message);
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            disabled={!prevId} 
            onClick={() => prevId && navigate({ to: "/oportunidades/$id", params: { id: prevId } })}
            title="Oportunidade mais recente (Anterior)"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            disabled={!nextId} 
            onClick={() => nextId && navigate({ to: "/oportunidades/$id", params: { id: nextId } })}
            title="Oportunidade mais antiga (Próxima)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
              {op.client}
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

            <div className="flex gap-3">
              {op.status === "Aguardando Análise" ? (
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  onClick={handleGerarParecer}
                  disabled={loadingParecer}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> 
                  {loadingParecer ? "Analisando..." : "Gerar parecer do Analista IA"}
                </Button>
              ) : op.proposta_ia && op.proposta_ia.trim() !== "" ? (
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  onClick={() => navigate({ to: "/propostas/$id", params: { id: op.id } })}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Ver proposta gerada por IA
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  onClick={() => navigate({ to: "/propostas/$id", params: { id: op.id } })}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Gerar proposta com Redator IA
                </Button>
              )}
              
              {op.url && (
                <Button size="lg" variant="outline" asChild>
                  <a href={op.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> URL da vaga
                  </a>
                </Button>
              )}

              <Button
                size="lg"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Ignorar
              </Button>
            </div>
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
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                 <span className="flex items-center font-semibold text-primary">
                   <Sparkles className="mr-1.5 h-4 w-4" />
                   Parecer do Agente
                 </span>
                 <p className="text-foreground/90 leading-relaxed">
                   {op.explicacao}
                 </p>
              </div>
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