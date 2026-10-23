import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { temPapel } from "../lib/auth";

export default function RedirecionarInicio() {
  const { usuario } = useAuth();

  if (temPapel(usuario, "Administrador", "Caixa")) return <Navigate to="/caixa" replace />;
  if (temPapel(usuario, "Atendente")) return <Navigate to="/atendimento" replace />;
  if (temPapel(usuario, "Estoquista")) return <Navigate to="/estoque" replace />;
  return <Navigate to="/perfil" replace />;
}
