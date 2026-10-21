import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buscarUsuarioLogado,
  getAccessToken,
  login as loginApi,
  logout as logoutApi,
  type Usuario,
} from "../lib/auth";

interface AuthContextValue {
  usuario?: Usuario;
  carregando: boolean;
  autenticado: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [temToken, setTemToken] = useState(() => !!getAccessToken());

  const { data: usuario, isLoading } = useQuery({
    queryKey: ["usuario-logado"],
    queryFn: buscarUsuarioLogado,
    enabled: temToken,
    retry: false,
  });

  async function login(username: string, password: string) {
    await loginApi(username, password);
    setTemToken(true);
    await queryClient.invalidateQueries({ queryKey: ["usuario-logado"] });
  }

  function logout() {
    logoutApi();
    setTemToken(false);
    queryClient.removeQueries({ queryKey: ["usuario-logado"] });
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando: temToken && isLoading,
        autenticado: temToken && !!usuario,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
