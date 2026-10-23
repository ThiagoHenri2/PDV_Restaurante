import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { buscarContasAReceber } from "../../lib/relatorios";

export default function ContasAReceberPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-contas-a-receber"],
    queryFn: buscarContasAReceber,
  });

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Contas a receber</h1>
          <Link to="/relatorios" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        {data && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Total a receber</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              R$ {Number(data.total_geral).toFixed(2)}
            </p>
          </div>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Clientes com saldo devedor</h2>
          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

          {data && data.clientes.length === 0 && (
            <p className="text-sm text-emerald-600">Nenhum cliente com saldo devedor.</p>
          )}

          {data && data.clientes.length > 0 && (
            <div className="divide-y divide-slate-100">
              {data.clientes.map((cliente) => (
                <Link
                  key={cliente.id}
                  to={`/clientes/${cliente.id}`}
                  className="flex items-center justify-between py-3 text-sm hover:bg-slate-50"
                >
                  <div>
                    <p className="text-slate-700">{cliente.nome}</p>
                    {cliente.telefone && <p className="text-xs text-slate-400">{cliente.telefone}</p>}
                  </div>
                  <span className="font-semibold text-red-600">
                    R$ {Number(cliente.saldo_devedor).toFixed(2)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
