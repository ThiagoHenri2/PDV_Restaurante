import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Cabecalho } from "../../components/ui";
import { api } from "../../lib/api";
import type { ConfiguracaoPreco } from "../../lib/caixa";

export function ConfiguracaoPrecoForm({ aoSalvar }: { aoSalvar?: () => void }) {
  const queryClient = useQueryClient();
  const [valorPrato, setValorPrato] = useState("");
  const [valorExtra, setValorExtra] = useState("");

  const { data: config } = useQuery({
    queryKey: ["configuracao-preco"],
    queryFn: async () => (await api.get<ConfiguracaoPreco>("/configuracao-preco/")).data,
  });

  useEffect(() => {
    if (config) {
      setValorPrato(config.valor_prato);
      setValorExtra(config.valor_unidade_extra);
    }
  }, [config]);

  const salvar = useMutation({
    mutationFn: async () =>
      api.put("/configuracao-preco/", {
        valor_prato: valorPrato,
        valor_unidade_extra: valorExtra,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracao-preco"] });
      aoSalvar?.();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvar.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500">
        Esses valores são usados para calcular a conta do self-service: preço do prato simples +
        preço de cada unidade extra de proteína.
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Valor do prato simples (R$)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={valorPrato}
          onChange={(e) => setValorPrato(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Valor da unidade extra de proteína (R$)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={valorExtra}
          onChange={(e) => setValorExtra(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <button
        type="submit"
        disabled={salvar.isPending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {salvar.isPending ? "Salvando..." : "Salvar"}
      </button>

      {config?.atualizado_por_username && (
        <p className="text-xs text-slate-400">
          Última atualização por {config.atualizado_por_username}
        </p>
      )}
    </form>
  );
}

export default function ConfiguracaoPrecoPage() {
  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <Cabecalho titulo="Configuração de preço" />
        <ConfiguracaoPrecoForm />
      </div>
    </main>
  );
}
