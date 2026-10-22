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

export type FormaPagamento = "dinheiro" | "debito" | "credito" | "pix" | "fiado";
export type TipoDesconto = "nenhum" | "fixo" | "percentual";

export interface RecebimentoPagamento {
  id: number;
  forma: FormaPagamento;
  valor: string;
  descricao: string;
}

export interface Pagamento {
  id: number;
  comanda: number;
  comanda_mesa_numero: number;
  caixa: number;
  valor_bruto: string;
  tipo_desconto: TipoDesconto;
  valor_desconto: string;
  valor_desconto_aplicado: string;
  valor_final: string;
  registrado_por_username: string | null;
  registrado_em: string;
  recebimentos: RecebimentoPagamento[];
  cliente: number | null;
  cliente_nome: string | null;
}

export type TipoPedidoAvulso = "balcao" | "delivery";
export type StatusPedidoAvulso = "aberto" | "confirmado" | "cancelado";

export interface ItemPedidoAvulso {
  id: number;
  pedido: number;
  produto: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: string;
  subtotal: number;
}

export interface PedidoAvulso {
  id: number;
  tipo: TipoPedidoAvulso;
  status: StatusPedidoAvulso;
  endereco: string;
  forma_pagamento: FormaPagamento | null;
  valor_total: string | null;
  caixa: number | null;
  criado_por_username: string | null;
  criado_em: string;
  confirmado_por_username: string | null;
  confirmado_em: string | null;
  itens: ItemPedidoAvulso[];
  valor_calculado: number;
  cliente: number | null;
  cliente_nome: string | null;
}
