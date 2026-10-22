import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { Cliente, ExtratoCliente } from "../../lib/clientes";

export default function ClienteDetalhePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [valorFechamento, setValorFechamento] = useState("");
  const [erro, setErro] = useState("");

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => (await api.get<Cliente>(`/clientes/${id}/`)).data,
  });

  const { data: extrato, isLoading: isLoadingExtrato } = useQuery({
    queryKey: ["cliente-extrato", id],
    queryFn: async () => (await api.get<ExtratoCliente>(`/clientes/${id}/extrato/`)).data,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["cliente", id] });
    queryClient.invalidateQueries({ queryKey: ["cliente-extrato", id] });
    queryClient.invalidateQueries({ queryKey: ["clientes"] });
  }

  const alternarAtivo = useMutation({
    mutationFn: async () => api.patch(`/clientes/${id}/`, { ativo: !cliente?.ativo }),
    onSuccess: () => {
      invalidar();
      setErro("");
    },
    onError: () => setErro("Não foi possível atualizar o cliente."),
  });

  const fecharConta = useMutation({
    mutationFn: async () =>
      api.post(`/clientes/${id}/fechar_mes/`, valorFechamento ? { valor: valorFechamento } : {}),
    onSuccess: () => {
      invalidar();
      setValorFechamento("");
      setErro("");
    },
    onError: (e: any) => {
      const detalhe = e.response?.data;
      const mensagem = detalhe ? Object.values(detalhe).flat().join(" ") : "Não foi possível fechar a conta.";
      setErro(mensagem);
    },
  });

  if (isLoading || !cliente) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  const temSaldoDevedor = cliente.saldo_devedor > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{cliente.nome}</h1>
          <Link to="/clientes" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Saldo devedor</p>
              <p
                className={`text-2xl font-semibold ${temSaldoDevedor ? "text-red-600" : "text-slate-900"}`}
              >
                R$ {cliente.saldo_devedor.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => alternarAtivo.mutate()}
              disabled={alternarAtivo.isPending}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                cliente.ativo
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {cliente.ativo ? "Inativar" : "Ativar"}
            </button>
          </div>
          {cliente.telefone && <p className="mt-2 text-sm text-slate-500">Telefone: {cliente.telefone}</p>}
          {cliente.observacoes && (
            <p className="mt-1 text-sm text-slate-500">Observações: {cliente.observacoes}</p>
          )}
          {!cliente.ativo && <p className="mt-2 text-xs text-slate-400">Cliente inativo</p>}
        </div>

        <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Fechar conta (RF34)</h2>
          {!temSaldoDevedor ? (
            <p className="text-sm text-slate-400">Sem saldo devedor.</p>
          ) : (
            <>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={`Valor (deixe em branco para fechar o total de R$ ${cliente.saldo_devedor.toFixed(2)})`}
                value={valorFechamento}
                onChange={(e) => setValorFechamento(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => fecharConta.mutate()}
                disabled={fecharConta.isPending}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {fecharConta.isPending ? "Fechando..." : "Fechar conta"}
              </button>
            </>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Extrato</h2>
          {isLoadingExtrato && <p className="text-sm text-slate-500">Carregando...</p>}
          <div className="divide-y divide-slate-100">
            {extrato && extrato.lancamentos.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum lançamento ainda.</p>
            )}
            {extrato?.lancamentos.map((lancamento) => (
              <div key={lancamento.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">
                    {lancamento.descricao || (lancamento.tipo === "consumo" ? "Consumo" : "Pagamento")}
                  </span>
                  <span
                    className={lancamento.tipo === "consumo" ? "font-medium text-red-600" : "font-medium text-emerald-600"}
                  >
                    {lancamento.tipo === "consumo" ? "+" : ""}R$ {lancamento.valor.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(lancamento.criado_em).toLocaleString("pt-BR")}
                  {lancamento.criado_por_username && ` — ${lancamento.criado_por_username}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
