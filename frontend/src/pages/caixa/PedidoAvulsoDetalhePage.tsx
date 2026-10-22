import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../lib/api";
import type { FormaPagamento, PedidoAvulso } from "../../lib/caixa";
import type { Cliente } from "../../lib/clientes";
import type { Produto } from "../../lib/estoque";

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "pix", label: "PIX" },
  { value: "fiado", label: "Fiado" },
];

export default function PedidoAvulsoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [novoItem, setNovoItem] = useState({ produto: "", quantidade: "1" });
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro");
  const [clienteId, setClienteId] = useState("");
  const [erro, setErro] = useState("");
  const [textoWhatsapp, setTextoWhatsapp] = useState("");

  const { data: pedido, isLoading } = useQuery({
    queryKey: ["pedido-avulso", id],
    queryFn: async () => (await api.get<PedidoAvulso>(`/pedidos-avulsos/${id}/`)).data,
  });

  const { data: produtos } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => (await api.get<Produto[]>("/produtos/")).data,
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await api.get<Cliente[]>("/clientes/")).data,
  });

  const clientesAtivos = (clientes ?? []).filter((c) => c.ativo);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["pedido-avulso", id] });
    queryClient.invalidateQueries({ queryKey: ["pedidos-avulsos"] });
  }

  const adicionarItem = useMutation({
    mutationFn: async () =>
      api.post("/itens-pedido-avulso/", {
        pedido: Number(id),
        produto: Number(novoItem.produto),
        quantidade: Number(novoItem.quantidade),
      }),
    onSuccess: () => {
      invalidar();
      setNovoItem({ produto: "", quantidade: "1" });
      setErro("");
    },
    onError: () => setErro("Não foi possível adicionar o item."),
  });

  const removerItem = useMutation({
    mutationFn: async (itemId: number) => api.delete(`/itens-pedido-avulso/${itemId}/`),
    onSuccess: () => invalidar(),
    onError: () => setErro("Não foi possível remover o item."),
  });

  const confirmar = useMutation({
    mutationFn: async () =>
      api.post(`/pedidos-avulsos/${id}/confirmar/`, {
        forma_pagamento: formaPagamento,
        ...(formaPagamento === "fiado" && clienteId ? { cliente: Number(clienteId) } : {}),
      }),
    onSuccess: () => {
      invalidar();
      setErro("");
    },
    onError: (e: any) => {
      const detalhe = e.response?.data;
      const mensagem = detalhe
        ? Object.values(detalhe).flat().join(" ")
        : "Não foi possível confirmar o pedido.";
      setErro(mensagem);
    },
  });

  function handleConfirmar() {
    setErro("");
    if (formaPagamento === "fiado" && !clienteId) {
      setErro("Selecione o cliente para o pagamento fiado.");
      return;
    }
    confirmar.mutate();
  }

  const cancelar = useMutation({
    mutationFn: async () => api.post(`/pedidos-avulsos/${id}/cancelar/`),
    onSuccess: () => navigate("/caixa/avulso"),
    onError: () => setErro("Não foi possível cancelar o pedido."),
  });

  async function verWhatsapp() {
    const res = await api.get(`/pedidos-avulsos/${id}/texto_whatsapp/`);
    setTextoWhatsapp(res.data.texto);
  }

  async function copiarWhatsapp() {
    await navigator.clipboard.writeText(textoWhatsapp);
  }

  if (isLoading || !pedido) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  const aberto = pedido.status === "aberto";
  const produtosAtivos = (produtos ?? []).filter((p) => p.ativo);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            Pedido #{pedido.id} — {pedido.tipo === "balcao" ? "Balcão" : "Delivery"}
          </h1>
          <Link to="/caixa/avulso" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            Status: <span className="font-medium">{pedido.status}</span>
          </p>
          {pedido.tipo === "delivery" && (
            <p className="text-sm text-slate-500">Endereço: {pedido.endereco || "não informado"}</p>
          )}
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            Total: R$ {Number(pedido.valor_total ?? pedido.valor_calculado).toFixed(2)}
          </p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {aberto && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (novoItem.produto) adicionarItem.mutate();
            }}
            className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="text-sm font-semibold text-slate-700">Adicionar item</h2>
            <select
              value={novoItem.produto}
              onChange={(e) => setNovoItem({ ...novoItem, produto: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione um produto</option>
              {produtosAtivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {Number(p.preco).toFixed(2)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={novoItem.quantidade}
              onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              disabled={adicionarItem.isPending}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Itens</h2>
          <div className="divide-y divide-slate-100">
            {pedido.itens.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum item adicionado ainda.</p>
            )}
            {pedido.itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {item.quantidade}x {item.produto_nome}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">R$ {item.subtotal.toFixed(2)}</span>
                  {aberto && (
                    <button
                      onClick={() => removerItem.mutate(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {aberto && (
          <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Confirmar pedido</h2>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {FORMAS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            {formaPagamento === "fiado" && (
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Selecione o cliente</option>
                {clientesAtivos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleConfirmar}
              disabled={confirmar.isPending || pedido.itens.length === 0}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirmar pagamento
            </button>
            <button
              onClick={() => cancelar.mutate()}
              disabled={cancelar.isPending}
              className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancelar pedido
            </button>
          </div>
        )}

        {!aberto && pedido.status === "confirmado" && (
          <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Texto para WhatsApp</h2>
            {!textoWhatsapp ? (
              <button
                onClick={verWhatsapp}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Gerar texto
              </button>
            ) : (
              <>
                <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {textoWhatsapp}
                </pre>
                <button
                  onClick={copiarWhatsapp}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Copiar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
