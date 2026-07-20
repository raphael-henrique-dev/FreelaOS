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
import { Bell, MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      const path = window.location.pathname;
      if (!session && path !== '/login' && path !== '/onboarding') {
        router.navigate({ to: '/login' });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      const path = window.location.pathname;
      if (!session && path !== '/login' && path !== '/onboarding') {
        router.navigate({ to: '/login' });
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Efeito isolado para tratar mensagens e Realtime apenas quando autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    let userId: string | null = null;

    const fetchMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const isAuthRoute = pathname === '/login' || pathname === '/onboarding';
  const showUI = isAuthenticated && !isAuthRoute;

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
                  <Popover>
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
                        <Link to="/inbox" className="text-xs font-medium text-primary hover:underline">
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
        <Toaster theme="dark" position="bottom-right" />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
