from datetime import date
from decimal import Decimal

from django.db.models import Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from caixa.models import Caixa, MovimentoCaixa, Pagamento, PedidoAvulso, RecebimentoPagamento
from clientes.models import Cliente
from contas.permissions import exige_papel
from estoque.models import ItemEstoque

PAPEIS_FINANCEIRO = ("Administrador", "Caixa")
PAPEIS_ESTOQUE = ("Administrador", "Caixa", "Estoquista")


def obter_periodo(request):
    """
    Lê os query params ``inicio``/``fim`` (formato ``AAAA-MM-DD``) usados por
    todos os relatórios com filtro de período. Sem eles, assume o mês atual
    (do dia 1 até hoje). Retorna ``(inicio, fim, erro)`` — ``erro`` é uma
    `Response` 400 já pronta quando a validação falha, ou `None` quando o
    período é válido.
    """
    hoje = timezone.localdate()
    inicio_str = request.query_params.get("inicio")
    fim_str = request.query_params.get("fim")

    try:
        inicio = date.fromisoformat(inicio_str) if inicio_str else hoje.replace(day=1)
        fim = date.fromisoformat(fim_str) if fim_str else hoje
    except ValueError:
        return None, None, Response(
            {"detail": "Datas inválidas. Use o formato AAAA-MM-DD."}, status=400
        )

    if inicio > fim:
        return None, None, Response(
            {"detail": "'inicio' não pode ser depois de 'fim'."}, status=400
        )

    return inicio, fim, None


class RelatorioVendasView(APIView):
    """
    RF36: dashboard de vendas — faturamento por período, formas de
    pagamento e ticket médio, somando pagamentos de comanda e pedidos
    avulsos/delivery confirmados.
    """

    permission_classes = [exige_papel(*PAPEIS_FINANCEIRO)]

    def get(self, request):
        inicio, fim, erro = obter_periodo(request)
        if erro:
            return erro

        pagamentos = Pagamento.objects.filter(
            registrado_em__date__gte=inicio, registrado_em__date__lte=fim
        )
        avulsos = PedidoAvulso.objects.filter(
            status=PedidoAvulso.CONFIRMADO,
            confirmado_em__date__gte=inicio,
            confirmado_em__date__lte=fim,
        )

        total_pagamentos = pagamentos.aggregate(total=Sum("valor_final"))["total"] or Decimal("0")
        total_avulsos = avulsos.aggregate(total=Sum("valor_total"))["total"] or Decimal("0")
        faturamento_total = total_pagamentos + total_avulsos

        quantidade_vendas = pagamentos.count() + avulsos.count()
        ticket_medio = (
            faturamento_total / quantidade_vendas if quantidade_vendas else Decimal("0")
        )

        por_forma = {}
        for linha in (
            RecebimentoPagamento.objects.filter(pagamento__in=pagamentos)
            .values("forma")
            .annotate(valor=Sum("valor"))
        ):
            por_forma[linha["forma"]] = por_forma.get(linha["forma"], Decimal("0")) + (
                linha["valor"] or Decimal("0")
            )
        for linha in avulsos.values("forma_pagamento").annotate(valor=Sum("valor_total")):
            forma = linha["forma_pagamento"]
            if forma is None:
                continue
            por_forma[forma] = por_forma.get(forma, Decimal("0")) + (linha["valor"] or Decimal("0"))

        por_forma_pagamento = [
            {"forma": forma, "valor": valor} for forma, valor in sorted(por_forma.items())
        ]

        por_dia = {}
        for linha in (
            pagamentos.annotate(dia=TruncDate("registrado_em"))
            .values("dia")
            .annotate(valor=Sum("valor_final"))
        ):
            por_dia[linha["dia"]] = por_dia.get(linha["dia"], Decimal("0")) + (
                linha["valor"] or Decimal("0")
            )
        for linha in (
            avulsos.annotate(dia=TruncDate("confirmado_em"))
            .values("dia")
            .annotate(valor=Sum("valor_total"))
        ):
            por_dia[linha["dia"]] = por_dia.get(linha["dia"], Decimal("0")) + (
                linha["valor"] or Decimal("0")
            )

        faturamento_por_dia = [
            {"data": dia, "valor": valor} for dia, valor in sorted(por_dia.items())
        ]

        return Response(
            {
                "periodo": {"inicio": inicio, "fim": fim},
                "faturamento_total": faturamento_total,
                "quantidade_vendas": quantidade_vendas,
                "ticket_medio": ticket_medio,
                "por_forma_pagamento": por_forma_pagamento,
                "faturamento_por_dia": faturamento_por_dia,
            }
        )


class RelatorioEstoqueBaixoView(APIView):
    """RF37: itens de estoque ativos abaixo da quantidade mínima configurada."""

    permission_classes = [exige_papel(*PAPEIS_ESTOQUE)]

    def get(self, request):
        itens_baixos = [
            item for item in ItemEstoque.objects.filter(ativo=True) if item.estoque_baixo()
        ]
        itens_baixos.sort(key=lambda item: item.nome)

        return Response(
            {
                "itens": [
                    {
                        "id": item.id,
                        "nome": item.nome,
                        "unidade_medida": item.unidade_medida,
                        "quantidade_atual": item.quantidade_atual(),
                        "quantidade_minima": item.quantidade_minima,
                    }
                    for item in itens_baixos
                ]
            }
        )


class RelatorioCaixaView(APIView):
    """RF38: relatório financeiro de caixa (entradas/saídas) por período."""

    permission_classes = [exige_papel(*PAPEIS_FINANCEIRO)]

    def get(self, request):
        inicio, fim, erro = obter_periodo(request)
        if erro:
            return erro

        # Um caixa é uma sessão que pode atravessar a borda do período pedido
        # (ex: aberto ontem, ainda aberto hoje). Filtrar só por `aberto_em`
        # faria vendas de hoje "desaparecerem" de um relatório de "hoje" só
        # porque o caixa não foi fechado ontem. Por isso: a sessão entra na
        # lista se esteve ativa em algum momento do período (aberta até
        # `fim`, e fechada só depois de `inicio` ou ainda aberta); já os
        # totais de cada sessão (abaixo) são recortados pelo período de
        # verdade, para não somar movimento de fora da janela pedida.
        caixas = Caixa.objects.filter(
            Q(aberto_em__date__lte=fim) & (Q(fechado_em__isnull=True) | Q(fechado_em__date__gte=inicio))
        )

        dados_caixas = []
        totais = {
            "valor_abertura": Decimal("0"),
            "total_suprimento": Decimal("0"),
            "total_sangria": Decimal("0"),
            "total_recebido_dinheiro": Decimal("0"),
        }

        for caixa in caixas:
            total_suprimento = caixa.movimentos.filter(
                tipo=MovimentoCaixa.SUPRIMENTO,
                criado_em__date__gte=inicio,
                criado_em__date__lte=fim,
            ).aggregate(total=Sum("valor"))["total"] or Decimal("0")
            total_sangria = caixa.movimentos.filter(
                tipo=MovimentoCaixa.SANGRIA,
                criado_em__date__gte=inicio,
                criado_em__date__lte=fim,
            ).aggregate(total=Sum("valor"))["total"] or Decimal("0")

            total_recebido_pagamentos = RecebimentoPagamento.objects.filter(
                pagamento__caixa=caixa,
                forma=RecebimentoPagamento.DINHEIRO,
                pagamento__registrado_em__date__gte=inicio,
                pagamento__registrado_em__date__lte=fim,
            ).aggregate(total=Sum("valor"))["total"] or Decimal("0")
            total_recebido_avulsos = caixa.pedidos_avulsos.filter(
                status=PedidoAvulso.CONFIRMADO,
                forma_pagamento=RecebimentoPagamento.DINHEIRO,
                confirmado_em__date__gte=inicio,
                confirmado_em__date__lte=fim,
            ).aggregate(total=Sum("valor_total"))["total"] or Decimal("0")
            total_recebido_dinheiro = total_recebido_pagamentos + total_recebido_avulsos

            if caixa.valor_fechamento_informado is not None and caixa.valor_fechamento_esperado is not None:
                diferenca = caixa.valor_fechamento_informado - caixa.valor_fechamento_esperado
            else:
                diferenca = None

            dados_caixas.append(
                {
                    "id": caixa.id,
                    "status": caixa.status,
                    "aberto_em": caixa.aberto_em,
                    "fechado_em": caixa.fechado_em,
                    "aberto_por": caixa.aberto_por.username if caixa.aberto_por else None,
                    "valor_abertura": caixa.valor_abertura,
                    "total_suprimento": total_suprimento,
                    "total_sangria": total_sangria,
                    "total_recebido_dinheiro": total_recebido_dinheiro,
                    "valor_fechamento_esperado": caixa.valor_fechamento_esperado,
                    "valor_fechamento_informado": caixa.valor_fechamento_informado,
                    "diferenca": diferenca,
                }
            )

            totais["valor_abertura"] += caixa.valor_abertura
            totais["total_suprimento"] += total_suprimento
            totais["total_sangria"] += total_sangria
            totais["total_recebido_dinheiro"] += total_recebido_dinheiro

        return Response(
            {
                "periodo": {"inicio": inicio, "fim": fim},
                "caixas": dados_caixas,
                "totais": totais,
            }
        )


class RelatorioContasAReceberView(APIView):
    """RF39: clientes fiado com saldo devedor em aberto (foto do momento atual)."""

    permission_classes = [exige_papel(*PAPEIS_FINANCEIRO)]

    def get(self, request):
        clientes_com_saldo = []
        total_geral = Decimal("0")
        for cliente in Cliente.objects.all():
            saldo = cliente.saldo_devedor()
            if saldo > 0:
                clientes_com_saldo.append((cliente, saldo))
                total_geral += saldo

        clientes_com_saldo.sort(key=lambda par: par[1], reverse=True)

        return Response(
            {
                "clientes": [
                    {
                        "id": cliente.id,
                        "nome": cliente.nome,
                        "telefone": cliente.telefone,
                        "saldo_devedor": saldo,
                    }
                    for cliente, saldo in clientes_com_saldo
                ],
                "total_geral": total_geral,
            }
        )
