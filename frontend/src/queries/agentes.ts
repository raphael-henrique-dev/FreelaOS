import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";
import { toast } from "sonner";

export function useAutopilotStatus() {
  return useQuery({
    queryKey: ["autopilot"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data } = await supabase
        .from("configuracoes_usuario")
        .select("piloto_automatico_ativado, interval_hours")
        .eq("perfil_id", user.id)
        .single();
        
      return {
        userId: user.id,
        autopilot: data?.piloto_automatico_ativado || false,
        intervalHours: data?.interval_hours || 3
      };
    },
  });
}

export function useToggleAutopilot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newState }: { userId: string; newState: boolean }) => {
      const { error } = await supabase
        .from("configuracoes_usuario")
        .update({ piloto_automatico_ativado: newState })
        .eq("perfil_id", userId);
      
      if (error) throw error;
      
      // Notifica o backend Python para acordar/desligar a thread background
      await api.post('/api/autopilot/check', { user_id: userId });
      
      return newState;
    },
    onSuccess: (newState) => {
      toast.success(newState ? "Motor Iniciado! O piloto automático vai orquestrar a equipe." : "Motor Desligado. Encerrando tarefas pendentes. Operação manual.");
      queryClient.invalidateQueries({ queryKey: ["autopilot"] });
    },
    onError: () => {
      toast.error("Erro ao alterar piloto automático");
    }
  });
}

export async function getLatestAgentActivity(userId: string) {
  try {
    const res = await api.get(`/api/extractor/activities/latest?user_id=${userId}`);
    return res.data;
  } catch (error) {
    console.error("Erro ao buscar última atividade do agente:", error);
    return null;
  }
}

export function useAgentActivities(userId?: string, limit: number = 50) {
  return useQuery({
    queryKey: ["agent-activities", userId, limit],
    queryFn: async () => {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        uid = user.id;
      }
      const res = await api.get(`/api/extractor/activities?user_id=${uid}&limit=${limit}`);
      return res.data;
    },
    enabled: !!userId,
  });
}
