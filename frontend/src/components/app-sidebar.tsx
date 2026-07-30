import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";
import {
  LayoutDashboard,
  Compass,
  FileText,
  Users,
  KanbanSquare,
  Wallet,
  Bot,
  Settings,
  Sparkles,
  LogOut,
  Inbox
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import iconeFreela from "../../assets/icon.png";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Oportunidades", url: "/oportunidades", icon: Compass },
  { title: "Propostas", url: "/propostas", icon: FileText },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Projetos", url: "/projetos", icon: KanbanSquare },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
];

const ai = [
  { title: "Agentes IA", url: "/agentes", icon: Bot },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [userName, setUserName] = useState("Carregando...");
  const [userInitials, setUserInitials] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      try {
        const { data } = await api.get('/api/profile', {
          params: { user_id: user.id }
        });
        
        let name = "Usuário";
        if (data && data.nome) {
          name = data.nome;
        } else if (user.user_metadata?.full_name) {
          name = user.user_metadata.full_name;
        }
        
        setUserName(name);
        
        const parts = name.split(" ").filter(Boolean);
        if (parts.length > 1) {
          setUserInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
        } else if (parts.length === 1) {
          setUserInitials(parts[0].substring(0, 2).toUpperCase());
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg">
            <Link to="/">
              <img src={iconeFreela} alt="icone freelaos" width="24" height="24"/>
            </Link>
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">Freela<span className="highlight">OS</span></p>
            <p className="truncate text-[11px] text-muted-foreground">Sua equipe de IA</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ai.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between px-1 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {userInitials || "U"}
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{userName.split(" ")[0] + " " + userName.split(" ")[1]}</p>
              {/* Ocultando o plano por enquanto */}
              {/* <p className="truncate text-[11px] text-muted-foreground">Plano Pro · 5 agentes</p> */}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="group-data-[collapsible=icon]:hidden ml-2 p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
            title="Sair da conta"
          >
            <LogOut size={16} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}