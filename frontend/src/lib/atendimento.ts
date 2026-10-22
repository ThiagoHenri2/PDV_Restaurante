export interface ItemComandaPrato {
  id: number;
  comanda: number;
  quantidade_pratos: number;
  quantidade_extras_proteina: number;
  registrado_por_username: string | null;
  registrado_em: string;
  cancelado: boolean;
  cancelado_por_username: string | null;
  cancelado_em: string | null;
}

export interface ResumoPagamentoComanda {
  id: number;
  valor_bruto: string;
  tipo_desconto: "nenhum" | "fixo" | "percentual";
  valor_desconto_aplicado: string;
  valor_final: string;
  registrado_em: string;
}

export interface Comanda {
  id: number;
  mesa: number;
  mesa_numero: number;
  quantidade_pessoas: number;
  status: "aberta" | "fechada";
  aberta_por_username: string | null;
  aberta_em: string;
  fechada_por_username: string | null;
  fechada_em: string | null;
  itens_prato: ItemComandaPrato[];
  valor_parcial_estimado: number;
  pago: boolean;
  pagamento: ResumoPagamentoComanda | null;
}
