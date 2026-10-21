import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { temPapel } from "../lib/auth";

interface Props {
  /** Se vazio/omitido, só exige estar autenticado (qualquer papel). */
  papeis?: string[];
}

export function RotaProtegida({ papeis }: Props) {
  const { autenticado, carregando, usuario } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (papeis && papeis.length > 0 && !temPapel(usuario, ...papeis)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
