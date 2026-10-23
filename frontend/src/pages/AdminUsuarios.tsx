import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../lib/api";
import type { Papel, Usuario } from "../lib/auth";

const FORM_VAZIO = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  papeis_ids: [] as number[],
};

export default function AdminUsuarios() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState("");

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => (await api.get<Usuario[]>("/usuarios/")).data,
  });

  const { data: papeis } = useQuery({
    queryKey: ["papeis"],
    queryFn: async () => (await api.get<Papel[]>("/papeis/")).data,
  });

  const criar = useMutation({
    mutationFn: async () => api.post("/usuarios/", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setForm(FORM_VAZIO);
      setErro("");
    },
    onError: () => setErro("Não foi possível criar o usuário. Confira os dados."),
  });

  const desativar = useMutation({
    mutationFn: async (id: number) => api.delete(`/usuarios/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  function togglePapel(id: number) {
    setForm((f) => ({
      ...f,
      papeis_ids: f.papeis_ids.includes(id)
        ? f.papeis_ids.filter((p) => p !== id)
        : [...f.papeis_ids, id],
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Usuários</h1>
          <Link to="/perfil" className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-sm font-semibold text-slate-700">Novo usuário</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="Usuário"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Nome"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Sobrenome"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Papéis
            </span>
            <div className="flex flex-wrap gap-3">
              {papeis?.map((papel) => (
                <label
                  key={papel.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={form.papeis_ids.includes(papel.id)}
                    onChange={() => togglePapel(papel.id)}
                  />
                  {papel.name}
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={criar.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {criar.isPending ? "Criando..." : "Criar usuário"}
          </button>
        </form>

        <div className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {usuarios?.map((usuario) => (
            <div key={usuario.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {usuario.username}{" "}
                  {!usuario.is_active && (
                    <span className="text-xs text-red-600">(inativo)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {usuario.papeis.map((p) => p.name).join(", ") || "sem papel"}
                </p>
              </div>
              {usuario.is_active && (
                <button
                  onClick={() => desativar.mutate(usuario.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Desativar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
