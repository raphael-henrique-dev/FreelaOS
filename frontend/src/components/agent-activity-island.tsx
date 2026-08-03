import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Bot, 
  Search, 
  Brain, 
  PenTool, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AgentActivity {
  id: string;
  perfil_id: string;
  agente: "Scout" | "Analista" | "Redator" | "Sender" | "Motor" | string;
  acao: string;
  status: "processando" | "sucesso" | "alerta" | "erro" | "concluido" | string;
  etapa: number;
  detalhes?: {
    vaga_id?: string;
    titulo?: string;
    score?: number;
    plataforma?: string;
    total_vagas?: number;
  };
  criado_em: string;
}

const AGENT_CONFIGS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  Scout: {
    label: "Scout IA",
    icon: Search,
    color: "text-sky-400",
    bg: "bg-sky-500/15 border-sky-500/30"
  },
  Analista: {
    label: "Analista IA",
    icon: Brain,
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30"
  },
  Redator: {
    label: "Redator IA",
    icon: PenTool,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30"
  },
  Sender: {
    label: "Sender IA",
    icon: Send,
    color: "text-purple-400",
    bg: "bg-purple-500/15 border-purple-500/30"
  },
  Motor: {
    label: "Nexus Motor",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/15 border-primary/30"
  }
};

export function AgentActivityIsland() {
  const [currentActivity, setCurrentActivity] = useState<AgentActivity | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let channel: any = null;

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      channel = supabase
        .channel("agent-activities-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "atividades_agentes" },
          (payload) => {
            const newActivity = payload.new as AgentActivity;
            if (newActivity.perfil_id !== userId) return;

            setCurrentActivity(newActivity);
            setIsVisible(true);

            // Limpa timer anterior se houver
            if (dismissTimerRef.current) {
              clearTimeout(dismissTimerRef.current);
              dismissTimerRef.current = null;
            }

            // Tratamento de erro: Notifica via Toast
            if (newActivity.status === "erro") {
              toast.error(`Falha no ${newActivity.agente}: ${newActivity.acao}`);
            }

            // Tratamento de conclusão de ciclo: Espera 10 segundos antes de ocultar
            if (newActivity.status === "concluido") {
              dismissTimerRef.current = setTimeout(() => {
                setIsVisible(false);
                setIsExpanded(false);
              }, 10000);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!isVisible || !currentActivity) return null;

  const agentConfig = AGENT_CONFIGS[currentActivity.agente] || AGENT_CONFIGS.Motor;
  const AgentIcon = agentConfig.icon;
  const progressPercent = Math.min(100, Math.max(15, (currentActivity.etapa / 4) * 100));

  const isProcessing = currentActivity.status === "processando";
  const isDone = currentActivity.status === "concluido";
  const isError = currentActivity.status === "erro";

  return (
    <div 
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`cursor-pointer overflow-hidden rounded-3xl border border-border/80 bg-background/90 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.35)] transition-all duration-300 hover:border-primary/40 ${
          isExpanded ? "w-[440px] p-4 rounded-2xl" : "w-auto min-w-[290px] max-w-[480px] px-3.5 py-1.5"
        } ${isError ? "border-destructive/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]" : ""}`}
      >
        {/* Barra de Progresso Fina no Topo */}
        <div className="absolute top-0 left-0 h-[2px] w-full bg-muted/40 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isError ? "bg-destructive" : isDone ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modo Compacto (Pílula Padrão) */}
        {!isExpanded && (
          <div className="flex items-center gap-2.5 text-xs">
            {/* Ícone com indicador de pulso */}
            <div className="relative flex items-center justify-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${agentConfig.bg} ${agentConfig.color}`}>
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : isError ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <AgentIcon className="h-3.5 w-3.5" />
                )}
              </div>
              {isProcessing && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>

            {/* Badge do Agente */}
            <Badge variant="outline" className={`px-1.5 py-0 text-[10px] font-semibold border ${agentConfig.bg} ${agentConfig.color}`}>
              {agentConfig.label}
            </Badge>

            {/* Texto da Ação */}
            <p className="truncate font-medium text-foreground max-w-[280px]">
              {currentActivity.acao}
            </p>

            <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition-transform" />
          </div>
        )}

        {/* Modo Expandido (Hover / Click) */}
        {isExpanded && (
          <div className="space-y-3 pt-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${agentConfig.bg} ${agentConfig.color}`}>
                  <AgentIcon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {agentConfig.label}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (Etapa {currentActivity.etapa}/4)
                    </span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(currentActivity.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button> */}
            </div>

            {/* Mensagem principal */}
            <div className="rounded-lg bg-card/60 border border-border/40 p-2.5">
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {currentActivity.acao}
              </p>

              {/* Detalhes extras se houver */}
              {(currentActivity.detalhes?.score !== undefined || currentActivity.detalhes?.vaga_id || currentActivity.detalhes?.plataforma) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {currentActivity.detalhes?.plataforma && (
                    <Badge variant="outline" className="border-border/60 bg-muted/40 text-[10px] capitalize">
                      {currentActivity.detalhes.plataforma}
                    </Badge>
                  )}
                  {currentActivity.detalhes?.vaga_id && (
                    <Badge variant="outline" className="border-border/60 bg-muted/30 text-[10px] font-mono">
                      Vaga #{currentActivity.detalhes.vaga_id.slice(0, 8)}
                    </Badge>
                  )}
                  {currentActivity.detalhes?.score !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground text-[11px]">Score IA:</span>
                      <Badge 
                        variant="outline" 
                        className={currentActivity.detalhes.score >= 70 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]" : "border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]"}
                      >
                        {currentActivity.detalhes.score}% de aderência
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé do card expandido */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isProcessing ? "bg-primary animate-pulse" : isDone ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                {isProcessing ? "Agente em execução..." : isDone ? "Ciclo finalizado" : "Processado"}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                Passe o mouse para manter aberto
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
