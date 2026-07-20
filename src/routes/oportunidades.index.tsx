import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/core/api";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { supabase } from "@/lib/supabase"; 
import { scoreColor, statusVariant } from "@/lib/mock-data";
import { toast } from "sonner";
import { useOportunidades, useDeleteOportunidade } from "@/queries/oportunidades";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/oportunidades/")({
  head: () => ({
    meta: [
      { title: "Oportunidades · FreelaOS" },
      { name: "description", content: "Projetos encontrados pelos seus agentes de IA nas plataformas de freelancer." },
    ],
  }),
  component: OpListContainer,
});

function groupOpportunitiesByDate(ops: any[]) {
  const groups: Record<string, any[]> = {};
  ops.forEach(op => {
    let dateStr = "Sem Data";
    if (op.criado_em) {
       const date = new Date(op.criado_em);
       dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(op);
  });
  
  const orderedKeys = Array.from(new Set(ops.map(op => {
    if (op.criado_em) return new Date(op.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return "Sem Data";
  })));
  
  return orderedKeys.map(k => ({ date: k, items: groups[k] }));
}

function OpListContainer() {
  const { data: rawOpportunities, isLoading, error } = useOportunidades();
  
  const opportunities = (rawOpportunities || []).map((item: any) => ({
    id: item.id,
    title: item.titulo,
    client: item.clientes?.nome || item.cliente || "Desconhecido",
    platform: item.plataforma,
    stack: item.stack || [],
    budget: item.orcamento,
    deadline: item.prazo,
    score: item.score,
    status: item.status,
    criado_em: item.criado_em,
    explicacao_score: item.explicacao_score
  })).filter((op: any) => op.status !== "Ignorada");

  if (error) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center text-destructive">
          Erro ao carregar oportunidades. {(error as Error).message}
        </div>
      </PageContainer>
    );
  }

  return <OpList opportunities={opportunities} isLoading={isLoading} />;
}

function OpList({ opportunities, isLoading }: { opportunities: any[], isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem("freelaos_ops_search") || "");
  const [filterStatuses, setFilterStatuses] = useState<string[]>(() => {
    const saved = localStorage.getItem("freelaos_ops_statuses");
    return saved ? JSON.parse(saved) : [];
  });
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>(() => {
    const saved = localStorage.getItem("freelaos_ops_platforms");
    return saved ? JSON.parse(saved) : [];
  });
  const [filterMinScore, setFilterMinScore] = useState<number>(() => {
    const saved = localStorage.getItem("freelaos_ops_score");
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [isExtracting, setIsExtracting] = useState(false);
  const queryClient = useQueryClient();
  const { mutateAsync: deleteOportunidade } = useDeleteOportunidade();

  useEffect(() => { localStorage.setItem("freelaos_ops_search", searchTerm); }, [searchTerm]);
  useEffect(() => { localStorage.setItem("freelaos_ops_statuses", JSON.stringify(filterStatuses)); }, [filterStatuses]);
  useEffect(() => { localStorage.setItem("freelaos_ops_platforms", JSON.stringify(filterPlatforms)); }, [filterPlatforms]);
  useEffect(() => { localStorage.setItem("freelaos_ops_score", filterMinScore.toString()); }, [filterMinScore]);

  const filteredOps = opportunities.filter((op: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const titleMatch = op.title?.toLowerCase().includes(term);
      const clientMatch = op.client?.toLowerCase().includes(term);
      const stackMatch = op.stack?.some((s: string) => s.toLowerCase().includes(term));
      if (!titleMatch && !clientMatch && !stackMatch) return false;
    }
    if (filterStatuses.length > 0 && !filterStatuses.includes(op.status)) return false;
    if (filterPlatforms.length > 0 && !filterPlatforms.includes(op.platform)) return false;
    if (filterMinScore > 0 && (op.score || 0) < filterMinScore) return false;
    return true;
  });

  const groupedOps = groupOpportunitiesByDate(filteredOps);

  async function handleNovaBusca() {
    try {
      setIsExtracting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.warning("Você precisa estar logado!");
        return;
      }
      
      const res = await api.post("/api/extractor/run", { user_id: session.user.id });
      if (res.data) {
        toast.success("Extrator iniciado! Ele está varrendo a web em background.");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Falha de conexão com a API.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleWipeAll() {
    if (!confirm("Deseja realmente ignorar TODAS as oportunidades? Essa ação não pode ser desfeita.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      const { error } = await supabase.from("oportunidades").update({ status: "Ignorada" }).eq("perfil_id", session.user.id);
      if (error) throw error;
      
      toast.success("Todas as oportunidades foram ignoradas.");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover oportunidades.");
    }
  }
  
  async function handleIgnorarDia(items: any[]) {
    if (!confirm(`Deseja ignorar as ${items.length} oportunidades deste dia?`)) return;
    try {
      const ids = items.map(op => op.id);
      const { error } = await supabase.from("oportunidades").update({ status: "Ignorada" }).in("id", ids);
      if (error) throw error;
      
      toast.success("Oportunidades do dia foram ignoradas.");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao ignorar.");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Oportunidades"
        description="Projetos coletados por Scout IA e qualificados por Analista IA."
        actions={
          <OpActions 
            handleWipeAll={handleWipeAll}
            handleNovaBusca={handleNovaBusca}
            isExtracting={isExtracting}
            filterStatuses={filterStatuses}
            setFilterStatuses={setFilterStatuses}
            filterPlatforms={filterPlatforms}
            setFilterPlatforms={setFilterPlatforms}
            filterMinScore={filterMinScore}
            setFilterMinScore={setFilterMinScore}
          />
        }
      />

      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por título, cliente ou stack..." 
              className="border-border/50 bg-background/40 pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8 mt-6">
        {isLoading && (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-8 text-center text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
              Carregando oportunidades da base de dados...
            </CardContent>
          </Card>
        )}

        {!isLoading && opportunities.length === 0 && (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma oportunidade encontrada ainda. Que tal rodar o Scout IA?
            </CardContent>
          </Card>
        )}

        {!isLoading && groupedOps.map(group => (
          <div key={group.date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-3 ml-1">
              <h3 className="text-lg font-semibold text-foreground/90 flex items-center">
                <div className="h-2 w-2 rounded-full bg-primary/80 mr-2"></div>
                {group.date}
                <Badge variant="secondary" className="ml-3 text-xs opacity-70">
                  {group.items.length} {group.items.length === 1 ? 'vaga' : 'vagas'}
                </Badge>
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white h-7 text-xs px-2"
                onClick={() => handleIgnorarDia(group.items)}
              >
                <Trash2 className="mr-1.5 h-3 w-3" /> Ignorar todas deste dia
              </Button>
            </div>
            <OpTable groupItems={group.items} handleDelete={(id) => deleteOportunidade(id)} />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

function OpActions({ 
  handleWipeAll, handleNovaBusca, isExtracting, 
  filterStatuses, setFilterStatuses, 
  filterPlatforms, setFilterPlatforms, 
  filterMinScore, setFilterMinScore 
}: any) {
  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 mr-2 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={handleWipeAll} title="DEBUG: Apagar tudo">
        <Trash2 className="h-3 w-3"/>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={filterStatuses.length > 0 || filterPlatforms.length > 0 || filterMinScore > 0 ? "border-primary text-primary" : ""}>
            <Filter className="mr-2 h-4 w-4" /> 
            Filtrar {(filterStatuses.length > 0 || filterPlatforms.length > 0 || filterMinScore > 0) && "(Ativo)"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 shadow-xl border-border/60 bg-card/95 backdrop-blur" align="start">
          <div className="space-y-4">
            <h4 className="font-medium leading-none mb-3">Filtros</h4>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Analisada", "Pendente", "Proposta enviada"].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`status-${status}`} 
                      checked={filterStatuses.includes(status)}
                      onCheckedChange={() => setFilterStatuses((p: string[]) => p.includes(status) ? p.filter(s => s !== status) : [...p, status])}
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer">{status}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground">Plataforma</Label>
              <div className="grid grid-cols-2 gap-2">
                {["99Freelas", "Workana"].map(plat => (
                  <div key={plat} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`plat-${plat}`} 
                      checked={filterPlatforms.includes(plat)}
                      onCheckedChange={() => setFilterPlatforms((p: string[]) => p.includes(plat) ? p.filter(pl => pl !== plat) : [...p, plat])}
                    />
                    <Label htmlFor={`plat-${plat}`} className="text-sm cursor-pointer">{plat}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Score Mínimo</Label>
                <span className="text-xs font-medium text-primary">{filterMinScore}</span>
              </div>
              <Slider 
                value={[filterMinScore]} 
                max={100} 
                step={5} 
                onValueChange={(val) => setFilterMinScore(val[0])} 
              />
            </div>
            
            {(filterStatuses.length > 0 || filterPlatforms.length > 0 || filterMinScore > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
                onClick={() => { setFilterStatuses([]); setFilterPlatforms([]); setFilterMinScore(0); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Button 
        variant="outline" 
        size="sm" 
        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
        onClick={handleWipeAll}
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
  );
}

function OpTable({ groupItems, handleDelete }: { groupItems: any[], handleDelete: (id: string) => void }) {
  return (
    <Card className="border-border/60 bg-card/60 overflow-hidden">
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
            {groupItems.map((op: any) => (
              <TableRow key={op.id} className="border-border/50">
                <TableCell className="max-w-[400px]">
                  <div className="flex flex-col gap-1.5 py-1">
                    <Link to="/oportunidades/$id" params={{ id: op.id }} className="font-medium hover:text-primary text-base leading-tight">
                      {op.title}
                    </Link>

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
  );
}