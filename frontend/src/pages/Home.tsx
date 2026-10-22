import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { temPapel } from "../lib/auth";

export default function Home() {
  const { usuario, logout } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            Olá, {usuario?.first_name || usuario?.username}
          </h1>
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Sair
          </button>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Papéis:{" "}
          {usuario && usuario.papeis.length > 0
            ? usuario.papeis.map((p) => p.name).join(", ")
            : usuario?.is_superuser
              ? "Superusuário"
              : "nenhum"}
        </p>

        <div className="mt-6 space-y-2">
          {temPapel(usuario, "Administrador", "Caixa") && (
            <>
              <Link
                to="/caixa"
                className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Caixa →
              </Link>
              <Link
                to="/caixa/mesas"
                className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Mesas →
              </Link>
              <Link
                to="/caixa/configuracao-preco"
                className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Configuração de preço →
              </Link>
            </>
          )}

          {temPapel(usuario, "Administrador") && (
            <Link
              to="/admin/usuarios"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Administração de usuários →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
