import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/core/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useOportunidades() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const res = await api.get(`/api/opportunities?user_id=${user.id}`);
      return res.data;
    },
  });
}

export function useOportunidade(id: string) {
  return useQuery({
    queryKey: ["opportunities", id],
    queryFn: async () => {
      const res = await api.get(`/api/opportunities/${id}`);
      return res.data;
    },
  });
}

export function useUpdateOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/api/opportunities/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Erro ao atualizar oportunidade");
    },
  });
}

export function useDeleteOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/opportunities/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade ignorada");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Erro ao remover oportunidade");
    },
  });
}
