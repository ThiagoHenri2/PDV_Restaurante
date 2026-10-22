export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  observacoes: string;
  ativo: boolean;
  saldo_devedor: number;
  criado_em: string;
}

export interface LancamentoContaCliente {
  id: number;
  cliente: number;
  tipo: "consumo" | "pagamento";
  valor: number;
  descricao: string;
  criado_por_username: string | null;
  criado_em: string;
}

export interface ExtratoCliente {
  saldo_devedor: number;
  lancamentos: LancamentoContaCliente[];
}
