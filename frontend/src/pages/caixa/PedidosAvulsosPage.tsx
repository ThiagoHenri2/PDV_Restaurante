import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import type { PedidoAvulso, TipoPedidoAvulso } from "../../lib/caixa";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto (carrinho)",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

export default function PedidosAvulsosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ tipo: "balcao" as TipoPedidoAvulso, endereco: "" });
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-avulsos"],
    queryFn: async () => (await api.get<PedidoAvulso[]>("/pedidos-avulsos/")).data,
  });

  const criar = useMutation({
    mutationFn: async () =>
      (await api.post<PedidoAvulso>("/pedidos-avulsos/", novo)).data,
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ["pedidos-avulsos"] });
      navigate(`/caixa/avulso/${pedido.id}`);
    },
  });

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  const pedidosOrdenados = [...(pedidos ?? [])].sort((a, b) => b.id - a.id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Avulso / Delivery</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        {!mostrarForm ? (
          <button
            onClick={() => setMostrarForm(true)}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            + Novo pedido
          </button>
        ) : (
          <form
            onSubmit={handleCriar}
            className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={novo.tipo === "balcao"}
                  onChange={() => setNovo({ ...novo, tipo: "balcao" })}
                />
                Balcão
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={novo.tipo === "delivery"}
                  onChange={() => setNovo({ ...novo, tipo: "delivery" })}
                />
                Delivery
              </label>
            </div>
            {novo.tipo === "delivery" && (
              <input
                placeholder="Endereço de entrega"
                value={novo.endereco}
                onChange={(e) => setNovo({ ...novo, endereco: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criar.isPending}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Criar e adicionar itens
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pedidos</h2>
          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
          <div className="divide-y divide-slate-100">
            {pedidosOrdenados.length === 0 && !isLoading && (
              <p className="text-sm text-slate-400">Nenhum pedido ainda.</p>
            )}
            {pedidosOrdenados.map((p) => (
              <Link
                key={p.id}
                to={`/caixa/avulso/${p.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-slate-50"
              >
                <span>
                  #{p.id} · {p.tipo === "balcao" ? "Balcão" : "Delivery"}
                </span>
                <span
                  className={
                    p.status === "confirmado"
                      ? "text-emerald-600"
                      : p.status === "cancelado"
                        ? "text-slate-400"
                        : "text-amber-600"
                  }
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
