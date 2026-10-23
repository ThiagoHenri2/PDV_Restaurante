import { Link } from "react-router-dom";

import { Cabecalho, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { temPapel } from "../lib/auth";

export default function PerfilPage() {
  const { usuario, logout } = useAuth();

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Cabecalho titulo="Perfil" />

        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Olá, {usuario?.first_name || usuario?.username}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Papéis:{" "}
            {usuario && usuario.papeis.length > 0
              ? usuario.papeis.map((p) => p.name).join(", ")
              : usuario?.is_superuser
                ? "Superusuário"
                : "nenhum"}
          </p>
        </Card>

        <div className="space-y-2">
          {temPapel(usuario, "Administrador") && (
            <Link
              to="/admin/usuarios"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Administração de usuários →
            </Link>
          )}

          <button
            onClick={logout}
            className="w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}
