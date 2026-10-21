import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";

interface HealthResponse {
  status: string;
}

export default function StatusCiclo0() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.get<HealthResponse>("/health/");
      return response.data;
    },
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">
          PDV Restaurante — Ciclo 0
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Esta tela só confirma que o frontend (React) está conseguindo
          conversar com o backend (Django) através da API.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 p-4">
          <span className="text-sm font-medium text-slate-700">
            Status da API:
          </span>{" "}
          {isPending && (
            <span className="text-sm text-slate-400">verificando...</span>
          )}
          {isError && (
            <span className="text-sm text-red-600">
              não foi possível conectar à API
            </span>
          )}
          {data && (
            <span className="text-sm font-semibold text-emerald-600">
              {data.status}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
