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

export const agents: Agent[] = [
  {
    id: "scout",
    name: "Scout IA",
    role: "Prospecção",
    description: "Vasculha Workana, 99Freelas, Upwork e Freelancer 24/7 em busca de projetos alinhados ao seu perfil.",
    status: "working",
    lastActivity: "Encontrou 8 novas oportunidades",
    metricLabel: "Precisão",
    metricValue: "91%",
    color: "oklch(0.68 0.19 265)",
    emoji: "🛰",
  },
  {
    id: "analista",
    name: "Analista IA",
    role: "Qualificação",
    description: "Calcula um score de compatibilidade cruzando stack, orçamento, prazo e reputação do cliente.",
    status: "idle",
    lastActivity: "Última análise: score 82/100",
    metricLabel: "Análises hoje",
    metricValue: "24",
    color: "oklch(0.72 0.17 160)",
    emoji: "🧠",
  },
  {
    id: "redator",
    name: "Redator IA",
    role: "Propostas",
    description: "Escreve propostas personalizadas com base no seu portfólio, tom de voz e histórico de conversão.",
    status: "working",
    lastActivity: "Gerando proposta para 'Landing page SaaS'",
    metricLabel: "Tempo médio",
    metricValue: "32s",
    color: "oklch(0.7 0.2 320)",
    emoji: "✍️",
  },
  {
    id: "assistente",
    name: "Assistente IA",
    role: "Relacionamento",
    description: "Monitora conversas, sugere respostas e mantém o funil comercial sempre atualizado.",
    status: "monitoring",
    lastActivity: "Monitorando 5 conversas ativas",
    metricLabel: "Resp. média",
    metricValue: "2m",
    color: "oklch(0.78 0.16 75)",
    emoji: "💬",
  },
  {
    id: "financeiro",
    name: "Financeiro IA",
    role: "Faturamento",
    description: "Controla notas, recebíveis e envia lembretes automáticos para clientes inadimplentes.",
    status: "idle",
    lastActivity: "3 boletos gerados hoje",
    metricLabel: "Recebido",
    metricValue: "R$ 24k",
    color: "oklch(0.65 0.2 25)",
    emoji: "💰",
  },
];

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

export const opportunities: Opportunity[] = [
  {
    id: "op-001",
    title: "Landing page para SaaS de gestão financeira",
    client: "Fintech Nova",
    clientReviews: 12,
    platform: "Workana",
    stack: ["Next.js", "Tailwind", "Framer Motion"],
    budget: 4800,
    deadline: "2 semanas",
    score: 92,
    status: "Nova",
    description:
      "Buscamos um freelancer para desenvolver uma landing page moderna e responsiva para nosso produto SaaS na área financeira. Precisamos de animações suaves, integração com HubSpot e SEO técnico.",
    reasons: {
      positive: ["Stack 100% compatível", "Orçamento acima da média", "Cliente com boas avaliações", "Prazo confortável"],
      negative: ["Escopo pode expandir"],
    },
    createdAt: "há 12min",
  },
  {
    id: "op-002",
    title: "API REST em Spring Boot para marketplace",
    client: "Marketly",
    clientReviews: 3,
    platform: "99Freelas",
    stack: ["Java", "Spring Boot", "PostgreSQL"],
    budget: 9200,
    deadline: "1 mês",
    score: 87,
    status: "Analisando",
    description: "Construção de API REST robusta para marketplace multi-vendedor com autenticação JWT, pagamentos e webhooks.",
    reasons: {
      positive: ["Stack compatível", "Boa remuneração", "Prazo confortável"],
      negative: ["Cliente novo", "Poucas avaliações"],
    },
    createdAt: "há 34min",
  },
  {
    id: "op-003",
    title: "Dashboard analytics em React",
    client: "DataPeak",
    clientReviews: 47,
    platform: "Upwork",
    stack: ["React", "Recharts", "TypeScript"],
    budget: 6500,
    deadline: "3 semanas",
    score: 84,
    status: "Proposta enviada",
    description: "Dashboard interno para visualização de métricas com filtros dinâmicos e exportação em CSV/PDF.",
    reasons: {
      positive: ["Cliente recorrente no mercado", "Stack conhecida"],
      negative: ["Prazo apertado para escopo total"],
    },
    createdAt: "há 1h",
  },
  {
    id: "op-004",
    title: "App mobile em React Native para delivery",
    client: "QuickBite",
    clientReviews: 8,
    platform: "Freelancer",
    stack: ["React Native", "Expo", "Firebase"],
    budget: 12000,
    deadline: "6 semanas",
    score: 71,
    status: "Em negociação",
    description: "App completo de delivery com geolocalização, notificações e integração com gateway de pagamento.",
    reasons: {
      positive: ["Excelente remuneração"],
      negative: ["Escopo grande", "Cliente exige exclusividade"],
    },
    createdAt: "há 2h",
  },
  {
    id: "op-005",
    title: "Integração ChatGPT em plataforma educacional",
    client: "EduSmart",
    clientReviews: 21,
    platform: "Workana",
    stack: ["Node.js", "OpenAI", "React"],
    budget: 5400,
    deadline: "3 semanas",
    score: 89,
    status: "Nova",
    description: "Adicionar tutor com IA à plataforma existente, incluindo streaming de respostas e histórico por aluno.",
    reasons: {
      positive: ["Domínio de IA valorizado", "Cliente reputado"],
      negative: ["Requer NDA"],
    },
    createdAt: "há 3h",
  },
  {
    id: "op-006",
    title: "Migração de WordPress para Next.js",
    client: "Casa & Design",
    clientReviews: 5,
    platform: "99Freelas",
    stack: ["Next.js", "Sanity", "SEO"],
    budget: 3800,
    deadline: "2 semanas",
    score: 68,
    status: "Nova",
    description: "Migrar blog com 400 posts para stack moderna preservando SEO e URLs.",
    reasons: {
      positive: ["Escopo bem definido"],
      negative: ["Orçamento apertado", "Cliente indeciso"],
    },
    createdAt: "há 5h",
  },
  {
    id: "op-007",
    title: "Automação de processos com n8n",
    client: "LogTech",
    clientReviews: 15,
    platform: "Upwork",
    stack: ["n8n", "Node.js", "APIs REST"],
    budget: 4200,
    deadline: "10 dias",
    score: 79,
    status: "Proposta enviada",
    description: "Desenhar e implementar 12 fluxos de automação conectando CRM, e-mail marketing e ERP.",
    reasons: {
      positive: ["Escopo objetivo", "Cliente decisivo"],
      negative: ["Requer disponibilidade full-time nas 2 primeiras semanas"],
    },
    createdAt: "há 6h",
  },
  {
    id: "op-008",
    title: "E-commerce headless com Shopify + Next.js",
    client: "Wear Studio",
    clientReviews: 32,
    platform: "Workana",
    stack: ["Next.js", "Shopify", "Tailwind"],
    budget: 8800,
    deadline: "5 semanas",
    score: 90,
    status: "Ganha",
    description: "Loja headless com foco em performance e experiência premium para marca de moda.",
    reasons: {
      positive: ["Cliente já aprovou proposta", "Stack dominada"],
      negative: [],
    },
    createdAt: "há 1 dia",
  },
];

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

export const clients: Client[] = [
  {
    id: "cl-001",
    name: "Fintech Nova",
    avatar: "FN",
    projects: 3,
    totalValue: 18600,
    lastContact: "hoje",
    status: "Ativo",
    notes: "Cliente estratégico. Prefere comunicação assíncrona via Slack.",
    history: [
      { date: "Hoje, 09:12", text: "Enviou briefing da landing page v2" },
      { date: "Ontem", text: "Aprovou proposta comercial" },
      { date: "3 dias atrás", text: "Reunião de kickoff realizada" },
    ],
  },
  {
    id: "cl-002",
    name: "Marketly",
    avatar: "MK",
    projects: 1,
    totalValue: 9200,
    lastContact: "há 2 dias",
    status: "Prospecção",
    notes: "Precisa de garantias contratuais. Fase de negociação.",
    history: [
      { date: "há 2 dias", text: "Solicitou ajuste no cronograma" },
      { date: "há 4 dias", text: "Recebeu proposta comercial" },
    ],
  },
  {
    id: "cl-003",
    name: "DataPeak",
    avatar: "DP",
    projects: 5,
    totalValue: 42800,
    lastContact: "há 5 dias",
    status: "Ativo",
    notes: "Cliente recorrente. Paga sempre em dia.",
    history: [
      { date: "há 5 dias", text: "Aprovou nova sprint" },
      { date: "há 2 semanas", text: "Pagamento recebido — R$ 6.500" },
    ],
  },
  {
    id: "cl-004",
    name: "Wear Studio",
    avatar: "WS",
    projects: 2,
    totalValue: 15400,
    lastContact: "há 1 semana",
    status: "Ativo",
    notes: "Foco em performance e design premium.",
    history: [{ date: "há 1 semana", text: "Kickoff do projeto headless" }],
  },
  {
    id: "cl-005",
    name: "EduSmart",
    avatar: "ES",
    projects: 0,
    totalValue: 0,
    lastContact: "há 3 dias",
    status: "Prospecção",
    notes: "Aguardando assinatura de NDA.",
    history: [{ date: "há 3 dias", text: "Primeira reunião de descoberta" }],
  },
];

export interface Project {
  id: string;
  title: string;
  client: string;
  deadline: string;
  value: number;
  status: "backlog" | "andamento" | "aguardando" | "concluido";
  stack: string[];
}

export const projects: Project[] = [
  { id: "pj-1", title: "Landing SaaS v2", client: "Fintech Nova", deadline: "12 dez", value: 4800, status: "andamento", stack: ["Next.js", "Tailwind"] },
  { id: "pj-2", title: "API Marketplace", client: "Marketly", deadline: "22 dez", value: 9200, status: "backlog", stack: ["Java", "Spring"] },
  { id: "pj-3", title: "Dashboard Analytics", client: "DataPeak", deadline: "05 dez", value: 6500, status: "aguardando", stack: ["React", "Recharts"] },
  { id: "pj-4", title: "E-commerce Headless", client: "Wear Studio", deadline: "30 nov", value: 8800, status: "andamento", stack: ["Next.js", "Shopify"] },
  { id: "pj-5", title: "Integração Chatbot", client: "EduSmart", deadline: "18 dez", value: 5400, status: "backlog", stack: ["Node", "OpenAI"] },
  { id: "pj-6", title: "Automação n8n", client: "LogTech", deadline: "10 dez", value: 4200, status: "andamento", stack: ["n8n", "Node"] },
  { id: "pj-7", title: "Refresh brand site", client: "DataPeak", deadline: "20 out", value: 3200, status: "concluido", stack: ["Astro"] },
  { id: "pj-8", title: "Blog migration", client: "Casa & Design", deadline: "15 out", value: 3800, status: "concluido", stack: ["Next.js"] },
  { id: "pj-9", title: "App delivery MVP", client: "QuickBite", deadline: "20 jan", value: 12000, status: "aguardando", stack: ["React Native"] },
];

export interface Invoice {
  id: string;
  client: string;
  project: string;
  value: number;
  status: "Pago" | "Pendente" | "Atrasado";
  date: string;
}

export const invoices: Invoice[] = [
  { id: "in-1", client: "Fintech Nova", project: "Landing SaaS v2", value: 4800, status: "Pago", date: "05 nov" },
  { id: "in-2", client: "Wear Studio", project: "E-commerce Headless", value: 4400, status: "Pago", date: "08 nov" },
  { id: "in-3", client: "DataPeak", project: "Dashboard Analytics", value: 3250, status: "Pendente", date: "12 nov" },
  { id: "in-4", client: "LogTech", project: "Automação n8n", value: 4200, status: "Pago", date: "15 nov" },
  { id: "in-5", client: "Marketly", project: "API Marketplace", value: 4600, status: "Pendente", date: "22 nov" },
  { id: "in-6", client: "QuickBite", project: "App delivery MVP", value: 6000, status: "Atrasado", date: "28 out" },
  { id: "in-7", client: "DataPeak", project: "Refresh brand site", value: 3200, status: "Pago", date: "20 out" },
];

export const opportunitiesPerDay = [
  { day: "Seg", count: 4 },
  { day: "Ter", count: 7 },
  { day: "Qua", count: 5 },
  { day: "Qui", count: 9 },
  { day: "Sex", count: 12 },
  { day: "Sáb", count: 6 },
  { day: "Dom", count: 3 },
];

export const revenuePerMonth = [
  { month: "Jun", value: 8200 },
  { month: "Jul", value: 11500 },
  { month: "Ago", value: 9800 },
  { month: "Set", value: 14200 },
  { month: "Out", value: 17800 },
  { month: "Nov", value: 21400 },
];

export const dashboardStats = {
  found: 12,
  proposals: 7,
  responseRate: 62,
  closed: 3,
  revenue: 21400,
};

export function currency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export function scoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-warning";
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
      return "secondary";
    case "Atrasado":
    case "Perdida":
      return "destructive";
    default:
      return "outline";
  }
}