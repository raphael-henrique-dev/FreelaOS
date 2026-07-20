import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // pega a url da env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // pega pass da env

if (!supabaseUrl || !supabaseAnonKey) { // se nao tiver url ou senha, solta warn
  console.warn("Faltam as variáveis de ambiente do Supabase no arquivo .env");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
