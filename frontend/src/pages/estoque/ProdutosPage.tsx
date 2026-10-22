import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import type { CategoriaProduto, Produto, UnidadeMedida } from "../../lib/estoque";

const CATEGORIAS: { value: CategoriaProduto; label: string }[] = [
  { value: "bebida", label: "Bebida" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "marmitex", label: "Marmitex" },
  { value: "delivery", label: "Item de delivery" },
  { value: "outro", label: "Outro" },
];

const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: "un", label: "Unidade" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "l", label: "Litro" },
  { value: "ml", label: "Mililitro" },
];

export default function ProdutosPage() {
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
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Produtos</h1>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <p className="text-xs text-slate-500">
          Bebidas, sobremesas, marmitex e itens de delivery (RF25) — cada um já cria seu item de
          estoque e tem baixa automática ao vender.
        </p>

        {!mostrarForm ? (
          <button
            onClick={() => setMostrarForm(true)}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            + Novo produto
          </button>
        ) : (
          <form
            onSubmit={handleCriar}
            className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
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
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
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
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criar.isPending}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Cadastrar
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Cadastrados</h2>
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
        </div>
      </div>
    </main>
  );
}
