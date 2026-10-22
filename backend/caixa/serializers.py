from rest_framework import serializers

from .models import Caixa, ConfiguracaoPreco, Mesa, MovimentoCaixa


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
