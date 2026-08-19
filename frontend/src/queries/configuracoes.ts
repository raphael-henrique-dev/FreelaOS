import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/core/api";
import { toast } from "sonner";

export const defaultIntegrations = [
  { id: "99freelas", name: "99Freelas", desc: "Sincronize propostas e mensagens", enabled: false, ignoreExclusive: true },
  { id: "workana", name: "Workana", desc: "Coleta automática de projetos", enabled: false },
  { id: "openai", name: "OpenAI", desc: "Motor padrão dos agentes", enabled: false },
  { id: "claude", name: "Claude", desc: "Motor alternativo para propostas longas", enabled: false },
  { id: "groq", name: "Groq", desc: "Motor alternativo do Groq. Rápido, Eficiente e Gratuito.", enabled: false },
  { id: "gemini", name: "Google Gemini", desc: "Análise multimodal de briefings", enabled: false },
];

export function useConfiguracoesData() {
  return useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Carrega Perfil
      const { data: perfil } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", user.id)
        .single();

      // Carrega Configurações
      let config = null;
      const { data: configData } = await supabase
        .from("configuracoes_usuario")
        .select("*")
        .eq("perfil_id", user.id)
        .single();

      if (configData) {
        config = configData;
      } else {
        const defaultIntJson = defaultIntegrations.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.enabled }), {});
        const { data: newConfig } = await supabase.from("configuracoes_usuario").insert({
          perfil_id: user.id,
          integracoes: defaultIntJson,
          modelos_proposta: { ativo: "padrao", personalizado_prompt: "", limite_automacao: 70, automacao_ativada: true }
        }).select().single();
        config = newConfig;
      }

      // Verifica status da conexão no 99Freelas
      let isConnected99 = false;
      try {
        const authRes = await api.get(`/api/auth/99freelas/status?user_id=${user.id}`);
        if (authRes.data) {
          isConnected99 = authRes.data.connected;
        }
      } catch (e) {
        console.error("Erro ao checar status do 99freelas:", e);
      }

      // Verifica status da conexão na Workana
      let isConnectedWorkana = false;
      try {
        const authRes = await api.get(`/api/auth/workana/status?user_id=${user.id}`);
        if (authRes.data) {
          isConnectedWorkana = authRes.data.connected;
        }
      } catch (e) {
        console.error("Erro ao checar status da workana:", e);
      }

      return {
        user,
        perfil,
        config,
        isConnected99,
        isConnectedWorkana,
      };
    },
  });
}

export function useSaveConfiguracoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      perfilPayload: any;
      configPayload: any;
    }) => {
      // Salva Perfil
      const { error: perfilError } = await supabase
        .from("perfis")
        .update(payload.perfilPayload)
        .eq("id", payload.userId);

      if (perfilError) throw perfilError;

      // Salva Configurações
      const { error: configError } = await supabase
        .from("configuracoes_usuario")
        .update(payload.configPayload)
        .eq("perfil_id", payload.userId);

      if (configError) throw configError;

      return true;
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar alterações");
    },
  });
}
