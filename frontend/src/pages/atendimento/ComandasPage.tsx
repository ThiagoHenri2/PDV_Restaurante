import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Cabecalho, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import type { Comanda } from "../../lib/atendimento";
import type { Mesa } from "../../lib/caixa";

export default function ComandasPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null);
  const [quantidadePessoas, setQuantidadePessoas] = useState("1");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [erro, setErro] = useState("");

  const { data: mesas } = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => (await api.get<Mesa[]>("/mesas/")).data,
  });

  const { data: comandas } = useQuery({
    queryKey: ["comandas"],
    queryFn: async () => (await api.get<Comanda[]>("/comandas/")).data,
  });

  const comandaAbertaPorMesa = new Map(
    (comandas ?? []).filter((c) => c.status === "aberta").map((c) => [c.mesa, c]),
  );

  const abrirComanda = useMutation({
    mutationFn: async () =>
      api.post<Comanda>("/comandas/", {
        mesa: mesaSelecionada!.id,
        quantidade_pessoas: Number(quantidadePessoas),
        nome_responsavel: nomeResponsavel,
      }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["mesas"] });
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      setMesaSelecionada(null);
      setQuantidadePessoas("1");
      setNomeResponsavel("");
      setErro("");
      navigate(`/atendimento/${data.id}`);
    },
    onError: () => setErro("Não foi possível abrir a comanda nesta mesa."),
  });

  function handleClickMesa(mesa: Mesa) {
    if (mesa.status === "ocupada") {
      const comanda = comandaAbertaPorMesa.get(mesa.id);
      if (comanda) navigate(`/atendimento/${comanda.id}`);
      return;
    }
    setMesaSelecionada(mesa);
    setErro("");
  }

  function fecharModal() {
    setMesaSelecionada(null);
    setQuantidadePessoas("1");
    setNomeResponsavel("");
    setErro("");
  }

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Cabecalho titulo="Atendimento" />

        <p className="text-sm text-slate-500">
          Toque numa mesa livre para abrir a comanda, ou numa mesa ocupada para ver a comanda
          atual.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {mesas?.map((mesa) => (
            <button
              key={mesa.id}
              onClick={() => handleClickMesa(mesa)}
              className={`rounded-xl p-4 text-center shadow-sm ring-1 transition ${
                mesa.status === "livre"
                  ? "bg-emerald-50 ring-emerald-200 text-emerald-700"
                  : "bg-amber-50 ring-amber-200 text-amber-700"
              }`}
            >
              <p className="text-lg font-semibold">Mesa {mesa.numero}</p>
              {mesa.status === "ocupada" && comandaAbertaPorMesa.get(mesa.id)?.nome_responsavel ? (
                <p className="truncate text-xs">{comandaAbertaPorMesa.get(mesa.id)!.nome_responsavel}</p>
              ) : (
                <p className="text-xs uppercase">{mesa.status}</p>
              )}
            </button>
          ))}
        </div>

        <Modal
          aberto={!!mesaSelecionada}
          onClose={fecharModal}
          titulo={`Abrir comanda — Mesa ${mesaSelecionada?.numero ?? ""}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              abrirComanda.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Quantidade de pessoas
              </label>
              <input
                type="number"
                min="1"
                value={quantidadePessoas}
                onChange={(e) => setQuantidadePessoas(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Nome do responsável pela mesa (opcional)
              </label>
              <input
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
                placeholder="Ex: João"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={fecharModal}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={abrirComanda.isPending}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {abrirComanda.isPending ? "Abrindo..." : "Abrir comanda"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </main>
  );
}
