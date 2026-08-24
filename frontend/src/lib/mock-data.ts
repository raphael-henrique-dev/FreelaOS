export type AgentStatus = "working" | "idle" | "monitoring";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  lastActivity: string;
  metricLabel: string;
  metricValue: string;
  color: string;
  emoji: string;
}

export const agents: Agent[] = [];

export interface Opportunity {
  id: string;
  title: string;
  client: string;
  clientReviews: number;
  platform: "Workana" | "99Freelas" | "Upwork" | "Freelancer";
  stack: string[];
  budget: number;
  deadline: string;
  score: number;
  status: "Nova" | "Analisando" | "Proposta enviada" | "Em negociação" | "Ganha" | "Perdida";
  description: string;
  reasons: { positive: string[]; negative: string[] };
  createdAt: string;
}

export const opportunities: Opportunity[] = [];

export interface Client {
  id: string;
  name: string;
  avatar: string;
  projects: number;
  totalValue: number;
  lastContact: string;
  status: "Ativo" | "Prospecção" | "Inativo";
  notes: string;
  history: { date: string; text: string }[];
}

export const clients: Client[] = [];

export interface Project {
  id: string;
  title: string;
  client: string;
  deadline: string;
  value: number;
  status: "backlog" | "andamento" | "aguardando" | "concluido";
  stack: string[];
}

export const projects: Project[] = [];

export interface Invoice {
  id: string;
  client: string;
  project: string;
  value: number;
  status: "Pago" | "Pendente" | "Atrasado";
  date: string;
}

export const invoices: Invoice[] = [];

export const opportunitiesPerDay: { day: string; count: number }[] = [];

export const revenuePerMonth: { month: string; value: number }[] = [];

export const dashboardStats = {
  found: 0,
  proposals: 0,
  responseRate: 0,
  closed: 0,
  revenue: 0,
};

export function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export function scoreColor(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Nova":
    case "Ativo":
    case "Pago":
    case "Ganha":
      return "default";
    case "Pendente":
    case "Analisando":
    case "Prospecção":
    case "Proposta enviada":
    case "Em negociação":
    case "Aguardando resposta":
      return "secondary";
    case "Atrasado":
    case "Perdida":
      return "destructive";
    case "Inativo":
    case "Não contatado":
    default:
      return "outline";
  }
}