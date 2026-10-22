import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { Comanda } from "../../lib/atendimento";
import type { FormaPagamento, TipoDesconto } from "../../lib/caixa";
import type { Cliente } from "../../lib/clientes";

interface LinhaRecebimento {
  forma: FormaPagamento;
  valor: string;
  descricao: string;
}

const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
  { valor: "pix", rotulo: "PIX" },
  { valor: "fiado", rotulo: "Fiado" },
];

export default function PagamentoPage() {
  const { comandaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tipoDesconto, setTipoDesconto] = useState<TipoDesconto>("nenhum");
  const [valorDesconto, setValorDesconto] = useState("0");
  const [recebimentos, setRecebimentos] = useState<LinhaRecebimento[]>([
    { forma: "dinheiro", valor: "", descricao: "" },
  ]);
  const [clienteId, setClienteId] = useState("");
  const [erro, setErro] = useState("");

  const { data: comanda, isLoading } = useQuery({
    queryKey: ["comanda", comandaId],
    queryFn: async () => (await api.get<Comanda>(`/comandas/${comandaId}/`)).data,
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await api.get<Cliente[]>("/clientes/")).data,
  });

  const temFiado = recebimentos.some((r) => r.forma === "fiado");
  const clientesAtivos = (clientes ?? []).filter((c) => c.ativo);

  const valorBruto = comanda?.valor_parcial_estimado ?? 0;

  const valorDescontoAplicado = useMemo(() => {
    const desconto = Number(valorDesconto) || 0;
    if (tipoDesconto === "fixo") return Math.min(desconto, valorBruto);
    if (tipoDesconto === "percentual") return (valorBruto * Math.min(desconto, 100)) / 100;
    return 0;
  }, [tipoDesconto, valorDesconto, valorBruto]);

  const valorFinal = Math.max(0, valorBruto - valorDescontoAplicado);

  const totalRecebido = recebimentos.reduce((soma, r) => soma + (Number(r.valor) || 0), 0);
  const diferenca = Number((valorFinal - totalRecebido).toFixed(2));

  const finalizar = useMutation({
    mutationFn: async () =>
      api.post("/pagamentos/", {
        comanda: Number(comandaId),
        tipo_desconto: tipoDesconto,
        valor_desconto: valorDesconto,
        recebimentos: recebimentos.map((r) => ({
          forma: r.forma,
          valor: r.valor,
          descricao: r.descricao,
        })),
        ...(temFiado && clienteId ? { cliente: Number(clienteId) } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comanda", comandaId] });
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-atual"] });
      navigate(`/atendimento/${comandaId}`);
    },
    onError: (e: any) => {
      const detalhe = e.response?.data;
      const mensagem = detalhe ? Object.values(detalhe).flat().join(" ") : "Não foi possível finalizar o pagamento.";
      setErro(mensagem);
    },
  });

  function handleSubmit() {
    setErro("");
    if (diferenca !== 0) {
      setErro("A soma das formas de pagamento precisa ser igual ao valor final.");
      return;
    }
    if (temFiado && !clienteId) {
      setErro("Selecione o cliente para o pagamento fiado.");
      return;
    }
    finalizar.mutate();
  }

  function atualizarRecebimento(indice: number, campo: keyof LinhaRecebimento, valor: string) {
    setRecebimentos((atual) =>
      atual.map((r, i) => (i === indice ? { ...r, [campo]: valor } : r)),
    );
  }

  function adicionarRecebimento() {
    setRecebimentos((atual) => [...atual, { forma: "dinheiro", valor: "", descricao: "" }]);
  }

  function removerRecebimento(indice: number) {
    setRecebimentos((atual) => atual.filter((_, i) => i !== indice));
  }

  if (isLoading || !comanda) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  if (comanda.pago) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-sm text-slate-600">Esta comanda já foi paga.</p>
          <Link to={`/atendimento/${comandaId}`} className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar para a comanda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            Pagamento — Mesa {comanda.mesa_numero} (Comanda #{comanda.id})
          </h1>
          <Link to={`/atendimento/${comandaId}`} className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Valor da comanda (sem desconto)</p>
          <p className="text-2xl font-semibold text-slate-900">R$ {valorBruto.toFixed(2)}</p>
        </div>

        <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Desconto</h2>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={tipoDesconto === "nenhum"}
                onChange={() => {
                  setTipoDesconto("nenhum");
                  setValorDesconto("0");
                }}
              />
              Sem desconto
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={tipoDesconto === "fixo"}
                onChange={() => setTipoDesconto("fixo")}
              />
              Valor fixo (R$)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={tipoDesconto === "percentual"}
                onChange={() => setTipoDesconto("percentual")}
              />
              Percentual (%)
            </label>
          </div>
          {tipoDesconto !== "nenhum" && (
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorDesconto}
              onChange={(e) => setValorDesconto(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <p className="text-xs text-slate-500">
            Desconto aplicado: R$ {valorDescontoAplicado.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Valor final a receber</p>
          <p className="text-2xl font-semibold text-slate-900">R$ {valorFinal.toFixed(2)}</p>
        </div>

        <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">
            Formas de pagamento {recebimentos.length > 1 && "(split)"}
          </h2>
          {recebimentos.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                value={r.forma}
                onChange={(e) => atualizarRecebimento(i, "forma", e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
              >
                {FORMAS.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor (R$)"
                value={r.valor}
                onChange={(e) => atualizarRecebimento(i, "valor", e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                placeholder="Pessoa / observação (opcional)"
                value={r.descricao}
                onChange={(e) => atualizarRecebimento(i, "descricao", e.target.value)}
                className="min-w-[8rem] flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
              {recebimentos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removerRecebimento(i)}
                  className="rounded-lg border border-red-200 px-2 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={adicionarRecebimento}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            + Adicionar forma de pagamento / dividir conta
          </button>

          {temFiado && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Cliente (fiado)</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecione o cliente</option>
                {clientesAtivos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p
            className={`text-sm ${diferenca === 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            Total informado: R$ {totalRecebido.toFixed(2)} — valor final: R$ {valorFinal.toFixed(2)}
            {diferenca !== 0 && " (não bate)"}
          </p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          onClick={handleSubmit}
          disabled={finalizar.isPending}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {finalizar.isPending ? "Finalizando..." : "Finalizar pagamento"}
        </button>
      </div>
    </main>
  );
}
