import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import type { Mesa } from "../../lib/caixa";

export default function MesasPage() {
  const queryClient = useQueryClient();
  const [numero, setNumero] = useState("");
  const [erro, setErro] = useState("");

  const { data: mesas } = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => (await api.get<Mesa[]>("/mesas/")).data,
  });

  const criar = useMutation({
    mutationFn: async () => api.post("/mesas/", { numero: Number(numero) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesas"] });
      setNumero("");
      setErro("");
    },
    onError: () => setErro("Não foi possível criar a mesa (número já existe?)."),
  });

  const alternarStatus = useMutation({
    mutationFn: async (mesa: Mesa) =>
      api.patch(`/mesas/${mesa.id}/`, {
        status: mesa.status === "livre" ? "ocupada" : "livre",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mesas"] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Mesas</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">Número da mesa</label>
            <input
              type="number"
              min="1"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={criar.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {mesas?.map((mesa) => (
            <button
              key={mesa.id}
              onClick={() => alternarStatus.mutate(mesa)}
              className={`rounded-xl p-4 text-center shadow-sm ring-1 transition ${
                mesa.status === "livre"
                  ? "bg-emerald-50 ring-emerald-200 text-emerald-700"
                  : "bg-amber-50 ring-amber-200 text-amber-700"
              }`}
            >
              <p className="text-lg font-semibold">Mesa {mesa.numero}</p>
              <p className="text-xs uppercase">{mesa.status}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
