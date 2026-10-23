import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { BotaoPrimario, BotaoSecundario, Cabecalho, Card } from "../../components/ui";
import { api } from "../../lib/api";
import type { CategoriaProduto, ItemEstoque, Produto, UnidadeMedida } from "../../lib/estoque";

const CATEGORIAS: { value: CategoriaProduto; label: string }[] = [
  { value: "bebida", label: "Bebida" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "marmitex", label: "Marmitex" },
  { value: "delivery", label: "Item de delivery" },
  { value: "outro", label: "Outro" },
];

function SecaoProdutos() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    categoria: "bebida" as CategoriaProduto,
    preco: "",
    unidade_medida: "un" as UnidadeMedida,
    quantidade_minima: "0",
  });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => (await api.get<Produto[]>("/produtos/")).data,
  });

  const criar = useMutation({
    mutationFn: async () => api.post("/produtos/", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      setForm({ nome: "", categoria: "bebida", preco: "", unidade_medida: "un", quantidade_minima: "0" });
      setMostrarForm(false);
      setErro("");
    },
    onError: () => setErro("Não foi possível cadastrar o produto."),
  });

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Produtos</h2>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            + Novo produto
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Bebidas, sobremesas, marmitex e itens de delivery (RF25) — cada um já cria seu item de
        estoque e tem baixa automática ao vender.
      </p>

      {mostrarForm && (
        <form onSubmit={handleCriar} className="mb-4 space-y-3 rounded-lg bg-brand-50 p-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Categoria</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaProduto })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Unidade</label>
              <select
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value as UnidadeMedida })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="un">Unidade</option>
                <option value="kg">Quilograma</option>
                <option value="g">Grama</option>
                <option value="l">Litro</option>
                <option value="ml">Mililitro</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Estoque mínimo</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.quantidade_minima}
                onChange={(e) => setForm({ ...form, quantidade_minima: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-3">
            <BotaoSecundario type="button" onClick={() => setMostrarForm(false)} className="flex-1">
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={criar.isPending} className="flex-1">
              Cadastrar
            </BotaoPrimario>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      <div className="divide-y divide-slate-100">
        {(produtos ?? []).length === 0 && !isLoading && (
          <p className="text-sm text-slate-400">Nenhum produto cadastrado ainda.</p>
        )}
        {(produtos ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className={p.ativo ? "text-slate-700" : "text-slate-400 line-through"}>{p.nome}</p>
              <p className="text-xs text-slate-400">
                {CATEGORIAS.find((c) => c.value === p.categoria)?.label} · R$ {Number(p.preco).toFixed(2)}
              </p>
            </div>
            <span className="text-slate-500">{p.quantidade_atual} em estoque</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SecaoItensBuffet() {
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
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Itens de buffet</h2>
        {!mostrarNovoItem && (
          <button
            onClick={() => setMostrarNovoItem(true)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            + Novo item
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Insumos do buffet self-service (RF26) — lançamento de entrada (RF27) e conferência manual
        (RF29). Itens vinculados a um produto de venda direta aparecem com baixa automática.
      </p>

      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}

      {mostrarNovoItem && (
        <form onSubmit={handleCriarItem} className="mb-4 space-y-3 rounded-lg bg-brand-50 p-3">
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
            <BotaoSecundario type="button" onClick={() => setMostrarNovoItem(false)} className="flex-1">
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={criarItem.isPending} className="flex-1">
              Cadastrar
            </BotaoPrimario>
          </div>
        </form>
      )}

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
              <form onSubmit={handleMovimento} className="mt-3 space-y-2 rounded-lg bg-brand-50 p-3">
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
                <BotaoPrimario type="submit" disabled={lancarMovimento.isPending} className="w-full">
                  Lançar
                </BotaoPrimario>
              </form>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function EstoquePage() {
  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Cabecalho
          titulo="Estoque"
          acao={
            <Link to="/relatorios/estoque-baixo" className="text-sm text-slate-500 hover:text-slate-700">
              Itens em baixa →
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SecaoProdutos />
          <SecaoItensBuffet />
        </div>
      </div>
    </main>
  );
}
