import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, MessageSquare, ExternalLink, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Caixa de Entrada · FreelaOS" }] }),
  component: InboxPage,
});

function InboxPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    async function fetchInbox() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("mensagens")
        .select(`
          *,
          clientes(nome),
          oportunidades(titulo)
        `)
        .eq("perfil_id", session.user.id)
        .order("data_recebimento", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar mensagens");
      } else if (data) {
        setMessages(data);
      }
      setLoading(false);
    }
    fetchInbox();
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("mensagens")
      .update({ lida: true })
      .eq("id", id);
      
    if (error) {
      toast.error("Erro ao atualizar status.");
    } else {
      setMessages(messages.map(m => m.id === id ? { ...m, lida: true } : m));
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { error } = await supabase
      .from("mensagens")
      .update({ lida: true })
      .eq("perfil_id", session.user.id)
      .eq("lida", false);

    if (error) {
      toast.error("Erro ao atualizar mensagens.");
    } else {
      setMessages(messages.map(m => ({ ...m, lida: true })));
      toast.success("Todas as mensagens marcadas como lidas.");
    }
  };

  const unreadCount = messages.filter(m => !m.lida).length;

  return (
    <PageContainer>
      <PageHeader 
        title="Caixa de Entrada" 
        description="Monitoramento das mensagens recebidas das plataformas conectadas." 
        actions={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar todas como lidas
            </Button>
          )
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>Carregando caixa de entrada...</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-muted/30">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Sua caixa de entrada está limpa!</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            O robô monitor está rodando e enviará notificações quando novos clientes responderem as propostas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card 
              key={msg.id} 
              className={`overflow-hidden border-border/60 transition-colors ${msg.lida ? 'bg-background/40 opacity-80' : 'bg-card/80 border-primary/20 shadow-glow'}`}
            >
              <div className="flex flex-col md:flex-row md:items-start p-4 gap-4">
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold truncate ${!msg.lida && 'text-primary'}`}>{msg.remetente_nome}</h4>
                    {!msg.lida && <Badge variant="default" className="text-[10px] h-5 px-1.5">NOVA</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto md:ml-2">
                      {new Date(msg.data_recebimento).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  
                  {/* Contexto do Cliente/Projeto se houver */}
                  {(msg.clientes?.nome || msg.oportunidades?.titulo) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {msg.clientes?.nome && (
                        <span className="inline-flex items-center bg-muted/40 rounded px-1.5 py-0.5 border border-border/40">
                          <User className="mr-1 h-3 w-3" /> Cliente: {msg.clientes.nome}
                        </span>
                      )}
                      {msg.oportunidades?.titulo && (
                        <span className="inline-flex items-center bg-muted/40 rounded px-1.5 py-0.5 border border-border/40 truncate max-w-[200px]">
                          Projeto: {msg.oportunidades.titulo}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-sm mt-2 leading-relaxed text-foreground/90 whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/30">
                    {msg.conteudo}
                  </p>
                </div>
                
                <div className="flex md:flex-col gap-2 shrink-0 md:w-32">
                  {!msg.lida && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => markAsRead(msg.id)}>
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Lida
                    </Button>
                  )}
                  {msg.url_origem && (
                    <Button variant="secondary" size="sm" className="w-full text-xs" asChild>
                      <a href={msg.url_origem} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> Responder
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
