import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import type { ItemEstoque, UnidadeMedida } from "../../lib/estoque";

export default function ItensEstoquePage() {
  const queryClient = useQueryClient();
  const [novoItem, setNovoItem] = useState({ nome: "", unidade_medida: "kg" as UnidadeMedida, quantidade_minima: "0" });
  const [mostrarNovoItem, setMostrarNovoItem] = useState(false);
  const [movimento, setMovimento] = useState<{ itemId: number | null; tipo: "entrada" | "ajuste"; quantidade: string; descricao: string }>({
    itemId: null,
    tipo: "entrada",
    quantidade: "",
    descricao: "",
  });
  const [erro, setErro] = useState("");

  const { data: itens, isLoading } = useQuery({
    queryKey: ["itens-estoque"],
    queryFn: async () => (await api.get<ItemEstoque[]>("/itens-estoque/")).data,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["itens-estoque"] });
  }

  const criarItem = useMutation({
    mutationFn: async () => api.post("/itens-estoque/", novoItem),
    onSuccess: () => {
      invalidar();
      setNovoItem({ nome: "", unidade_medida: "kg", quantidade_minima: "0" });
      setMostrarNovoItem(false);
      setErro("");
    },
    onError: () => setErro("Não foi possível cadastrar o item."),
  });

  const lancarMovimento = useMutation({
    mutationFn: async () =>
      api.post("/movimentos-estoque/", {
        item: movimento.itemId,
        tipo: movimento.tipo,
        quantidade: movimento.quantidade,
        descricao: movimento.descricao,
      }),
    onSuccess: () => {
      invalidar();
      setMovimento({ itemId: null, tipo: "entrada", quantidade: "", descricao: "" });
      setErro("");
    },
    onError: () => setErro("Não foi possível lançar o movimento."),
  });

  function handleCriarItem(e: FormEvent) {
    e.preventDefault();
    criarItem.mutate();
  }

  function handleMovimento(e: FormEvent) {
    e.preventDefault();
    if (!movimento.itemId) return;
    lancarMovimento.mutate();
  }

  const itensOrdenados = [...(itens ?? [])].sort((a, b) => Number(b.estoque_baixo) - Number(a.estoque_baixo));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Itens de estoque</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <p className="text-xs text-slate-500">
          Insumos do buffet self-service (RF26) — lançamento de entrada (RF27) e conferência manual
          (RF29). Itens vinculados a um produto de venda direta aparecem com baixa automática.
        </p>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        {!mostrarNovoItem ? (
          <button
            onClick={() => setMostrarNovoItem(true)}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Novo item de buffet
          </button>
        ) : (
          <form
            onSubmit={handleCriarItem}
            className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome</label>
              <input
                value={novoItem.nome}
                onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Unidade</label>
                <select
                  value={novoItem.unidade_medida}
                  onChange={(e) => setNovoItem({ ...novoItem, unidade_medida: e.target.value as UnidadeMedida })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="kg">Quilograma</option>
                  <option value="g">Grama</option>
                  <option value="l">Litro</option>
                  <option value="ml">Mililitro</option>
                  <option value="un">Unidade</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Estoque mínimo</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={novoItem.quantidade_minima}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade_minima: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarNovoItem(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criarItem.isPending}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Cadastrar
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Itens</h2>
          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
          <div className="divide-y divide-slate-100">
            {itensOrdenados.length === 0 && !isLoading && (
              <p className="text-sm text-slate-400">Nenhum item de estoque ainda.</p>
            )}
            {itensOrdenados.map((item) => (
              <div key={item.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      {item.nome}
                      {item.produto_nome && (
                        <span className="ml-1 text-xs text-slate-400">(produto: {item.produto_nome})</span>
                      )}
                    </p>
                    <p className={`text-xs ${item.estoque_baixo ? "font-semibold text-red-600" : "text-slate-400"}`}>
                      {item.quantidade_atual} {item.unidade_medida} em estoque
                      {item.estoque_baixo && " — abaixo do mínimo!"}
                    </p>
                  </div>
                  <button
                    onClick={() => setMovimento({ ...movimento, itemId: movimento.itemId === item.id ? null : item.id, quantidade: "", descricao: "" })}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Movimentar
                  </button>
                </div>

                {movimento.itemId === item.id && (
                  <form onSubmit={handleMovimento} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          checked={movimento.tipo === "entrada"}
                          onChange={() => setMovimento({ ...movimento, tipo: "entrada" })}
                        />
                        Entrada (compra)
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          checked={movimento.tipo === "ajuste"}
                          onChange={() => setMovimento({ ...movimento, tipo: "ajuste" })}
                        />
                        Ajuste/conferência
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder={movimento.tipo === "ajuste" ? "Quantidade (negativa = perda)" : "Quantidade"}
                      value={movimento.quantidade}
                      onChange={(e) => setMovimento({ ...movimento, quantidade: e.target.value })}
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
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
