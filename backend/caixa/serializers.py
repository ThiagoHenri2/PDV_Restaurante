from rest_framework import serializers

from .models import (
    Caixa,
    ConfiguracaoPreco,
    ItemPedidoAvulso,
    Mesa,
    MovimentoCaixa,
    Pagamento,
    PedidoAvulso,
    RecebimentoPagamento,
)


class MesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mesa
        fields = ["id", "numero", "status"]


class ConfiguracaoPrecoSerializer(serializers.ModelSerializer):
    atualizado_por_username = serializers.CharField(
        source="atualizado_por.username", read_only=True, default=None
    )

    class Meta:
        model = ConfiguracaoPreco
        fields = [
            "id",
            "valor_prato",
            "valor_unidade_extra",
            "atualizado_em",
            "atualizado_por_username",
        ]
        read_only_fields = ["atualizado_em", "atualizado_por_username"]


class MovimentoCaixaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source="usuario.username", read_only=True, default=None)

    class Meta:
        model = MovimentoCaixa
        fields = ["id", "caixa", "tipo", "valor", "descricao", "usuario_username", "criado_em"]
        read_only_fields = ["caixa", "usuario_username", "criado_em"]


class CaixaSerializer(serializers.ModelSerializer):
    aberto_por_username = serializers.CharField(source="aberto_por.username", read_only=True, default=None)
    fechado_por_username = serializers.CharField(
        source="fechado_por.username", read_only=True, default=None
    )
    saldo_atual = serializers.SerializerMethodField()
    movimentos = MovimentoCaixaSerializer(many=True, read_only=True)

    class Meta:
        model = Caixa
        fields = [
            "id",
            "status",
            "valor_abertura",
            "aberto_por_username",
            "aberto_em",
            "valor_fechamento_informado",
            "valor_fechamento_esperado",
            "fechado_por_username",
            "fechado_em",
            "saldo_atual",
            "movimentos",
        ]

    def get_saldo_atual(self, obj):
        return obj.calcular_valor_esperado()


class RecebimentoPagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecebimentoPagamento
        fields = ["id", "forma", "valor", "descricao"]


class PagamentoSerializer(serializers.ModelSerializer):
    comanda_mesa_numero = serializers.IntegerField(source="comanda.mesa.numero", read_only=True)
    registrado_por_username = serializers.CharField(
        source="registrado_por.username", read_only=True, default=None
    )
    recebimentos = RecebimentoPagamentoSerializer(many=True, read_only=True)

    class Meta:
        model = Pagamento
        fields = [
            "id",
            "comanda",
            "comanda_mesa_numero",
            "caixa",
            "valor_bruto",
            "tipo_desconto",
            "valor_desconto",
            "valor_desconto_aplicado",
            "valor_final",
            "registrado_por_username",
            "registrado_em",
            "recebimentos",
        ]


class ItemPedidoAvulsoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemPedidoAvulso
        fields = ["id", "pedido", "produto", "produto_nome", "quantidade", "preco_unitario", "subtotal"]
        read_only_fields = ["preco_unitario"]

    def get_subtotal(self, obj):
        return obj.subtotal()


class PedidoAvulsoSerializer(serializers.ModelSerializer):
    criado_por_username = serializers.CharField(source="criado_por.username", read_only=True, default=None)
    confirmado_por_username = serializers.CharField(
        source="confirmado_por.username", read_only=True, default=None
    )
    itens = ItemPedidoAvulsoSerializer(many=True, read_only=True)
    valor_calculado = serializers.SerializerMethodField()

    class Meta:
        model = PedidoAvulso
        fields = [
            "id",
            "tipo",
            "status",
            "endereco",
            "forma_pagamento",
            "valor_total",
            "caixa",
            "criado_por_username",
            "criado_em",
            "confirmado_por_username",
            "confirmado_em",
            "itens",
            "valor_calculado",
        ]
        read_only_fields = [
            "status",
            "forma_pagamento",
            "valor_total",
            "caixa",
            "criado_por_username",
            "criado_em",
            "confirmado_por_username",
            "confirmado_em",
        ]

    def get_valor_calculado(self, obj):
        return obj.valor_calculado()
