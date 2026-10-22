export interface Mesa {
  id: number;
  numero: number;
  status: "livre" | "ocupada";
}

export interface ConfiguracaoPreco {
  id: number;
  valor_prato: string;
  valor_unidade_extra: string;
  atualizado_em: string;
  atualizado_por_username: string | null;
}

export interface MovimentoCaixa {
  id: number;
  caixa: number;
  tipo: "sangria" | "suprimento";
  valor: string;
  descricao: string;
  usuario_username: string | null;
  criado_em: string;
}

export interface Caixa {
  id: number;
  status: "aberto" | "fechado";
  valor_abertura: string;
  aberto_por_username: string | null;
  aberto_em: string;
  valor_fechamento_informado: string | null;
  valor_fechamento_esperado: string | null;
  fechado_por_username: string | null;
  fechado_em: string | null;
  saldo_atual: number;
  movimentos: MovimentoCaixa[];
}
