import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { buscarEstoqueBaixo } from "../../lib/relatorios";

export default function EstoqueBaixoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-estoque-baixo"],
    queryFn: buscarEstoqueBaixo,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Itens em baixa</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <p className="text-xs text-slate-500">
          Itens de estoque (insumos de buffet e produtos) com quantidade atual abaixo do mínimo
          cadastrado (RF37).
        </p>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

          {data && data.itens.length === 0 && (
            <p className="text-sm text-emerald-600">Nenhum item abaixo do mínimo.</p>
          )}

          {data && data.itens.length > 0 && (
            <div className="divide-y divide-slate-100">
              {data.itens.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-slate-700">{item.nome}</span>
                  <span className="font-semibold text-red-600">
                    {item.quantidade_atual} / {item.quantidade_minima} {item.unidade_medida}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
