from decimal import Decimal

from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from contas.auditoria import registrar_auditoria
from contas.permissions import exige_papel

from . import services
from .models import Cliente
from .serializers import ClienteSerializer, LancamentoContaClienteSerializer

PAPEIS_CLIENTES = ("Administrador", "Caixa")


class ClienteViewSet(ModelViewSet):
    """
    Cadastro de clientes fiado (RF32) e sua conta corrente (RF33-RF35).
    Restrito a Administrador/Caixa (dado financeiro) — sem excessão para
    leitura. Sem DELETE: cliente com histórico de lançamento não pode ser
    removido, só inativado via `ativo=False` (PATCH).
    """

    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [exige_papel(*PAPEIS_CLIENTES)]
    http_method_names = ["get", "post", "patch", "head", "options"]

    @action(detail=True, methods=["get"])
    def extrato(self, request, pk=None):
        """RF35: histórico de consumo/pagamento e saldo devedor atual."""
        cliente = self.get_object()
        return Response(
            {
                "saldo_devedor": cliente.saldo_devedor(),
                "lancamentos": LancamentoContaClienteSerializer(
                    cliente.lancamentos.all(), many=True
                ).data,
            }
        )

    @action(detail=True, methods=["post"])
    def fechar_mes(self, request, pk=None):
        """
        RF34: fechamento mensal da conta (pagamento total ou parcial).
        Lê o saldo e cria o lançamento na mesma transação, com
        `select_for_update`, para que dois fechamentos concorrentes do
        mesmo cliente não leiam o mesmo saldo "cheio" e deixem o cliente
        credor por engano.
        """
        with transaction.atomic():
            cliente = Cliente.objects.select_for_update().get(pk=self.get_object().pk)
            saldo_antes = cliente.saldo_devedor()

            valor_informado = request.data.get("valor")
            if valor_informado is None:
                if saldo_antes <= 0:
                    raise serializers.ValidationError(
                        {"valor": "Não há saldo devedor para fechar."}
                    )
                valor = Decimal(str(saldo_antes))
            else:
                try:
                    valor = Decimal(str(valor_informado))
                except Exception:
                    raise serializers.ValidationError({"valor": "Valor inválido."})
                if valor <= 0:
                    raise serializers.ValidationError({"valor": "Valor precisa ser maior que zero."})
                if valor > saldo_antes:
                    raise serializers.ValidationError(
                        {"valor": f"Valor informado (R${valor}) é maior que o saldo devedor (R${saldo_antes})."}
                    )

            services.lancar_pagamento(
                cliente,
                valor,
                request.user,
                descricao=f"Fechamento mensal da conta de {cliente.nome}.",
            )
            saldo_apos = cliente.saldo_devedor()
            registrar_auditoria(
                request.user,
                "cliente_fechamento_mensal",
                f"Fechamento da conta de {cliente.nome}: pagamento de R${valor}. "
                f"Saldo anterior: R${saldo_antes}, saldo após: R${saldo_apos}.",
            )

        cliente.refresh_from_db()
        return Response(ClienteSerializer(cliente).data)
