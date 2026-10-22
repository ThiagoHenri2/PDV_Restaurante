from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from atendimento.models import Comanda
from clientes import services as clientes_services
from clientes.models import Cliente
from contas.auditoria import registrar_auditoria
from contas.permissions import exige_papel
from estoque import services as estoque_services

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
from .serializers import (
    CaixaSerializer,
    ConfiguracaoPrecoSerializer,
    ItemPedidoAvulsoSerializer,
    MesaSerializer,
    MovimentoCaixaSerializer,
    PagamentoSerializer,
    PedidoAvulsoSerializer,
)

PAPEIS_CAIXA = ("Administrador", "Caixa")


class MesaViewSet(ModelViewSet):
    """
    CRUD de mesas (RF06). Leitura é liberada também para o Atendente (ele
    precisa ver quais mesas existem e seu status para alocar clientes no
    Ciclo 3); criar/editar/excluir é só Administrador/Caixa.
    """

    queryset = Mesa.objects.all()
    serializer_class = MesaSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [exige_papel("Administrador", "Caixa", "Atendente")()]
        return [exige_papel(*PAPEIS_CAIXA)()]


class ConfiguracaoPrecoView(APIView):
    """GET/PUT da configuração de preço atual (RF07)."""

    permission_classes = [exige_papel(*PAPEIS_CAIXA)]

    def get(self, request):
        config = ConfiguracaoPreco.atual()
        return Response(ConfiguracaoPrecoSerializer(config).data)

    def put(self, request):
        serializer = ConfiguracaoPrecoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nova_config = ConfiguracaoPreco.objects.create(
            valor_prato=serializer.validated_data["valor_prato"],
            valor_unidade_extra=serializer.validated_data["valor_unidade_extra"],
            atualizado_por=request.user,
        )
        registrar_auditoria(
            request.user,
            "configuracao_preco_alterada",
            f"Prato: R${nova_config.valor_prato} / Extra: R${nova_config.valor_unidade_extra}",
        )
        return Response(ConfiguracaoPrecoSerializer(nova_config).data)


class CaixaViewSet(ModelViewSet):
    """Abertura/fechamento de caixa (RF08/RF09) e histórico."""

    queryset = Caixa.objects.all()
    serializer_class = CaixaSerializer
    permission_classes = [exige_papel(*PAPEIS_CAIXA)]
    http_method_names = ["get", "post", "head", "options"]

    @action(detail=False, methods=["get"])
    def atual(self, request):
        caixa = Caixa.objects.filter(status=Caixa.ABERTO).first()
        if not caixa:
            return Response({"detail": "Nenhum caixa aberto."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaixaSerializer(caixa).data)

    @action(detail=False, methods=["post"])
    def abrir(self, request):
        if Caixa.objects.filter(status=Caixa.ABERTO).exists():
            return Response(
                {"detail": "Já existe um caixa aberto. Feche-o antes de abrir outro."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valor_abertura = request.data.get("valor_abertura")
        if valor_abertura is None:
            raise serializers.ValidationError({"valor_abertura": "Obrigatório."})

        with transaction.atomic():
            caixa = Caixa.objects.create(valor_abertura=valor_abertura, aberto_por=request.user)
            registrar_auditoria(request.user, "caixa_aberto", f"Caixa #{caixa.pk} aberto com R${valor_abertura}.")

        return Response(CaixaSerializer(caixa).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def fechar(self, request, pk=None):
        caixa = self.get_object()
        if caixa.status == Caixa.FECHADO:
            return Response({"detail": "Este caixa já está fechado."}, status=status.HTTP_400_BAD_REQUEST)

        valor_informado = request.data.get("valor_fechamento_informado")
        if valor_informado is None:
            raise serializers.ValidationError({"valor_fechamento_informado": "Obrigatório."})

        with transaction.atomic():
            esperado = caixa.calcular_valor_esperado()
            caixa.valor_fechamento_informado = valor_informado
            caixa.valor_fechamento_esperado = esperado
            caixa.status = Caixa.FECHADO
            caixa.fechado_por = request.user
            caixa.fechado_em = timezone.now()
            caixa.save()

            diferenca = float(valor_informado) - float(esperado)
            registrar_auditoria(
                request.user,
                "caixa_fechado",
                f"Caixa #{caixa.pk} fechado. Esperado: R${esperado}, informado: R${valor_informado}, diferença: R${diferenca:.2f}.",
            )

        return Response(CaixaSerializer(caixa).data)


class MovimentoCaixaViewSet(ModelViewSet):
    """Sangria e suprimento (RF10), sempre no caixa aberto no momento."""

    queryset = MovimentoCaixa.objects.all()
    serializer_class = MovimentoCaixaSerializer
    permission_classes = [exige_papel(*PAPEIS_CAIXA)]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return super().get_queryset().select_related("usuario")

    def perform_create(self, serializer):
        caixa = Caixa.objects.filter(status=Caixa.ABERTO).first()
        if not caixa:
            raise serializers.ValidationError({"detail": "Não há caixa aberto para lançar este movimento."})

        movimento = serializer.save(caixa=caixa, usuario=self.request.user)
        registrar_auditoria(
            self.request.user,
            f"caixa_{movimento.tipo}",
            f"{movimento.get_tipo_display()} de R${movimento.valor} no caixa #{caixa.pk}.",
        )


class PagamentoViewSet(ModelViewSet):
    """
    Finalização de pagamento de comanda (RF11-RF13): calcula o valor final,
    aplica desconto e registra o(s) recebimento(s). Não existe edição ou
    exclusão de pagamento — é um registro financeiro definitivo (RNF06).
    """

    queryset = Pagamento.objects.select_related("comanda__mesa", "registrado_por").prefetch_related(
        "recebimentos"
    )
    serializer_class = PagamentoSerializer
    permission_classes = [exige_papel(*PAPEIS_CAIXA)]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        comanda_id = request.data.get("comanda")
        if not comanda_id:
            raise serializers.ValidationError({"comanda": "Obrigatório."})
        try:
            comanda = Comanda.objects.select_related("mesa").get(pk=comanda_id)
        except Comanda.DoesNotExist:
            raise serializers.ValidationError({"comanda": "Comanda não encontrada."})

        if comanda.status != Comanda.FECHADA:
            raise serializers.ValidationError(
                {"comanda": "A comanda precisa estar fechada antes do pagamento."}
            )
        if Pagamento.objects.filter(comanda=comanda).exists():
            raise serializers.ValidationError({"comanda": "Esta comanda já foi paga."})

        caixa = Caixa.objects.filter(status=Caixa.ABERTO).first()
        if not caixa:
            raise serializers.ValidationError(
                {"detail": "Não há caixa aberto para registrar este pagamento."}
            )

        tipo_desconto = request.data.get("tipo_desconto", Pagamento.NENHUM)
        valor_bruto = comanda.valor_parcial_estimado()

        try:
            valor_desconto = Decimal(str(request.data.get("valor_desconto") or 0))
        except Exception:
            raise serializers.ValidationError({"valor_desconto": "Valor inválido."})

        if tipo_desconto == Pagamento.FIXO:
            if valor_desconto < 0 or valor_desconto > valor_bruto:
                raise serializers.ValidationError(
                    {"valor_desconto": "Desconto fixo inválido para o valor da comanda."}
                )
            valor_desconto_aplicado = valor_desconto
        elif tipo_desconto == Pagamento.PERCENTUAL:
            if valor_desconto < 0 or valor_desconto > 100:
                raise serializers.ValidationError(
                    {"valor_desconto": "Percentual deve estar entre 0 e 100."}
                )
            valor_desconto_aplicado = (valor_bruto * valor_desconto / Decimal("100")).quantize(
                Decimal("0.01")
            )
        else:
            tipo_desconto = Pagamento.NENHUM
            valor_desconto = Decimal("0")
            valor_desconto_aplicado = Decimal("0")

        valor_final = valor_bruto - valor_desconto_aplicado

        recebimentos_data = request.data.get("recebimentos") or []
        if not recebimentos_data:
            raise serializers.ValidationError({"recebimentos": "Informe ao menos uma forma de pagamento."})

        formas_validas = {choice[0] for choice in RecebimentoPagamento.FORMA_CHOICES}
        total_recebido = Decimal("0")
        recebimentos_limpos = []
        for item in recebimentos_data:
            forma = item.get("forma")
            if forma not in formas_validas:
                raise serializers.ValidationError({"recebimentos": f"Forma de pagamento inválida: {forma}."})
            try:
                valor = Decimal(str(item.get("valor") or 0))
            except Exception:
                raise serializers.ValidationError({"recebimentos": "Valor inválido numa forma de pagamento."})
            if valor <= 0:
                raise serializers.ValidationError(
                    {"recebimentos": "Cada forma de pagamento precisa ter valor maior que zero."}
                )
            total_recebido += valor
            recebimentos_limpos.append(
                {"forma": forma, "valor": valor, "descricao": item.get("descricao", "")}
            )

        if total_recebido != valor_final:
            raise serializers.ValidationError(
                {
                    "recebimentos": (
                        f"A soma das formas de pagamento (R${total_recebido}) precisa ser "
                        f"igual ao valor final (R${valor_final})."
                    )
                }
            )

        total_fiado = sum(
            (item["valor"] for item in recebimentos_limpos if item["forma"] == RecebimentoPagamento.FIADO),
            Decimal("0"),
        )
        cliente_id = request.data.get("cliente")
        cliente = None
        if total_fiado > 0 and not cliente_id:
            raise serializers.ValidationError(
                {"cliente": "Informe o cliente fiado para usar a forma de pagamento Fiado."}
            )
        if cliente_id:
            try:
                cliente = Cliente.objects.get(pk=cliente_id)
            except (Cliente.DoesNotExist, ValueError, TypeError):
                raise serializers.ValidationError({"cliente": "Cliente não encontrado."})

        with transaction.atomic():
            pagamento = Pagamento.objects.create(
                comanda=comanda,
                caixa=caixa,
                valor_bruto=valor_bruto,
                tipo_desconto=tipo_desconto,
                valor_desconto=valor_desconto,
                valor_desconto_aplicado=valor_desconto_aplicado,
                valor_final=valor_final,
                registrado_por=request.user,
            )
            for recebimento in recebimentos_limpos:
                RecebimentoPagamento.objects.create(pagamento=pagamento, **recebimento)

            descricao_auditoria = (
                f"Pagamento da comanda #{comanda.pk} (mesa {comanda.mesa.numero}): "
                f"bruto R${valor_bruto}, desconto R${valor_desconto_aplicado} "
                f"({pagamento.get_tipo_desconto_display()}), final R${valor_final}."
            )

            if total_fiado > 0:
                pagamento.cliente = cliente
                pagamento.save(update_fields=["cliente"])
                clientes_services.lancar_consumo(
                    cliente,
                    total_fiado,
                    request.user,
                    descricao=f"Pagamento comanda #{comanda.pk} (mesa {comanda.mesa.numero}).",
                )
                descricao_auditoria += f" Fiado: R${total_fiado} para {cliente.nome}."

            registrar_auditoria(request.user, "comanda_pagamento_finalizado", descricao_auditoria)

        return Response(PagamentoSerializer(pagamento).data, status=status.HTTP_201_CREATED)


class PedidoAvulsoViewSet(ModelViewSet):
    """
    Pedido avulso de balcão/delivery (RF14/RF15): começa como um carrinho
    (`aberto`) e só afeta estoque/caixa quando `confirmar` é chamado.
    """

    queryset = PedidoAvulso.objects.select_related("criado_por", "confirmado_por").prefetch_related(
        "itens__produto"
    )
    serializer_class = PedidoAvulsoSerializer
    permission_classes = [exige_papel(*PAPEIS_CAIXA)]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        pedido = serializer.save(criado_por=self.request.user)
        registrar_auditoria(self.request.user, "pedido_avulso_criado", f"Pedido avulso #{pedido.pk} ({pedido.tipo}) criado.")

    @action(detail=True, methods=["get"])
    def texto_whatsapp(self, request, pk=None):
        pedido = self.get_object()
        return Response({"texto": pedido.texto_whatsapp()})

    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        pedido = self.get_object()
        if pedido.status != PedidoAvulso.ABERTO:
            return Response({"detail": "Este pedido não está mais aberto."}, status=status.HTTP_400_BAD_REQUEST)

        itens = list(pedido.itens.select_related("produto"))
        if not itens:
            raise serializers.ValidationError({"detail": "Adicione ao menos um item antes de confirmar."})

        forma_pagamento = request.data.get("forma_pagamento")
        formas_validas = {choice[0] for choice in RecebimentoPagamento.FORMA_CHOICES}
        if forma_pagamento not in formas_validas:
            raise serializers.ValidationError({"forma_pagamento": "Forma de pagamento inválida."})

        cliente_id = request.data.get("cliente")
        cliente = None
        if forma_pagamento == RecebimentoPagamento.FIADO and not cliente_id:
            raise serializers.ValidationError(
                {"cliente": "Informe o cliente fiado para usar a forma de pagamento Fiado."}
            )
        if cliente_id:
            try:
                cliente = Cliente.objects.get(pk=cliente_id)
            except (Cliente.DoesNotExist, ValueError, TypeError):
                raise serializers.ValidationError({"cliente": "Cliente não encontrado."})

        caixa = Caixa.objects.filter(status=Caixa.ABERTO).first()
        if not caixa:
            raise serializers.ValidationError({"detail": "Não há caixa aberto para confirmar este pedido."})

        valor_total = pedido.valor_calculado()

        with transaction.atomic():
            for item in itens:
                estoque_services.baixar_estoque(
                    item.produto,
                    item.quantidade,
                    request.user,
                    descricao=f"Pedido avulso #{pedido.pk} ({pedido.get_tipo_display()}).",
                )

            pedido.status = PedidoAvulso.CONFIRMADO
            pedido.forma_pagamento = forma_pagamento
            pedido.valor_total = valor_total
            pedido.caixa = caixa
            pedido.cliente = cliente if forma_pagamento == RecebimentoPagamento.FIADO else None
            pedido.confirmado_por = request.user
            pedido.confirmado_em = timezone.now()
            pedido.save()

            descricao_auditoria = (
                f"Pedido avulso #{pedido.pk} ({pedido.tipo}) confirmado: R${valor_total} em {forma_pagamento}."
            )

            if forma_pagamento == RecebimentoPagamento.FIADO:
                clientes_services.lancar_consumo(
                    cliente,
                    valor_total,
                    request.user,
                    descricao=f"Pedido avulso #{pedido.pk} ({pedido.get_tipo_display()}).",
                )
                descricao_auditoria += f" Fiado para {cliente.nome}."

            registrar_auditoria(request.user, "pedido_avulso_confirmado", descricao_auditoria)

        return Response(PedidoAvulsoSerializer(pedido).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        pedido = self.get_object()
        if pedido.status != PedidoAvulso.ABERTO:
            return Response(
                {"detail": "Só é possível cancelar um pedido ainda aberto (carrinho)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            pedido.status = PedidoAvulso.CANCELADO
            pedido.save(update_fields=["status"])
            registrar_auditoria(request.user, "pedido_avulso_cancelado", f"Pedido avulso #{pedido.pk} cancelado.")

        return Response(PedidoAvulsoSerializer(pedido).data)


class ItemPedidoAvulsoViewSet(ModelViewSet):
    """Itens do carrinho de um `PedidoAvulso` — só podem existir enquanto o pedido está `aberto`."""

    queryset = ItemPedidoAvulso.objects.select_related("pedido", "produto")
    serializer_class = ItemPedidoAvulsoSerializer
    permission_classes = [exige_papel(*PAPEIS_CAIXA)]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def perform_create(self, serializer):
        pedido = serializer.validated_data["pedido"]
        produto = serializer.validated_data["produto"]
        if pedido.status != PedidoAvulso.ABERTO:
            raise serializers.ValidationError({"pedido": "Este pedido não está mais aberto."})
        if not produto.ativo:
            raise serializers.ValidationError({"produto": "Este produto está inativo."})
        serializer.save(preco_unitario=produto.preco)

    def perform_destroy(self, instance):
        if instance.pedido.status != PedidoAvulso.ABERTO:
            raise serializers.ValidationError({"detail": "Este pedido não está mais aberto."})
        instance.delete()
