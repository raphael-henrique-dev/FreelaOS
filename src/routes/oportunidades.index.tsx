import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, Search, Sparkles, Loader2, Trash2 } from "lucide-react";

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
import { toast } from "sonner";

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
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);

  async function handleNovaBusca() {
    try {
      setIsExtracting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.warning("Você precisa estar logado!");
        setIsExtracting(false);
        return;
      }
      
      const res = await fetch("http://localhost:8000/api/extractor/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session.user.id })
      });
      
      if (res.ok) {
        // Mostraremos um toast no futuro, por enquanto um alerta simples
        toast.success("Extrator iniciado! Ele está varrendo a web em background. As novas vagas aparecerão aqui em breve.");
      } else {
        toast.error("Erro ao iniciar extrator.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha de conexão com a API de agentes.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente ignorar esta oportunidade?")) return;
    
    // O .select() nos ajuda a verificar se a linha REALMENTE foi deletada
    const { data, error } = await supabase.from("oportunidades").delete().eq("id", id).select();
    
    if (error) {
      alert("Erro ao remover oportunidade do banco: " + error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      alert("Falha: O banco não deletou a linha. Isso geralmente significa que a tabela 'oportunidades' está com RLS (Segurança) ativada e faltam as políticas (Policies) para DELETE.");
      return;
    }

    // Se passou, tira da tela
    setOpportunities(prev => prev.filter(op => op.id !== id));
  }

  async function handleIgnorarTodas() {
    if (!confirm("Deseja realmente ignorar (remover) TODAS as oportunidades? Essa ação não pode ser desfeita.")) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from("oportunidades")
      .delete()
      .eq("perfil_id", session.user.id);
      
    if (error) {
      toast.error("Erro ao remover oportunidades: " + error.message);
      return;
    }
    
    setOpportunities([]);
    toast.success("Todas as oportunidades foram ignoradas.");
  }

  useEffect(() => {
    async function fetchOportunidades() {
      // Faz a busca na tabela OPORTUNIDADES
      const { data: { session } } = await supabase.auth.getSession();
      
      let query = supabase.from("oportunidades").select("*");
      
      // Filtra pelo perfil do usuário caso esteja logado
      if (session?.user?.id) {
        query = query.eq("perfil_id", session.user.id);
      }
      
      const { data, error } = await query.order("criado_em", { ascending: false });
      
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
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              onClick={handleIgnorarTodas}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Ignorar todas oportunidades
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-primary text-primary-foreground"
              onClick={handleNovaBusca}
              disabled={isExtracting}
            >
              {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isExtracting ? "Varrendo a web..." : "Nova busca"}
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
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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

              {opportunities.map((op: any) => (
                <TableRow key={op.id} className="border-border/50">
                  <TableCell className="max-w-[400px]">
                    <div className="flex flex-col gap-1.5 py-1">
                      <Link to="/oportunidades/$id" params={{ id: op.id }} className="font-medium hover:text-primary text-base leading-tight">
                        {op.title}
                      </Link>

                      {/* Stacks */}
                      {op.stack && op.stack.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {op.stack.slice(0, 4).map((s: string) => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 bg-background/40 text-muted-foreground">
                              {s}
                            </span>
                          ))}
                          {op.stack.length > 4 && <span className="text-[10px] text-muted-foreground">+{op.stack.length - 4}</span>}
                        </div>
                      )}

                      {/* Parecer do Analista IA */}
                      {op.explicacao_score && (
                        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
                          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                            <span className="font-medium text-foreground/80">Parecer IA:</span> {op.explicacao_score}
                          </p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground align-top pt-4">{op.client}</TableCell>
                  <TableCell className="align-top pt-4">
                    <Badge variant="outline" className="text-xs whitespace-nowrap bg-background/50">
                      {op.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top pt-4 font-medium text-foreground">R$ {op.budget}</TableCell>
                  <TableCell className="text-muted-foreground align-top pt-4 text-sm">{op.deadline}</TableCell>
                  <TableCell className="align-top pt-4">
                    <span className={`font-semibold ${scoreColor(op.score || 0)}`}>{op.score || 0}/100</span>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <Badge variant={statusVariant(op.status)}>{op.status}</Badge>
                  </TableCell>
                  <TableCell className="align-top pt-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => handleDelete(op.id)}
                      title="Ignorar vaga"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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