import { api } from "./api";
import type { FormaPagamento } from "./caixa";
import type { UnidadeMedida } from "./estoque";

export interface PeriodoRelatorio {
  inicio: string;
  fim: string;
}

export interface FaturamentoPorFormaPagamento {
  forma: FormaPagamento;
  valor: string;
}

export interface FaturamentoPorDia {
  data: string;
  valor: string;
}

export interface RelatorioVendas {
  periodo: PeriodoRelatorio;
  faturamento_total: string;
  quantidade_vendas: number;
  ticket_medio: string;
  por_forma_pagamento: FaturamentoPorFormaPagamento[];
  faturamento_por_dia: FaturamentoPorDia[];
}

export interface ItemEstoqueBaixo {
  id: number;
  nome: string;
  unidade_medida: UnidadeMedida;
  quantidade_atual: string;
  quantidade_minima: string;
}

export interface RelatorioEstoqueBaixo {
  itens: ItemEstoqueBaixo[];
}

export type StatusCaixa = "aberto" | "fechado";

export interface CaixaRelatorio {
  id: number;
  status: StatusCaixa;
  aberto_em: string;
  fechado_em: string | null;
  aberto_por: string | null;
  valor_abertura: string;
  total_suprimento: string;
  total_sangria: string;
  total_recebido_dinheiro: string;
  valor_fechamento_esperado: string | null;
  valor_fechamento_informado: string | null;
  diferenca: string | null;
}

export interface TotaisRelatorioCaixa {
  valor_abertura: string;
  total_suprimento: string;
  total_sangria: string;
  total_recebido_dinheiro: string;
}

export interface RelatorioCaixa {
  periodo: PeriodoRelatorio;
  caixas: CaixaRelatorio[];
  totais: TotaisRelatorioCaixa;
}

export interface ClienteContaAReceber {
  id: number;
  nome: string;
  telefone: string;
  saldo_devedor: string;
}

export interface RelatorioContasAReceber {
  clientes: ClienteContaAReceber[];
  total_geral: string;
}

export interface FiltroPeriodo {
  inicio?: string;
  fim?: string;
}

export async function buscarRelatorioVendas(filtro: FiltroPeriodo): Promise<RelatorioVendas> {
  return (await api.get<RelatorioVendas>("/relatorios/vendas/", { params: filtro })).data;
}

export async function buscarEstoqueBaixo(): Promise<RelatorioEstoqueBaixo> {
  return (await api.get<RelatorioEstoqueBaixo>("/relatorios/estoque-baixo/")).data;
}

export async function buscarRelatorioCaixa(filtro: FiltroPeriodo): Promise<RelatorioCaixa> {
  return (await api.get<RelatorioCaixa>("/relatorios/caixa/", { params: filtro })).data;
}

export async function buscarContasAReceber(): Promise<RelatorioContasAReceber> {
  return (await api.get<RelatorioContasAReceber>("/relatorios/contas-a-receber/")).data;
}
