import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import type { Comanda } from "../../lib/atendimento";
import type { Caixa } from "../../lib/caixa";

export default function CaixaPage() {
  const queryClient = useQueryClient();
  const [valorAbertura, setValorAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [movimento, setMovimento] = useState({ tipo: "suprimento", valor: "", descricao: "" });
  const [mostrarFechamento, setMostrarFechamento] = useState(false);

  const { data: caixa, isLoading } = useQuery({
    queryKey: ["caixa-atual"],
    queryFn: async () => {
      try {
        return (await api.get<Caixa>("/caixas/atual/")).data;
      } catch (e: any) {
        if (e.response?.status === 404) return null;
        throw e;
      }
    },
  });

  const { data: comandas } = useQuery({
    queryKey: ["comandas"],
    queryFn: async () => (await api.get<Comanda[]>("/comandas/")).data,
    enabled: !!caixa,
  });

  const comandasAguardandoPagamento = (comandas ?? []).filter(
    (c) => c.status === "fechada" && !c.pago,
  );

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["caixa-atual"] });
  }

  const abrir = useMutation({
    mutationFn: async () => api.post("/caixas/abrir/", { valor_abertura: valorAbertura }),
    onSuccess: () => {
      invalidar();
      setValorAbertura("");
    },
  });

  const lancarMovimento = useMutation({
    mutationFn: async () => api.post("/movimentos-caixa/", movimento),
    onSuccess: () => {
      invalidar();
      setMovimento({ tipo: "suprimento", valor: "", descricao: "" });
    },
  });

  const fechar = useMutation({
    mutationFn: async () =>
      api.post(`/caixas/${caixa!.id}/fechar/`, {
        valor_fechamento_informado: valorFechamento,
      }),
    onSuccess: () => {
      invalidar();
      setValorFechamento("");
      setMostrarFechamento(false);
    },
  });

  function handleAbrir(e: FormEvent) {
    e.preventDefault();
    abrir.mutate();
  }

  function handleMovimento(e: FormEvent) {
    e.preventDefault();
    lancarMovimento.mutate();
  }

  function handleFechar(e: FormEvent) {
    e.preventDefault();
    fechar.mutate();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Caixa</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

        {!isLoading && !caixa && (
          <form
            onSubmit={handleAbrir}
            className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <p className="text-sm text-slate-600">Nenhum caixa aberto no momento.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Valor de abertura (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={abrir.isPending}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {abrir.isPending ? "Abrindo..." : "Abrir caixa"}
            </button>
          </form>
        )}

        {caixa && (
          <>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                Aberto por {caixa.aberto_por_username} em{" "}
                {new Date(caixa.aberto_em).toLocaleString("pt-BR")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                Saldo atual: R$ {caixa.saldo_atual.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Comandas aguardando pagamento
              </h2>
              <div className="divide-y divide-slate-100">
                {comandasAguardandoPagamento.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhuma comanda fechada sem pagamento.</p>
                )}
                {comandasAguardandoPagamento.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      Mesa {c.mesa_numero} — comanda #{c.id}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        R$ {c.valor_parcial_estimado.toFixed(2)}
                      </span>
                      <Link
                        to={`/caixa/comandas/${c.id}/pagamento`}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Finalizar pagamento
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleMovimento}
              className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <h2 className="text-sm font-semibold text-slate-700">Sangria / Suprimento</h2>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={movimento.tipo === "suprimento"}
                    onChange={() => setMovimento({ ...movimento, tipo: "suprimento" })}
                  />
                  Suprimento (entrada)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={movimento.tipo === "sangria"}
                    onChange={() => setMovimento({ ...movimento, tipo: "sangria" })}
                  />
                  Sangria (retirada)
                </label>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor (R$)"
                value={movimento.valor}
                onChange={(e) => setMovimento({ ...movimento, valor: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Descrição (opcional)"
                value={movimento.descricao}
                onChange={(e) => setMovimento({ ...movimento, descricao: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={lancarMovimento.isPending}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Lançar
              </button>
            </form>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Movimentos</h2>
              <div className="divide-y divide-slate-100">
                {caixa.movimentos.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum movimento ainda.</p>
                )}
                {caixa.movimentos.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {mov.tipo === "suprimento" ? "+ " : "- "}
                      {mov.descricao || mov.tipo}
                    </span>
                    <span
                      className={
                        mov.tipo === "suprimento" ? "text-emerald-600" : "text-red-600"
                      }
                    >
                      R$ {mov.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {!mostrarFechamento && (
              <button
                onClick={() => setMostrarFechamento(true)}
                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Fechar caixa
              </button>
            )}

            {mostrarFechamento && (
              <form
                onSubmit={handleFechar}
                className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-red-200"
              >
                <h2 className="text-sm font-semibold text-slate-700">Fechar caixa</h2>
                <p className="text-xs text-slate-500">
                  Valor esperado em caixa: R$ {caixa.saldo_atual.toFixed(2)}
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Valor contado (R$)"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMostrarFechamento(false)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={fechar.isPending}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Confirmar fechamento
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
