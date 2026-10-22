import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import type { Comanda, ItemComandaPrato } from "../../lib/atendimento";
import type { Mesa } from "../../lib/caixa";
import { temPapel } from "../../lib/auth";

export default function ComandaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();

  const [novoItem, setNovoItem] = useState({ quantidade_pratos: "1", quantidade_extras_proteina: "0" });
  const [itemEmEdicao, setItemEmEdicao] = useState<number | null>(null);
  const [edicao, setEdicao] = useState({ quantidade_pratos: "", quantidade_extras_proteina: "" });
  const [mesaDestino, setMesaDestino] = useState("");
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [erro, setErro] = useState("");

  const { data: comanda, isLoading } = useQuery({
    queryKey: ["comanda", id],
    queryFn: async () => (await api.get<Comanda>(`/comandas/${id}/`)).data,
  });

  const { data: mesas } = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => (await api.get<Mesa[]>("/mesas/")).data,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["comanda", id] });
    queryClient.invalidateQueries({ queryKey: ["mesas"] });
    queryClient.invalidateQueries({ queryKey: ["comandas"] });
  }

  const adicionarItem = useMutation({
    mutationFn: async () =>
      api.post("/itens-comanda-prato/", {
        comanda: Number(id),
        quantidade_pratos: Number(novoItem.quantidade_pratos),
        quantidade_extras_proteina: Number(novoItem.quantidade_extras_proteina),
      }),
    onSuccess: () => {
      invalidar();
      setNovoItem({ quantidade_pratos: "1", quantidade_extras_proteina: "0" });
    },
    onError: () => setErro("Não foi possível lançar o item."),
  });

  const salvarEdicao = useMutation({
    mutationFn: async (itemId: number) =>
      api.patch(`/itens-comanda-prato/${itemId}/`, {
        quantidade_pratos: Number(edicao.quantidade_pratos),
        quantidade_extras_proteina: Number(edicao.quantidade_extras_proteina),
      }),
    onSuccess: () => {
      invalidar();
      setItemEmEdicao(null);
    },
    onError: () => setErro("Não foi possível salvar a edição."),
  });

  const cancelarItem = useMutation({
    mutationFn: async (itemId: number) => api.post(`/itens-comanda-prato/${itemId}/cancelar/`),
    onSuccess: () => invalidar(),
    onError: () => setErro("Não foi possível cancelar o item."),
  });

  const transferir = useMutation({
    mutationFn: async () => api.post(`/comandas/${id}/transferir/`, { mesa_id: Number(mesaDestino) }),
    onSuccess: () => {
      invalidar();
      setMostrarTransferencia(false);
      setMesaDestino("");
    },
    onError: () => setErro("Não foi possível transferir a comanda (mesa ocupada?)."),
  });

  const fechar = useMutation({
    mutationFn: async () => api.post(`/comandas/${id}/fechar/`),
    onSuccess: () => {
      invalidar();
      navigate("/atendimento");
    },
    onError: () => setErro("Não foi possível fechar a comanda."),
  });

  function iniciarEdicao(item: ItemComandaPrato) {
    setItemEmEdicao(item.id);
    setEdicao({
      quantidade_pratos: String(item.quantidade_pratos),
      quantidade_extras_proteina: String(item.quantidade_extras_proteina),
    });
  }

  function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    adicionarItem.mutate();
  }

  if (isLoading || !comanda) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    );
  }

  const comandaAberta = comanda.status === "aberta";
  const mesasLivres = (mesas ?? []).filter((m) => m.status === "livre");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            Mesa {comanda.mesa_numero} — Comanda #{comanda.id}
          </h1>
          <Link to="/atendimento" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            {comanda.quantidade_pessoas} pessoa(s) · aberta por{" "}
            {comanda.aberta_por_username ?? "—"} em{" "}
            {new Date(comanda.aberta_em).toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs uppercase text-slate-400">
            Status: {comanda.status === "aberta" ? "Aberta" : "Fechada"}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            Valor parcial estimado: R$ {comanda.valor_parcial_estimado.toFixed(2)}
          </p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {comandaAberta && (
          <form
            onSubmit={handleAdicionar}
            className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="text-sm font-semibold text-slate-700">Lançar pratos</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Pratos</label>
                <input
                  type="number"
                  min="1"
                  value={novoItem.quantidade_pratos}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade_pratos: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">
                  Extras de proteína
                </label>
                <input
                  type="number"
                  min="0"
                  value={novoItem.quantidade_extras_proteina}
                  onChange={(e) =>
                    setNovoItem({ ...novoItem, quantidade_extras_proteina: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={adicionarItem.isPending}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Lançar
            </button>
          </form>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Itens lançados</h2>
          <div className="divide-y divide-slate-100">
            {comanda.itens_prato.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum item lançado ainda.</p>
            )}
            {comanda.itens_prato.map((item) => (
              <div key={item.id} className="py-3">
                {itemEmEdicao === item.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        value={edicao.quantidade_pratos}
                        onChange={(e) => setEdicao({ ...edicao, quantidade_pratos: e.target.value })}
                        className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        value={edicao.quantidade_extras_proteina}
                        onChange={(e) =>
                          setEdicao({ ...edicao, quantidade_extras_proteina: e.target.value })
                        }
                        className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setItemEmEdicao(null)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => salvarEdicao.mutate(item.id)}
                        disabled={salvarEdicao.isPending}
                        className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-sm ${
                          item.cancelado ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        {item.quantidade_pratos} prato(s) + {item.quantidade_extras_proteina}{" "}
                        extra(s)
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.registrado_por_username} em{" "}
                        {new Date(item.registrado_em).toLocaleTimeString("pt-BR")}
                        {item.cancelado && " · cancelado"}
                      </p>
                    </div>
                    {comandaAberta && !item.cancelado && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => iniciarEdicao(item)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => cancelarItem.mutate(item.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!comandaAberta && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            {comanda.pago && comanda.pagamento ? (
              <>
                <h2 className="mb-2 text-sm font-semibold text-emerald-700">Pagamento concluído</h2>
                <p className="text-sm text-slate-600">
                  Valor bruto: R$ {Number(comanda.pagamento.valor_bruto).toFixed(2)}
                  {comanda.pagamento.tipo_desconto !== "nenhum" &&
                    ` · desconto: R$ ${Number(comanda.pagamento.valor_desconto_aplicado).toFixed(2)}`}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  Valor pago: R$ {Number(comanda.pagamento.valor_final).toFixed(2)}
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-sm font-semibold text-amber-700">Aguardando pagamento</h2>
                <p className="text-sm text-slate-600">
                  Valor a pagar: R$ {comanda.valor_parcial_estimado.toFixed(2)}
                </p>
                {temPapel(usuario, "Administrador", "Caixa") ? (
                  <Link
                    to={`/caixa/comandas/${comanda.id}/pagamento`}
                    className="mt-3 block w-full rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white"
                  >
                    Finalizar pagamento
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    Só Administrador/Caixa pode finalizar o pagamento.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {comandaAberta && (
          <div className="space-y-3">
            {!mostrarTransferencia ? (
              <button
                onClick={() => setMostrarTransferencia(true)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Transferir mesa
              </button>
            ) : (
              <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">Transferir para outra mesa</h2>
                <select
                  value={mesaDestino}
                  onChange={(e) => setMesaDestino(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma mesa livre</option>
                  {mesasLivres.map((mesa) => (
                    <option key={mesa.id} value={mesa.id}>
                      Mesa {mesa.numero}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMostrarTransferencia(false)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => transferir.mutate()}
                    disabled={!mesaDestino || transferir.isPending}
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => fechar.mutate()}
              disabled={fechar.isPending}
              className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Fechar comanda
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
