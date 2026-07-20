import axios from "axios";
import { toast } from "sonner";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 60000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    const message = error.response?.data?.detail || error.message || "Erro desconhecido ao conectar com a API.";
    toast.error(message);
    return Promise.reject(error);
  }
);
