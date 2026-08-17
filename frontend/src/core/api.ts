import axios from "axios";
import { toast } from "sonner";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL === "/" ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"),
  timeout: 180000,
  headers: {
    "ngrok-skip-browser-warning": "69420"
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Melhoria de logs
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.message;
    
    console.group(`🚨 API Error: ${method} ${url}`);
    console.error(`Status:`, status);
    console.error(`Detail:`, detail);
    console.error(`Full Error Object:`, error);
    console.groupEnd();

    const toastMsg = status === 405 ? `Método HTTP não permitido: ${method} ${url}` : detail;
    toast.error(`[${status || 'NET'}] Erro na API: ${toastMsg}`);
    
    return Promise.reject(error);
  }
);
