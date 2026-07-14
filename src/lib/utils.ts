import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SupabaseClient } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

