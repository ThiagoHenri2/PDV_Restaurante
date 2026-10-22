from rest_framework import serializers

from .models import Comanda, ItemComandaPrato


class ItemComandaPratoSerializer(serializers.ModelSerializer):
    registrado_por_username = serializers.CharField(
        source="registrado_por.username", read_only=True, default=None
    )
    cancelado_por_username = serializers.CharField(
        source="cancelado_por.username", read_only=True, default=None
    )

    class Meta:
        model = ItemComandaPrato
        fields = [
            "id",
            "comanda",
            "quantidade_pratos",
            "quantidade_extras_proteina",
            "registrado_por_username",
            "registrado_em",
            "cancelado",
            "cancelado_por_username",
            "cancelado_em",
        ]
        read_only_fields = [
            "registrado_por_username",
            "registrado_em",
            "cancelado",
            "cancelado_por_username",
            "cancelado_em",
        ]


class ComandaSerializer(serializers.ModelSerializer):
    mesa_numero = serializers.IntegerField(source="mesa.numero", read_only=True)
    aberta_por_username = serializers.CharField(
        source="aberta_por.username", read_only=True, default=None
    )
    fechada_por_username = serializers.CharField(
        source="fechada_por.username", read_only=True, default=None
    )
    itens_prato = ItemComandaPratoSerializer(many=True, read_only=True)
    valor_parcial_estimado = serializers.SerializerMethodField()
    pago = serializers.SerializerMethodField()
    pagamento = serializers.SerializerMethodField()

    class Meta:
        model = Comanda
        fields = [
            "id",
            "mesa",
            "mesa_numero",
            "quantidade_pessoas",
            "status",
            "aberta_por_username",
            "aberta_em",
            "fechada_por_username",
            "fechada_em",
            "itens_prato",
            "valor_parcial_estimado",
            "pago",
            "pagamento",
        ]
        read_only_fields = [
            "status",
            "aberta_por_username",
            "aberta_em",
            "fechada_por_username",
            "fechada_em",
        ]

    def get_valor_parcial_estimado(self, obj):
        return obj.valor_parcial_estimado()

    def get_pago(self, obj):
        return hasattr(obj, "pagamento")

    def get_pagamento(self, obj):
        pagamento = getattr(obj, "pagamento", None)
        if not pagamento:
            return None
        return {
            "id": pagamento.id,
            "valor_bruto": str(pagamento.valor_bruto),
            "tipo_desconto": pagamento.tipo_desconto,
            "valor_desconto_aplicado": str(pagamento.valor_desconto_aplicado),
            "valor_final": str(pagamento.valor_final),
            "registrado_em": pagamento.registrado_em,
        }
