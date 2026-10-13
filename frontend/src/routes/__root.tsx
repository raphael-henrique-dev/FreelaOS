import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";
import { Bell, MessageSquare, ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AssistantWidget } from "@/components/assistant-widget";
import { AgentActivityIsland } from "@/components/agent-activity-island";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FreelaOS — Sistema Operacional para Freelancers" },
      { name: "description", content: "Plataforma SaaS que centraliza a captação de clientes freelancer com agentes de IA especializados." },
      { name: "author", content: "FreelaOS" },
      { property: "og:title", content: "FreelaOS — SO para Freelancers" },
      { property: "og:description", content: "Uma equipe de agentes de IA trabalhando 24/7 para o seu negócio freelancer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Estados de Consentimento LGPD
  const [needsConsentModal, setNeedsConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentAI, setConsentAI] = useState(false);

  useEffect(() => {
    const isPublicRoute = (p: string) =>
      p === '/login' || p === '/onboarding' || p === '/termos' || p === '/privacidade';

    const checkConsent = async (uid: string) => {
      try {
        const res = await api.get(`/api/privacy/consent?user_id=${uid}`);
        if (res.data?.necessita_novo_aceite) {
          setNeedsConsentModal(true);
          setConsentTerms(!!res.data?.termos_aceito);
          setConsentPrivacy(!!res.data?.privacidade_aceito);
          setConsentAI(!!res.data?.ia_terceiros_aceito);
        } else {
          setNeedsConsentModal(false);
        }
      } catch (err) {
        console.warn("Não foi possível verificar status de consentimento:", err);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      const path = window.location.pathname;
      if (!session && !isPublicRoute(path)) {
        router.navigate({ to: '/login' });
      } else if (session?.user?.id && !isPublicRoute(path)) {
        checkConsent(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      const path = window.location.pathname;
      if (!session && !isPublicRoute(path)) {
        router.navigate({ to: '/login' });
      } else if (session?.user?.id && !isPublicRoute(path)) {
        checkConsent(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleConfirmConsent = async () => {
    if (!consentTerms || !consentPrivacy || !consentAI) {
      toast.error("Por favor, aceite todos os termos obrigatórios para continuar.");
      return;
    }
    setConsentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await api.post("/api/privacy/consent", {
        user_id: session.user.id,
        consentimentos: [
          { tipo: "termos", versao: "v1.0", aceito: true },
          { tipo: "privacidade", versao: "v1.0", aceito: true },
          { tipo: "ia_terceiros", versao: "v1.0", aceito: true },
        ],
      });
      toast.success("Consentimentos registrados com sucesso! Bem-vindo(a) ao FreelaOS.");
      setNeedsConsentModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erro ao registrar consentimento.");
    } finally {
      setConsentLoading(false);
    }
  };

  const handleLogoutFromConsent = async () => {
    await supabase.auth.signOut();
    setNeedsConsentModal(false);
    router.navigate({ to: "/login" });
  };

  // Efeito isolado para tratar mensagens e Realtime apenas quando autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    let userId: string | null = null;

    const fetchMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;

      // Chama o backend para garantir que o script de Playwright inicie a raspagem para este usuário
      api.post('/api/inbox/start', { user_id: userId }).catch(err => {
        console.error("Erro ao iniciar monitor da caixa de entrada:", err);
      });

      // Chama o backend para verificar a flag do banco de dados e sincronizar o motor (Scout IA)
      api.post('/api/autopilot/check', { user_id: userId }).catch(err => {
        console.error("Erro ao checar status do piloto automático:", err);
      });

      const { data } = await supabase
        .from("mensagens")
        .select("*")
        .eq("perfil_id", userId)
        .eq("lida", false)
        .order("data_recebimento", { ascending: false });

      if (data) setUnreadMessages(data);
    };

    fetchMessages();

    // Inicia a escuta no WebSocket
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens' },
        (payload) => {
          const novaMsg = payload.new;
          // Se for uma mensagem para o perfil logado
          if (userId && novaMsg.perfil_id === userId) {
            setUnreadMessages((prev) => [novaMsg, ...prev]);
            toast.success(`Nova mensagem de ${novaMsg.remetente_nome}!`);
            
            // Toca um sonzinho rápido de notificação (opcional)
            try {
              const audio = new Audio("https://cdn.freesound.org/previews/531/531510_10926591-lq.mp3");
              audio.volume = 0.5;
              audio.play();
            } catch (e) {}
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensagens' },
        (payload) => {
          const updatedMsg = payload.new;
          // Se a mensagem foi marcada como lida, remove ela da lista do sino
          if (userId && updatedMsg.perfil_id === userId && updatedMsg.lida) {
            setUnreadMessages((prev) => prev.filter((msg) => msg.id !== updatedMsg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const isStandaloneRoute =
    pathname === '/login' ||
    pathname === '/onboarding' ||
    pathname === '/termos' ||
    pathname === '/privacidade';
  const showUI = isAuthenticated && !isStandaloneRoute;
  const isAssistantRoute = pathname === '/assistente';

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          {showUI && <AppSidebar />}
          <div className="flex min-w-0 flex-1 flex-col">
            {showUI && (
              <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
                <SidebarTrigger />
                <div className="ml-auto flex items-center gap-2">
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground">
                        <Bell className="h-5 w-5" />
                        {unreadMessages.length > 0 && (
                          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0 border-border/60 bg-card/95 backdrop-blur shadow-xl">
                      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                        <h4 className="font-semibold text-sm">Notificações</h4>
                        <span className="text-xs text-muted-foreground">{unreadMessages.length} não lidas</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {unreadMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <MessageSquare className="mb-2 h-8 w-8 opacity-20" />
                            <p className="text-sm">Nenhuma mensagem nova.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {unreadMessages.slice(0, 5).map((msg) => (
                              <div key={msg.id} className="flex flex-col gap-1 border-b border-border/50 px-4 py-3 text-sm transition-colors hover:bg-muted/30">
                                <p className="font-medium">{msg.remetente_nome}</p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">{msg.conteudo}</p>
                                <span className="mt-1 text-[10px] text-muted-foreground/60">
                                  {new Date(msg.data_recebimento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="border-t border-border/50 p-2 text-center">
                        <Link to="/inbox" onClick={() => setIsPopoverOpen(false)} className="text-xs font-medium text-primary hover:underline">
                          Ir para Caixa de Entrada
                        </Link>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </header>
            )}
            <main className="min-w-0 flex-1">
              <Outlet />
            </main>
          </div>
        </div>
        {showUI && <AgentActivityIsland />}
        {showUI && !isAssistantRoute && <AssistantWidget />}
        <Toaster theme="dark" position="bottom-right" />

        {/* Modal Global de Consentimento LGPD */}
        <Dialog open={needsConsentModal} onOpenChange={() => {}}>
          <DialogContent 
            className="sm:max-w-[540px] border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl [&>button]:hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Termos e Privacidade (LGPD)
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
                  </p>
                </div>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                Para garantir conformidade legal e proteger seus dados e os de clientes,
                solicitamos seu consentimento formal sobre os termos de operação dos nossos agentes autônomos de IA:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <label className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 hover:bg-muted/10 cursor-pointer transition-colors">
                <Checkbox 
                  id="consent-terms"
                  checked={consentTerms} 
                  onCheckedChange={(checked) => setConsentTerms(!!checked)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="font-medium text-foreground">
                    Termos de Uso da Plataforma (v1.0)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Concordo com os{" "}
                    <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1 hover:text-primary/80">
                      Termos de Uso <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    , incluindo a responsabilidade pela supervisão humana de automações e o uso ético da ferramenta.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 hover:bg-muted/10 cursor-pointer transition-colors">
                <Checkbox 
                  id="consent-privacy"
                  checked={consentPrivacy} 
                  onCheckedChange={(checked) => setConsentPrivacy(!!checked)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="font-medium text-foreground">
                    Política de Privacidade e Retenção (v1.0)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Li e compreendo a{" "}
                    <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1 hover:text-primary/80">
                      Política de Privacidade <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    , ciente de como meus dados pessoais e dados de terceiros são armazenados, minimizados e passíveis de eliminação definitiva sob demanda.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 hover:bg-muted/10 cursor-pointer transition-colors">
                <Checkbox 
                  id="consent-ai"
                  checked={consentAI} 
                  onCheckedChange={(checked) => setConsentAI(!!checked)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="font-medium text-foreground">
                    Processamento Seguro por Modelos de IA
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Autorizo o envio de briefings de vagas a provedores terceiros de LLM (OpenAI, Gemini, Groq), com prévia higienização algorítmica de dados de contato (minimização de PII).
                  </p>
                </div>
              </label>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogoutFromConsent}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Sair da Conta
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={consentLoading || !consentTerms || !consentPrivacy || !consentAI}
                onClick={handleConfirmConsent}
                className="text-xs font-semibold shadow-md shadow-primary/20"
              >
                {consentLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Confirmar e Continuar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </QueryClientProvider>
  );
}
