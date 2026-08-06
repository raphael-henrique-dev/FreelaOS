import { useState, useMemo } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAgentActivities } from "@/queries/agentes";
import { 
  Search, 
  Brain, 
  PenTool, 
  Send, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  Activity, 
  Filter,
  Bot
} from "lucide-react";

interface AgentLogsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  selectedAgent?: string | null;
}

const AGENT_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  Scout: {
    label: "Scout IA",
    icon: Search,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/30",
  },
  Analista: {
    label: "Analista IA",
    icon: Brain,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/30",
  },
  Redator: {
    label: "Redator IA",
    icon: PenTool,
    color: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/30",
  },
  Sender: {
    label: "Sender IA",
    icon: Send,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
  Nexus: {
    label: "Nexus IA",
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  Assistente: {
    label: "Nexus IA",
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  Motor: {
    label: "Motor Central",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  },
};

export function AgentLogsSheet({ open, onOpenChange, userId, selectedAgent }: AgentLogsSheetProps) {
  const [agentFilter, setAgentFilter] = useState<string>(selectedAgent || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: logs, isLoading, refetch, isFetching } = useAgentActivities(userId, 100);

  // Sincroniza filtro se selectedAgent mudar externamente
  useMemo(() => {
    if (selectedAgent) {
      setAgentFilter(selectedAgent);
    } else {
      setAgentFilter("all");
    }
  }, [selectedAgent]);

  const filteredLogs = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];

    return logs.filter((log: any) => {
      // Filtro por Agente
      if (agentFilter !== "all") {
        const target = agentFilter.toLowerCase();
        const current = (log.agente || "").toLowerCase();
        const isNexusMatch = (target === "nexus" || target === "assistente") && (current === "nexus" || current === "assistente");
        if (current !== target && !isNexusMatch) {
          return false;
        }
      }

      // Filtro por Status
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }

      // Filtro por Busca de Texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const acao = (log.acao || "").toLowerCase();
        const plataforma = (log.detalhes?.plataforma || "").toLowerCase();
        const titulo = (log.detalhes?.titulo || "").toLowerCase();
        if (!acao.includes(query) && !plataforma.includes(query) && !titulo.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, agentFilter, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sucesso":
      case "concluido":
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] gap-1 py-0">
            <CheckCircle2 className="h-3 w-3" /> {status === "concluido" ? "Concluído" : "Sucesso"}
          </Badge>
        );
      case "processando":
        return (
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] gap-1 py-0">
            <Loader2 className="h-3 w-3 animate-spin" /> Em execução
          </Badge>
        );
      case "alerta":
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] gap-1 py-0">
            <AlertTriangle className="h-3 w-3" /> Alerta
          </Badge>
        );
      case "erro":
        return (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-[10px] gap-1 py-0">
            <AlertCircle className="h-3 w-3" /> Falha
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px] py-0">
            {status}
          </Badge>
        );
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l border-border/80 z-50">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">Histórico de Atividades dos Agentes</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Registros em tempo real das execuções do motor e dos agentes IA.
                </SheetDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isFetching}
              className="h-8 w-8 rounded-lg shrink-0 mr-6"
              title="Atualizar Logs"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            </Button>
          </div>

          {/* Barra de Busca e Filtros */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por ação, plataforma ou vaga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30 border-border/60"
              />
            </div>

            {/* Filtros por Agente */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Agente:
              </span>
              {[
                { id: "all", label: "Todos" },
                { id: "Scout", label: "Scout" },
                { id: "Analista", label: "Analista" },
                { id: "Redator", label: "Redator" },
                { id: "Sender", label: "Sender" },
                { id: "Nexus", label: "Nexus" },
                { id: "Motor", label: "Motor" },
              ].map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => setAgentFilter(ag.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    agentFilter.toLowerCase() === ag.id.toLowerCase()
                      ? "bg-primary/20 border-primary/50 text-primary font-semibold"
                      : "bg-card/40 border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>

            {/* Filtros por Status */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">Status:</span>
              {[
                { id: "all", label: "Todos" },
                { id: "processando", label: "Em execução" },
                { id: "sucesso", label: "Sucesso" },
                { id: "concluido", label: "Concluído" },
                { id: "alerta", label: "Alerta" },
                { id: "erro", label: "Falha" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                    statusFilter === st.id
                      ? "bg-foreground/15 border-foreground/30 text-foreground font-semibold"
                      : "bg-transparent border-border/40 text-muted-foreground/80 hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Registros com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Carregando histórico de logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center p-6 rounded-2xl border border-dashed border-border/60 bg-card/20">
              <Bot className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Nenhum registro encontrado</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {searchQuery || agentFilter !== "all" || statusFilter !== "all"
                  ? "Tente ajustar os filtros acima para visualizar outros logs."
                  : "Os registros das ações dos agentes aparecerão aqui automaticamente."}
              </p>
            </div>
          ) : (
            filteredLogs.map((log: any) => {
              const meta = AGENT_META[log.agente] || AGENT_META.Motor;
              const Icon = meta.icon;

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/50 bg-card/40 p-3.5 transition-all hover:bg-card/70 hover:border-border/80 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg border ${meta.bg} ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        (Etapa {log.etapa}/4)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Clock className="h-3 w-3" />
                        {formatLogDate(log.criado_em)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                    {log.acao}
                  </p>

                  {/* Metadados / Detalhes */}
                  {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {log.detalhes.plataforma && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/60 bg-muted/40 font-normal">
                          {log.detalhes.plataforma}
                        </Badge>
                      )}
                      {log.detalhes.score !== undefined && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0 font-normal ${
                            log.detalhes.score >= 70 
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" 
                              : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          }`}
                        >
                          Score: {log.detalhes.score}%
                        </Badge>
                      )}
                      {log.detalhes.vaga_id && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/40 text-muted-foreground font-mono">
                          ID: #{log.detalhes.vaga_id.slice(0, 8)}
                        </Badge>
                      )}
                      {log.detalhes.total_vagas !== undefined && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                          {log.detalhes.total_vagas} vaga(s)
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-border/60 bg-card/20 text-center">
          <p className="text-[11px] text-muted-foreground">
            Exibindo {filteredLogs.length} registro(s) recente(s)
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
