import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageContainer, PageHeader } from "@/components/page-header";
import { currency, statusVariant } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";
import { ClientAvatar } from "@/components/client-avatar";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes · FreelaOS" }] }),
  component: ClientesPage,
});

interface ClientData {
  id: string;
  name: string;
  avatar: string;
  fotoUrl?: string | null;
  projects: number;
  totalValue: number;
  lastContact: string;
  status: string;
  notes: string;
  history: { date: string; text: string }[];
  rawProjects: any[];
}

function ClientesPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInativos, setShowInativos] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const current = clients.find((c) => c.id === open) ?? null;


  const handleDeleteInactive = async () => {
    if (!confirm("Tem certeza que deseja apagar permanentemente os clientes inativos e suas oportunidades?")) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      await api.delete("/api/clients/inactive", { params: { perfil_id: session.user.id } });
      setClients(prev => prev.filter(c => c.status !== "Inativo"));
      setShowInativos(false);
      toast?.success ? toast.success("Clientes inativos apagados com sucesso!") : alert("Clientes inativos apagados com sucesso!");
    } catch (err) {
      console.error(err);
      toast?.error ? toast.error("Erro ao apagar clientes.") : alert("Erro ao apagar clientes.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function fetchClients() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const { data } = await api.get("/api/clients", { params: { perfil_id: session.user.id } });
        
        if (!data) {
          console.warn("Nenhum dado retornado da API de clientes.");
          return;
        }

        const validStatuses = ["Proposta enviada", "Em negociação", "Proposta aceita", "Projeto fechado", "Finalizado"];
        
        const mapped = data.map((c: any) => {
          const ops = c.oportunidades || [];
          const validOps = ops.filter((o: any) => validStatuses.includes(o.status));
          
          if (validOps.length === 0 || c.status === "Não contatado") return null;
          
          const totalValue = validOps.reduce((sum: number, o: any) => sum + (o.valor_proposta || 0), 0);
          
          return {
            id: c.id,
            name: c.nome,
            avatar: c.nome.substring(0, 2).toUpperCase(),
            fotoUrl: c.foto_url || null,
            projects: validOps.length,
            totalValue: totalValue > 0 ? totalValue : Number(c.valor_total || 0),
            lastContact: c.ultimo_contato ? new Date(c.ultimo_contato).toLocaleDateString("pt-BR") : "Nenhum contato",
            status: c.status || "Ativo",
            notes: "Anotações e acompanhamentos futuros serão exibidos aqui.",
            history: [
              { date: new Date(c.criado_em).toLocaleDateString("pt-BR"), text: "Cliente cadastrado no sistema." }
            ],
            rawProjects: validOps
          };
        }).filter(Boolean) as ClientData[];
        
        setClients(mapped);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchClients();
  }, []);

  return (
    <PageContainer>
      <PageHeader title="Clientes" description="Todo o relacionamento comercial em um só lugar, gerado a partir das propostas enviadas." />

      <div className="flex justify-end gap-2 mb-4 px-1">
        <button 
          onClick={() => setShowInativos(!showInativos)}
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${showInativos ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'}`}
        >
          {showInativos ? "Ocultar Inativos" : "Ver Inativos"}
        </button>

        {showInativos && (
          <button 
            onClick={handleDeleteInactive}
            disabled={isDeleting}
            className="text-sm px-3 py-1.5 rounded-md border transition-colors bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            <Trash className="inline-block mr-1 h-4 w-4" />
            {isDeleting ? "Apagando..." : "Excluir Inativos"}
          </button>
        )}
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Último contato</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                    Carregando carteira de clientes...
                  </TableCell>
                </TableRow>
              )}
              {!loading && clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum cliente ativo ainda. Envie uma proposta para um projeto e ele aparecerá aqui.
                  </TableCell>
                </TableRow>
              )}
              {!loading && clients.filter(c => showInativos ? c.status === "Inativo" : c.status !== "Inativo").map((c) => (
                <TableRow key={c.id} className="cursor-pointer border-border/50 transition-colors hover:bg-muted/50" onClick={() => setOpen(c.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ClientAvatar nome={c.name} fotoUrl={c.fotoUrl} className="h-9 w-9" />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.projects}</TableCell>
                  <TableCell className="font-medium text-primary/90">{currency(c.totalValue)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.lastContact}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status) as any}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!current} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full border-l border-border/60 bg-card sm:max-w-lg">
          {current ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <ClientAvatar nome={current.name} fotoUrl={current.fotoUrl} className="h-10 w-10" />
                  {current.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5 px-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Metric label="Projetos" value={current.projects.toString()} />
                  <Metric label="Faturamento" value={currency(current.totalValue)} />
                  <Metric label="Status" value={current.status} />
                </div>
                <section>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Projetos deste cliente</p>
                  <div className="mt-2 space-y-2">
                    {current.rawProjects?.map((proj) => (
                      <Link 
                        key={proj.id} 
                        to="/oportunidades/$id"
                        params={{ id: proj.id }}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 p-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="font-medium text-foreground truncate">{proj.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{currency(proj.valor_proposta || 0)}</p>
                        </div>
                        <Badge variant={statusVariant(proj.status) as any} className="shrink-0">{proj.status}</Badge>
                      </Link>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Histórico Automático</p>
                  <div className="mt-2 space-y-2">
                    {current.history.map((h, i) => (
                      <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">{h.date}</p>
                        <p className="mt-0.5">{h.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Notas</p>
                  <p className="mt-2 text-sm text-foreground/90">{current.notes}</p>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground/90">{value}</p>
    </div>
  );
}