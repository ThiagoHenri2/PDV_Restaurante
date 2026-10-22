from rest_framework import serializers

from .models import Cliente, LancamentoContaCliente


class LancamentoContaClienteSerializer(serializers.ModelSerializer):
    criado_por_username = serializers.CharField(source="criado_por.username", read_only=True, default=None)

    class Meta:
        model = LancamentoContaCliente
        fields = ["id", "cliente", "tipo", "valor", "descricao", "criado_por_username", "criado_em"]
        read_only_fields = fields


class ClienteSerializer(serializers.ModelSerializer):
    saldo_devedor = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ["id", "nome", "telefone", "observacoes", "ativo", "saldo_devedor", "criado_em"]
        read_only_fields = ["saldo_devedor", "criado_em"]

    def get_saldo_devedor(self, obj):
        return obj.saldo_devedor()
