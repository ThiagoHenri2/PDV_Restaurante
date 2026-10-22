from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from caixa.models import Mesa
from contas.auditoria import registrar_auditoria
from contas.permissions import exige_papel
from estoque import services as estoque_services

from .models import Comanda, ItemComandaPrato, ItemComandaProduto
from .serializers import ComandaSerializer, ItemComandaPratoSerializer, ItemComandaProdutoSerializer

PAPEIS_ATENDIMENTO = ("Administrador", "Caixa", "Atendente")


class ComandaViewSet(ModelViewSet):
    """Abrir mesa (RF18), transferir (RF22), consultar e fechar (RF23/RF24)."""

    queryset = Comanda.objects.select_related(
        "mesa", "aberta_por", "fechada_por", "pagamento"
    ).prefetch_related("itens_prato", "itens_produto__produto")
    serializer_class = ComandaSerializer
    permission_classes = [exige_papel(*PAPEIS_ATENDIMENTO)]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        mesa = serializer.validated_data["mesa"]
        if mesa.status == Mesa.OCUPADA:
            raise serializers.ValidationError({"mesa": "Esta mesa já está ocupada."})
        if Comanda.objects.filter(mesa=mesa, status=Comanda.ABERTA).exists():
            raise serializers.ValidationError({"mesa": "Já existe uma comanda aberta para esta mesa."})

        with transaction.atomic():
            comanda = serializer.save(aberta_por=self.request.user)
            mesa.status = Mesa.OCUPADA
            mesa.save(update_fields=["status"])
            registrar_auditoria(
                self.request.user,
                "comanda_aberta",
                f"Comanda #{comanda.pk} aberta na mesa {mesa.numero}.",
            )

    @action(detail=True, methods=["post"])
    def transferir(self, request, pk=None):
        comanda = self.get_object()
        if comanda.status != Comanda.ABERTA:
            return Response(
                {"detail": "Esta comanda já está fechada."}, status=status.HTTP_400_BAD_REQUEST
            )

        nova_mesa_id = request.data.get("mesa_id")
        if not nova_mesa_id:
            raise serializers.ValidationError({"mesa_id": "Obrigatório."})

        try:
            nova_mesa = Mesa.objects.get(pk=nova_mesa_id)
        except Mesa.DoesNotExist:
            raise serializers.ValidationError({"mesa_id": "Mesa não encontrada."})

        if nova_mesa.pk == comanda.mesa_id:
            return Response(
                {"detail": "A comanda já está nesta mesa."}, status=status.HTTP_400_BAD_REQUEST
            )
        if nova_mesa.status == Mesa.OCUPADA:
            return Response(
                {"detail": "A mesa de destino já está ocupada."}, status=status.HTTP_400_BAD_REQUEST
            )

        mesa_antiga = comanda.mesa

        with transaction.atomic():
            comanda.mesa = nova_mesa
            comanda.save(update_fields=["mesa"])
            nova_mesa.status = Mesa.OCUPADA
            nova_mesa.save(update_fields=["status"])
            mesa_antiga.status = Mesa.LIVRE
            mesa_antiga.save(update_fields=["status"])
            registrar_auditoria(
                request.user,
                "comanda_transferida",
                f"Comanda #{comanda.pk} transferida da mesa {mesa_antiga.numero} "
                f"para a mesa {nova_mesa.numero}.",
            )

        return Response(ComandaSerializer(comanda).data)

    @action(detail=True, methods=["post"])
    def fechar(self, request, pk=None):
        comanda = self.get_object()
        if comanda.status == Comanda.FECHADA:
            return Response(
                {"detail": "Esta comanda já está fechada."}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            comanda.status = Comanda.FECHADA
            comanda.fechada_por = request.user
            comanda.fechada_em = timezone.now()
            comanda.save()
            comanda.mesa.status = Mesa.LIVRE
            comanda.mesa.save(update_fields=["status"])
            registrar_auditoria(
                request.user,
                "comanda_fechada",
                f"Comanda #{comanda.pk} (mesa {comanda.mesa.numero}) fechada. "
                f"Valor parcial estimado: R${comanda.valor_parcial_estimado()}.",
            )

        return Response(ComandaSerializer(comanda).data)


class ItemComandaPratoViewSet(ModelViewSet):
    """Lançar (RF19) e editar/cancelar (RF21) pratos + extras de proteína."""

    queryset = ItemComandaPrato.objects.select_related("comanda", "registrado_por", "cancelado_por")
    serializer_class = ItemComandaPratoSerializer
    permission_classes = [exige_papel(*PAPEIS_ATENDIMENTO)]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        comanda = serializer.validated_data["comanda"]
        if comanda.status != Comanda.ABERTA:
            raise serializers.ValidationError({"comanda": "Esta comanda já está fechada."})

        with transaction.atomic():
            item = serializer.save(registrado_por=self.request.user)
            registrar_auditoria(
                self.request.user,
                "comanda_item_adicionado",
                f"Comanda #{comanda.pk}: +{item.quantidade_pratos} prato(s), "
                f"+{item.quantidade_extras_proteina} extra(s).",
            )

    def perform_update(self, serializer):
        item = self.get_object()
        if item.cancelado:
            raise serializers.ValidationError({"detail": "Este item já foi cancelado."})
        if item.comanda.status != Comanda.ABERTA:
            raise serializers.ValidationError({"detail": "A comanda deste item já está fechada."})

        with transaction.atomic():
            item_atualizado = serializer.save()
            registrar_auditoria(
                self.request.user,
                "comanda_item_editado",
                f"Item #{item_atualizado.pk} da comanda #{item_atualizado.comanda_id} editado: "
                f"{item_atualizado.quantidade_pratos} prato(s), "
                f"{item_atualizado.quantidade_extras_proteina} extra(s).",
            )

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        item = self.get_object()
        if item.cancelado:
            return Response({"detail": "Este item já foi cancelado."}, status=status.HTTP_400_BAD_REQUEST)
        if item.comanda.status != Comanda.ABERTA:
            return Response(
                {"detail": "A comanda deste item já está fechada."}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            item.cancelado = True
            item.cancelado_por = request.user
            item.cancelado_em = timezone.now()
            item.save()
            registrar_auditoria(
                request.user,
                "comanda_item_cancelado",
                f"Item #{item.pk} da comanda #{item.comanda_id} cancelado "
                f"({item.quantidade_pratos} prato(s), {item.quantidade_extras_proteina} extra(s)).",
            )

        return Response(ItemComandaPratoSerializer(item).data)


class ItemComandaProdutoViewSet(ModelViewSet):
    """
    Lançar (RF20) e cancelar bebidas/sobremesas numa comanda. Não há PATCH
    de quantidade — só lançar um novo item ou cancelar um existente —
    porque cada lançamento já baixa o estoque na hora (RF28) e cancelar
    precisa reverter exatamente a mesma quantidade que foi baixada.
    """

    queryset = ItemComandaProduto.objects.select_related(
        "comanda", "produto", "registrado_por", "cancelado_por"
    )
    serializer_class = ItemComandaProdutoSerializer
    permission_classes = [exige_papel(*PAPEIS_ATENDIMENTO)]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        comanda = serializer.validated_data["comanda"]
        produto = serializer.validated_data["produto"]
        quantidade = serializer.validated_data["quantidade"]

        if comanda.status != Comanda.ABERTA:
            raise serializers.ValidationError({"comanda": "Esta comanda já está fechada."})
        if not produto.ativo:
            raise serializers.ValidationError({"produto": "Este produto está inativo."})

        with transaction.atomic():
            item = serializer.save(registrado_por=self.request.user, preco_unitario=produto.preco)
            estoque_services.baixar_estoque(
                produto,
                quantidade,
                self.request.user,
                descricao=f"Venda - comanda #{comanda.pk} (mesa {comanda.mesa.numero}).",
            )
            registrar_auditoria(
                self.request.user,
                "comanda_item_produto_adicionado",
                f"Comanda #{comanda.pk}: +{quantidade}x {produto.nome} (R${item.preco_unitario} cada).",
            )

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        item = self.get_object()
        if item.cancelado:
            return Response({"detail": "Este item já foi cancelado."}, status=status.HTTP_400_BAD_REQUEST)
        if item.comanda.status != Comanda.ABERTA:
            return Response(
                {"detail": "A comanda deste item já está fechada."}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            item.cancelado = True
            item.cancelado_por = request.user
            item.cancelado_em = timezone.now()
            item.save()
            estoque_services.reverter_baixa_estoque(
                item.produto,
                item.quantidade,
                request.user,
                descricao=f"Cancelamento item #{item.pk} - comanda #{item.comanda_id}.",
            )
            registrar_auditoria(
                request.user,
                "comanda_item_produto_cancelado",
                f"Item #{item.pk} da comanda #{item.comanda_id} cancelado "
                f"({item.quantidade}x {item.produto.nome}).",
            )

        return Response(ItemComandaProdutoSerializer(item).data)
