export type UnidadeMedida = "un" | "kg" | "g" | "l" | "ml";

export interface ItemEstoque {
  id: number;
  nome: string;
  unidade_medida: UnidadeMedida;
  quantidade_minima: string;
  ativo: boolean;
  quantidade_atual: number;
  estoque_baixo: boolean;
  produto_id: number | null;
  produto_nome: string | null;
}

export interface MovimentoEstoque {
  id: number;
  item: number;
  item_nome: string;
  tipo: "entrada" | "baixa_automatica" | "ajuste";
  quantidade: string;
  descricao: string;
  usuario_username: string | null;
  criado_em: string;
}

export type CategoriaProduto = "bebida" | "sobremesa" | "marmitex" | "delivery" | "outro";

export interface Produto {
  id: number;
  nome: string;
  categoria: CategoriaProduto;
  preco: string;
  item_estoque: number;
  ativo: boolean;
  quantidade_atual: number;
}
