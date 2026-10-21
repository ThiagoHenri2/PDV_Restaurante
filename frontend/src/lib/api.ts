import axios from "axios";

// Em produção, isso vira a URL pública da API (ou "/api" quando o Nginx
// fizer o proxy). Em desenvolvimento, aponta para o Django rodando em
// localhost:8000 (porta publicada pelo docker-compose).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
});
