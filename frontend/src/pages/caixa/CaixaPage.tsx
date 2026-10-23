import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { BotaoPrimario, BotaoSecundario, Cabecalho, Card, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import type { Comanda } from "../../lib/atendimento";
import type {
  Caixa,
  FormaPagamento,
  Mesa,
  PedidoAvulso,
  TipoPedidoAvulso,
} from "../../lib/caixa";
import type { Cliente } from "../../lib/clientes";
import type { Produto } from "../../lib/estoque";
import { ConfiguracaoPrecoForm } from "./ConfiguracaoPrecoPage";

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "pix", label: "PIX" },
  { value: "fiado", label: "Fiado" },
];

function SecaoAvulso() {
  const queryClient = useQueryClient();
  const [pedidoAtivoId, setPedidoAtivoId] = useState<number | null>(null);
  const [novoPedido, setNovoPedido] = useState({ tipo: "balcao" as TipoPedidoAvulso, endereco: "" });
  const [novoItem, setNovoItem] = useState({ produto: "", quantidade: "1" });
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro");
  const [clienteId, setClienteId] = useState("");
  const [erro, setErro] = useState("");
  const [textoWhatsapp, setTextoWhatsapp] = useState("");

  const { data: pedido } = useQuery({
    queryKey: ["pedido-avulso", pedidoAtivoId],
    queryFn: async () => (await api.get<PedidoAvulso>(`/pedidos-avulsos/${pedidoAtivoId}/`)).data,
    enabled: pedidoAtivoId !== null,
  });

  const { data: produtos } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => (await api.get<Produto[]>("/produtos/")).data,
    enabled: pedidoAtivoId !== null,
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await api.get<Cliente[]>("/clientes/")).data,
    enabled: pedidoAtivoId !== null && formaPagamento === "fiado",
  });

  const produtosAtivos = (produtos ?? []).filter((p) => p.ativo);
  const clientesAtivos = (clientes ?? []).filter((c) => c.ativo);

  function invalidarPedido() {
    queryClient.invalidateQueries({ queryKey: ["pedido-avulso", pedidoAtivoId] });
  }

  const iniciarPedido = useMutation({
    mutationFn: async () => (await api.post<PedidoAvulso>("/pedidos-avulsos/", novoPedido)).data,
    onSuccess: (novo) => {
      setPedidoAtivoId(novo.id);
      setErro("");
    },
  });

  const adicionarItem = useMutation({
    mutationFn: async () =>
      api.post("/itens-pedido-avulso/", {
        pedido: pedidoAtivoId,
        produto: Number(novoItem.produto),
        quantidade: Number(novoItem.quantidade),
      }),
    onSuccess: () => {
      invalidarPedido();
      setNovoItem({ produto: "", quantidade: "1" });
      setErro("");
    },
    onError: () => setErro("Não foi possível adicionar o item."),
  });

  const removerItem = useMutation({
    mutationFn: async (itemId: number) => api.delete(`/itens-pedido-avulso/${itemId}/`),
    onSuccess: () => invalidarPedido(),
  });

  const confirmar = useMutation({
    mutationFn: async () =>
      (
        await api.post<PedidoAvulso>(`/pedidos-avulsos/${pedidoAtivoId}/confirmar/`, {
          forma_pagamento: formaPagamento,
          ...(formaPagamento === "fiado" && clienteId ? { cliente: Number(clienteId) } : {}),
        })
      ).data,
    onSuccess: () => {
      invalidarPedido();
      queryClient.invalidateQueries({ queryKey: ["caixa-atual"] });
      setErro("");
    },
    onError: (e: any) => {
      const detalhe = e.response?.data;
      setErro(detalhe ? Object.values(detalhe).flat().join(" ") : "Não foi possível confirmar o pedido.");
    },
  });

  const cancelar = useMutation({
    mutationFn: async () => api.post(`/pedidos-avulsos/${pedidoAtivoId}/cancelar/`),
    onSuccess: () => {
      setPedidoAtivoId(null);
      setErro("");
    },
  });

  function handleIniciar(e: FormEvent) {
    e.preventDefault();
    iniciarPedido.mutate();
  }

  function handleAdicionarItem(e: FormEvent) {
    e.preventDefault();
    if (novoItem.produto) adicionarItem.mutate();
  }

  function handleConfirmar() {
    setErro("");
    if (formaPagamento === "fiado" && !clienteId) {
      setErro("Selecione o cliente para o pagamento fiado.");
      return;
    }
    confirmar.mutate();
  }

  async function verWhatsapp() {
    const res = await api.get(`/pedidos-avulsos/${pedidoAtivoId}/texto_whatsapp/`);
    setTextoWhatsapp(res.data.texto);
  }

  async function copiarWhatsapp() {
    await navigator.clipboard.writeText(textoWhatsapp);
  }

  function novoPedidoReset() {
    setPedidoAtivoId(null);
    setTextoWhatsapp("");
    setNovoItem({ produto: "", quantidade: "1" });
    setFormaPagamento("dinheiro");
    setClienteId("");
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Avulso / Delivery</h2>

      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}

      {pedidoAtivoId === null && (
        <form onSubmit={handleIniciar} className="space-y-3">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={novoPedido.tipo === "balcao"}
                onChange={() => setNovoPedido({ ...novoPedido, tipo: "balcao" })}
              />
              Balcão
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={novoPedido.tipo === "delivery"}
                onChange={() => setNovoPedido({ ...novoPedido, tipo: "delivery" })}
              />
              Delivery
            </label>
          </div>
          {novoPedido.tipo === "delivery" && (
            <input
              placeholder="Endereço de entrega"
              value={novoPedido.endereco}
              onChange={(e) => setNovoPedido({ ...novoPedido, endereco: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <BotaoPrimario type="submit" disabled={iniciarPedido.isPending} className="w-full">
            Iniciar pedido
          </BotaoPrimario>
        </form>
      )}

      {pedido && pedido.status === "aberto" && (
        <div className="space-y-3">
          <form onSubmit={handleAdicionarItem} className="space-y-2 rounded-lg bg-brand-50 p-3">
            <select
              value={novoItem.produto}
              onChange={(e) => setNovoItem({ ...novoItem, produto: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              required
            >
              <option value="">Selecione um produto</option>
              {produtosAtivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {Number(p.preco).toFixed(2)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={novoItem.quantidade}
                onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                required
              />
              <BotaoPrimario type="submit" disabled={adicionarItem.isPending} className="flex-1">
                Adicionar item
              </BotaoPrimario>
            </div>
          </form>

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
                  <button
                    onClick={() => removerItem.mutate(item.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-right text-sm font-semibold text-slate-900">
            Total: R$ {pedido.valor_calculado.toFixed(2)}
          </p>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {FORMAS_PAGAMENTO.map((f) => (
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cancelar.mutate()}
                disabled={cancelar.isPending}
                className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Cancelar pedido
              </button>
              <button
                onClick={handleConfirmar}
                disabled={confirmar.isPending || pedido.itens.length === 0}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {pedido && pedido.status === "confirmado" && (
        <div className="space-y-3">
          <p className="text-sm text-emerald-600">
            Pedido #{pedido.id} confirmado — R$ {Number(pedido.valor_total).toFixed(2)} em{" "}
            {pedido.forma_pagamento}.
          </p>
          {!textoWhatsapp ? (
            <BotaoSecundario type="button" onClick={verWhatsapp} className="w-full">
              Gerar texto para WhatsApp
            </BotaoSecundario>
          ) : (
            <>
              <pre className="whitespace-pre-wrap rounded-lg bg-brand-50 p-3 text-xs text-slate-700">
                {textoWhatsapp}
              </pre>
              <BotaoPrimario type="button" onClick={copiarWhatsapp} className="w-full">
                Copiar
              </BotaoPrimario>
            </>
          )}
          <BotaoSecundario type="button" onClick={novoPedidoReset} className="w-full">
            Novo pedido
          </BotaoSecundario>
        </div>
      )}
    </Card>
  );
}

export default function CaixaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [valorAbertura, setValorAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [movimento, setMovimento] = useState({ tipo: "suprimento", valor: "", descricao: "" });
  const [mostrarFechamento, setMostrarFechamento] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);

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

  const { data: mesas } = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => (await api.get<Mesa[]>("/mesas/")).data,
    enabled: !!caixa,
  });

  const comandasAguardandoPagamento = (comandas ?? []).filter(
    (c) => c.status === "fechada" && !c.pago,
  );

  const comandaAbertaPorMesa = new Map(
    (comandas ?? []).filter((c) => c.status === "aberta").map((c) => [c.mesa, c]),
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
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Cabecalho titulo="Caixa" />

        <button
          onClick={() => setModalConfigAberto(true)}
          className="rounded-lg border border-slate-200 px-3 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Config. de preço
        </button>

        <Modal
          aberto={modalConfigAberto}
          onClose={() => setModalConfigAberto(false)}
          titulo="Configuração de preço"
        >
          <ConfiguracaoPrecoForm aoSalvar={() => setModalConfigAberto(false)} />
        </Modal>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

        {!isLoading && !caixa && (
          <form
            onSubmit={handleAbrir}
            className="max-w-md space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
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
            <BotaoPrimario type="submit" disabled={abrir.isPending} className="w-full">
              {abrir.isPending ? "Abrindo..." : "Abrir caixa"}
            </BotaoPrimario>
          </form>
        )}

        {caixa && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <p className="text-sm text-slate-500">
                Aberto por {caixa.aberto_por_username} em{" "}
                {new Date(caixa.aberto_em).toLocaleString("pt-BR")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                Saldo atual: R$ {caixa.saldo_atual.toFixed(2)}
              </p>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Mesas</h2>
                <Link to="/caixa/mesas" className="text-xs text-slate-500 hover:text-slate-700">
                  Gerenciar mesas →
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {mesas?.map((mesa) => {
                  const comandaAberta = comandaAbertaPorMesa.get(mesa.id);
                  return (
                    <button
                      key={mesa.id}
                      onClick={() => comandaAberta && navigate(`/atendimento/${comandaAberta.id}`)}
                      disabled={!comandaAberta}
                      title={comandaAberta?.nome_responsavel || undefined}
                      className={`rounded-lg p-2 text-center text-xs font-semibold shadow-sm ring-1 transition ${
                        mesa.status === "livre"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      } ${comandaAberta ? "cursor-pointer" : "cursor-default opacity-80"}`}
                    >
                      {mesa.numero}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Toque numa mesa ocupada para abrir a comanda e fechá-la. Mesas livres são abertas
                pela aba Atendimento.
              </p>
            </Card>

            <Card className="lg:col-span-2">
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
                      {c.nome_responsavel && (
                        <span className="text-slate-400"> · {c.nome_responsavel}</span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        R$ {c.valor_parcial_estimado.toFixed(2)}
                      </span>
                      <Link
                        to={`/caixa/comandas/${c.id}/pagamento`}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Finalizar pagamento
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <SecaoAvulso />

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Sangria / Suprimento</h2>
              <form onSubmit={handleMovimento} className="space-y-3">
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
                <BotaoPrimario type="submit" disabled={lancarMovimento.isPending} className="w-full">
                  Lançar
                </BotaoPrimario>
              </form>

              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3">
                {caixa.movimentos.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum movimento ainda.</p>
                )}
                {caixa.movimentos.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {mov.tipo === "suprimento" ? "+ " : "- "}
                      {mov.descricao || mov.tipo}
                    </span>
                    <span className={mov.tipo === "suprimento" ? "text-emerald-600" : "text-red-600"}>
                      R$ {mov.valor}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              {!mostrarFechamento ? (
                <button
                  onClick={() => setMostrarFechamento(true)}
                  className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Fechar caixa
                </button>
              ) : (
                <form onSubmit={handleFechar} className="space-y-3">
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
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
