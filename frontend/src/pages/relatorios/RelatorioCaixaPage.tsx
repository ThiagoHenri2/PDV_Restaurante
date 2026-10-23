import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { buscarRelatorioCaixa } from "../../lib/relatorios";

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-BR");
}

function formatarValor(valor: string | null) {
  if (valor === null) return "—";
  return `R$ ${Number(valor).toFixed(2)}`;
}

export default function RelatorioCaixaPage() {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-caixa", inicio, fim],
    queryFn: () =>
      buscarRelatorioCaixa({
        inicio: inicio || undefined,
        fim: fim || undefined,
      }),
  });

  useEffect(() => {
    if (data && !inicio && !fim) {
      setInicio(data.periodo.inicio);
      setFim(data.periodo.fim);
    }
  }, [data, inicio, fim]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Relatório de caixa</h1>
          <Link to="/relatorios" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Período</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500">Início</label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500">Fim</label>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

        {data && (
          <>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Totais do período</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Abertura</p>
                  <p className="font-medium text-slate-900">{formatarValor(data.totais.valor_abertura)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Suprimento</p>
                  <p className="font-medium text-slate-900">{formatarValor(data.totais.total_suprimento)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sangria</p>
                  <p className="font-medium text-slate-900">{formatarValor(data.totais.total_sangria)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Recebido em dinheiro</p>
                  <p className="font-medium text-slate-900">
                    {formatarValor(data.totais.total_recebido_dinheiro)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Caixas no período</h2>
              {data.caixas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum caixa no período.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.caixas.map((caixa) => {
                    const diferenca = caixa.diferenca === null ? null : Number(caixa.diferenca);
                    return (
                      <div key={caixa.id} className="space-y-1 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">
                            Caixa #{caixa.id} — {caixa.status === "aberto" ? "Aberto" : "Fechado"}
                          </span>
                          <span
                            className={
                              diferenca === null
                                ? "text-slate-400"
                                : diferenca < 0
                                  ? "font-semibold text-red-600"
                                  : diferenca > 0
                                    ? "font-semibold text-emerald-600"
                                    : "text-slate-500"
                            }
                          >
                            {diferenca === null ? "—" : `R$ ${diferenca.toFixed(2)}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Aberto em {formatarData(caixa.aberto_em)}
                          {caixa.aberto_por && ` por ${caixa.aberto_por}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          Fechado em {formatarData(caixa.fechado_em)}
                        </p>
                        <div className="grid grid-cols-2 gap-1 pt-1 text-xs text-slate-500">
                          <span>Abertura: {formatarValor(caixa.valor_abertura)}</span>
                          <span>Suprimento: {formatarValor(caixa.total_suprimento)}</span>
                          <span>Sangria: {formatarValor(caixa.total_sangria)}</span>
                          <span>Dinheiro recebido: {formatarValor(caixa.total_recebido_dinheiro)}</span>
                          <span>Esperado: {formatarValor(caixa.valor_fechamento_esperado)}</span>
                          <span>Informado: {formatarValor(caixa.valor_fechamento_informado)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
