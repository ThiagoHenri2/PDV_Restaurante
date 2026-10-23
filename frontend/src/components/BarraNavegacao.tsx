import { BarChart3, ClipboardList, Package, User, Users, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { temPapel } from "../lib/auth";

interface Aba {
  to: string;
  label: string;
  icon: typeof Wallet;
  papeis?: string[];
}

const ABAS: Aba[] = [
  { to: "/caixa", label: "Caixa", icon: Wallet, papeis: ["Administrador", "Caixa"] },
  {
    to: "/atendimento",
    label: "Atendimento",
    icon: ClipboardList,
    papeis: ["Administrador", "Caixa", "Atendente"],
  },
  {
    to: "/estoque",
    label: "Estoque",
    icon: Package,
    papeis: ["Administrador", "Caixa", "Estoquista"],
  },
  { to: "/clientes", label: "Clientes", icon: Users, papeis: ["Administrador", "Caixa"] },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, papeis: ["Administrador", "Caixa"] },
  { to: "/perfil", label: "Perfil", icon: User },
];

export function BarraNavegacao() {
  const { usuario } = useAuth();
  const abasVisiveis = ABAS.filter((aba) => !aba.papeis || temPapel(usuario, ...aba.papeis));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {abasVisiveis.map((aba) => (
        <NavLink
          key={aba.to}
          to={aba.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              isActive ? "text-brand-600" : "text-slate-400"
            }`
          }
        >
          <aba.icon className="h-5 w-5" />
          {aba.label}
        </NavLink>
      ))}
    </nav>
  );
}
