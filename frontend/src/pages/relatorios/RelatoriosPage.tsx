import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { buscarRelatorioVendas } from "../../lib/relatorios";

const ROTULOS_FORMA_PAGAMENTO: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "Pix",
  fiado: "Fiado",
};

export default function RelatoriosPage() {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-vendas", inicio, fim],
    queryFn: () =>
      buscarRelatorioVendas({
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

  const maiorValorDia =
    data?.faturamento_por_dia.reduce((max, dia) => Math.max(max, Number(dia.valor)), 0) ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Relatórios</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <div className="flex gap-3">
          <Link
            to="/relatorios/caixa"
            className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Relatório de caixa →
          </Link>
          <Link
            to="/relatorios/contas-a-receber"
            className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Contas a receber →
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
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Faturamento</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  R$ {Number(data.faturamento_total).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Vendas</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.quantidade_vendas}</p>
              </div>
              <div className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Ticket médio</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  R$ {Number(data.ticket_medio).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Por forma de pagamento</h2>
              {data.por_forma_pagamento.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma venda no período.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.por_forma_pagamento.map((item) => (
                    <div key={item.forma} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-700">
                        {ROTULOS_FORMA_PAGAMENTO[item.forma] ?? item.forma}
                      </span>
                      <span className="font-medium text-slate-900">R$ {Number(item.valor).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Faturamento por dia</h2>
              {data.faturamento_por_dia.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma venda no período.</p>
              ) : (
                <div className="space-y-2">
                  {data.faturamento_por_dia.map((dia) => (
                    <div key={dia.data} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          {new Date(dia.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span className="font-medium text-slate-900">R$ {Number(dia.valor).toFixed(2)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-900"
                          style={{
                            width: maiorValorDia > 0 ? `${(Number(dia.valor) / maiorValorDia) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
