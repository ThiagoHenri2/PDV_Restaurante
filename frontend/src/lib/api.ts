import axios from "axios";

// Em produção, isso vira a URL pública da API (ou "/api" quando o Nginx
// fizer o proxy). Em desenvolvimento, aponta para o Django rodando em
// localhost:8000 (porta publicada pelo docker-compose).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
});

const ACCESS_KEY = "pdv_access_token";
const REFRESH_KEY = "pdv_refresh_token";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let renovandoToken: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const rotaDeLogin = original?.url?.includes("/auth/token");

    if (error.response?.status === 401 && !original._retry && !rotaDeLogin) {
      original._retry = true;
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!refresh) return Promise.reject(error);

      try {
        renovandoToken ??= axios
          .post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
          .then((res) => {
            localStorage.setItem(ACCESS_KEY, res.data.access);
            return res.data.access as string;
          })
          .finally(() => {
            renovandoToken = null;
          });

        const novoToken = await renovandoToken;
        original.headers.Authorization = `Bearer ${novoToken}`;
        return api(original);
      } catch {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
