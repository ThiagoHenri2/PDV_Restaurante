from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from contas.auditoria import registrar_auditoria
from contas.permissions import exige_papel

from .models import Caixa, ConfiguracaoPreco, Mesa, MovimentoCaixa
from .serializers import (
    CaixaSerializer,
    ConfiguracaoPrecoSerializer,
    MesaSerializer,
    MovimentoCaixaSerializer,
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
