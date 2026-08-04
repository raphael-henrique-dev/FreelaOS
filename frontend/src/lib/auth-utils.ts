import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Executa o protocolo completo de logout do FreelaOS:
 * 1. Notifica o backend para finalizar loops e monitoramento em background do usuário.
 * 2. Faz o signOut global no Supabase.
 * 3. Desinscreve todos os canais Realtime do Supabase.
 * 4. Limpa todo o cache de queries do TanStack Query.
 * 5. Limpa localStorage e sessionStorage para eliminar quaisquer resíduos de sessão.
 * 6. Força o redirecionamento hard para /login.
 */
export async function performFullLogout(queryClient?: QueryClient | null) {
  try {
    // 1. Notificar backend se houver sessão
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;

    if (userId) {
      try {
        await api.post("/api/auth/logout", { user_id: userId });
      } catch (err) {
        console.warn("Aviso ao notificar logout para o backend:", err);
      }
    }

    // 2. Desinscrever Realtime
    try {
      await supabase.removeAllChannels();
    } catch (err) {
      console.warn("Erro ao remover canais realtime:", err);
    }

    // 3. SignOut do Supabase
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.warn("Erro no signOut do Supabase:", err);
    }

    // 4. Limpar cache do TanStack Query
    if (queryClient) {
      queryClient.clear();
    }

    // 5. Limpar storages do navegador
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.warn("Erro ao limpar storages:", err);
    }
  } catch (error) {
    console.error("Erro no processo de logout:", error);
  } finally {
    // 6. Hard redirect para garantir zeramento do estado de memória React
    window.location.href = "/login";
  }
}
