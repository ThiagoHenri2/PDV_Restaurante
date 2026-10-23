import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { Cabecalho } from "../../components/ui";
import { api } from "../../lib/api";
import type { Cliente } from "../../lib/clientes";

export default function ClientesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ nome: "", telefone: "", observacoes: "" });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await api.get<Cliente[]>("/clientes/")).data,
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post<Cliente>("/clientes/", novo)).data,
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setNovo({ nome: "", telefone: "", observacoes: "" });
      setMostrarForm(false);
      setErro("");
      navigate(`/clientes/${cliente.id}`);
    },
    onError: (e: any) => {
      const detalhe = e.response?.data;
      const mensagem = detalhe ? Object.values(detalhe).flat().join(" ") : "Não foi possível cadastrar o cliente.";
      setErro(mensagem);
    },
  });

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  const clientesOrdenados = [...(clientes ?? [])].sort((a, b) => b.saldo_devedor - a.saldo_devedor);

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Cabecalho titulo="Clientes (fiado)" />

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {!mostrarForm ? (
          <button
            onClick={() => setMostrarForm(true)}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Novo cliente
          </button>
        ) : (
          <form
            onSubmit={handleCriar}
            className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome</label>
                <input
                  value={novo.nome}
                  onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Telefone (opcional)</label>
                <input
                  value={novo.telefone}
                  onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Observações (opcional)</label>
                <input
                  value={novo.observacoes}
                  onChange={(e) => setNovo({ ...novo, observacoes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
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
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Cadastrar
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Clientes</h2>
          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {clientesOrdenados.length === 0 && !isLoading && (
              <p className="text-sm text-slate-400">Nenhum cliente cadastrado ainda.</p>
            )}
            {clientesOrdenados.map((cliente) => (
              <Link
                key={cliente.id}
                to={`/clientes/${cliente.id}`}
                className="flex items-center justify-between border-b border-slate-100 py-3 text-sm hover:bg-slate-50 lg:odd:pr-4 lg:even:pl-4"
              >
                <div>
                  <p className={cliente.ativo ? "text-slate-700" : "text-slate-400"}>
                    {cliente.nome}
                    {!cliente.ativo && " (inativo)"}
                  </p>
                  {cliente.telefone && <p className="text-xs text-slate-400">{cliente.telefone}</p>}
                </div>
                <span
                  className={
                    cliente.saldo_devedor > 0
                      ? "font-semibold text-red-600"
                      : "text-slate-400"
                  }
                >
                  R$ {cliente.saldo_devedor.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
