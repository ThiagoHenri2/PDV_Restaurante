import { api } from "./api";

const ACCESS_KEY = "pdv_access_token";
const REFRESH_KEY = "pdv_refresh_token";

export interface Papel {
  id: number;
  name: string;
}

export interface Usuario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  papeis: Papel[];
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function salvarTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function logout() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access: string; refresh: string }>(
    "/auth/token/",
    { username, password },
  );
  salvarTokens(data.access, data.refresh);
}

export async function renovarToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("Sem refresh token");
  const { data } = await api.post<{ access: string }>("/auth/token/refresh/", {
    refresh,
  });
  localStorage.setItem(ACCESS_KEY, data.access);
  return data.access;
}

export async function buscarUsuarioLogado() {
  const { data } = await api.get<Usuario>("/auth/me/");
  return data;
}

export function temPapel(usuario: Usuario | undefined, ...papeis: string[]) {
  if (!usuario) return false;
  if (usuario.is_superuser) return true;
  return usuario.papeis.some((p) => papeis.includes(p.name));
}
