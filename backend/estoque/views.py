from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from contas.auditoria import registrar_auditoria
from contas.permissions import exige_papel

from . import services
from .models import ItemEstoque, MovimentoEstoque, Produto
from .serializers import ItemEstoqueSerializer, MovimentoEstoqueSerializer, ProdutoSerializer

PAPEIS_ESTOQUE = ("Administrador", "Caixa", "Estoquista")
PAPEIS_LEITURA_PRODUTO = ("Administrador", "Caixa", "Atendente", "Estoquista")


class ItemEstoqueViewSet(ModelViewSet):
    """
    Itens de estoque gerais do buffet (RF26) + a base de cada `Produto`
    (RF25). Entradas (RF27) e ajustes de conferência (RF29) são feitos via
    `MovimentoEstoqueViewSet`, não aqui.
    """

    queryset = ItemEstoque.objects.select_related("produto")
    serializer_class = ItemEstoqueSerializer
    permission_classes = [exige_papel(*PAPEIS_ESTOQUE)]
    http_method_names = ["get", "post", "patch", "head", "options"]

    @action(detail=False, methods=["get"])
    def baixo_estoque(self, request):
        """RF30: itens abaixo do mínimo configurado."""
        itens = [item for item in self.get_queryset() if item.estoque_baixo()]
        return Response(ItemEstoqueSerializer(itens, many=True).data)

    def perform_create(self, serializer):
        item = serializer.save()
        registrar_auditoria(
            self.request.user, "item_estoque_criado", f"Item de estoque '{item.nome}' cadastrado."
        )

    def perform_update(self, serializer):
        item = serializer.save()
        registrar_auditoria(
            self.request.user, "item_estoque_editado", f"Item de estoque '{item.nome}' editado."
        )


class MovimentoEstoqueViewSet(ModelViewSet):
    """
    Lançamento de entradas (RF27) e ajustes de conferência manual (RF29).
    `baixa_automatica` nunca é aceita aqui — só é criada internamente por
    `estoque.services` quando um produto é vendido (RF28).
    """

    queryset = MovimentoEstoque.objects.select_related("item", "usuario")
    serializer_class = MovimentoEstoqueSerializer
    permission_classes = [exige_papel(*PAPEIS_ESTOQUE)]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        item_id = request.data.get("item")
        tipo = request.data.get("tipo")
        quantidade = request.data.get("quantidade")
        descricao = request.data.get("descricao", "")

        if tipo not in (MovimentoEstoque.ENTRADA, MovimentoEstoque.AJUSTE):
            raise serializers.ValidationError(
                {"tipo": "Só é possível lançar 'entrada' ou 'ajuste' manualmente."}
            )
        try:
            item = ItemEstoque.objects.get(pk=item_id)
        except (ItemEstoque.DoesNotExist, TypeError, ValueError):
            raise serializers.ValidationError({"item": "Item de estoque não encontrado."})

        try:
            quantidade = float(quantidade)
        except (TypeError, ValueError):
            raise serializers.ValidationError({"quantidade": "Valor inválido."})
        if quantidade == 0:
            raise serializers.ValidationError({"quantidade": "A quantidade não pode ser zero."})
        if tipo == MovimentoEstoque.ENTRADA and quantidade < 0:
            raise serializers.ValidationError({"quantidade": "Uma entrada precisa ser positiva."})

        with transaction.atomic():
            if tipo == MovimentoEstoque.ENTRADA:
                movimento = services.lancar_entrada(item, quantidade, request.user, descricao)
            else:
                movimento = services.lancar_ajuste(item, quantidade, request.user, descricao)

            registrar_auditoria(
                request.user,
                f"estoque_{tipo}",
                f"{movimento.get_tipo_display()} de {quantidade} em '{item.nome}'"
                + (f" ({descricao})" if descricao else "") + ".",
            )

        return Response(MovimentoEstoqueSerializer(movimento).data, status=201)


class ProdutoViewSet(ModelViewSet):
    """
    Produtos de venda direta (RF25) — bebida, sobremesa, marmitex ou item
    de delivery. Cadastrar um produto cria também o `ItemEstoque` que o
    sustenta, numa única chamada (o usuário não precisa passar por duas
    telas para cadastrar algo tão simples quanto uma lata de refrigerante).
    """

    queryset = Produto.objects.select_related("item_estoque")
    serializer_class = ProdutoSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [exige_papel(*PAPEIS_LEITURA_PRODUTO)()]
        return [exige_papel(*PAPEIS_ESTOQUE)()]

    def create(self, request, *args, **kwargs):
        nome = request.data.get("nome")
        categoria = request.data.get("categoria", Produto.OUTRO)
        preco = request.data.get("preco")
        unidade_medida = request.data.get("unidade_medida", "un")
        quantidade_minima = request.data.get("quantidade_minima", 0)

        if not nome:
            raise serializers.ValidationError({"nome": "Obrigatório."})
        if preco is None:
            raise serializers.ValidationError({"preco": "Obrigatório."})

        with transaction.atomic():
            item_estoque = ItemEstoque.objects.create(
                nome=nome, unidade_medida=unidade_medida, quantidade_minima=quantidade_minima
            )
            produto = Produto.objects.create(
                nome=nome, categoria=categoria, preco=preco, item_estoque=item_estoque
            )
            registrar_auditoria(
                request.user, "produto_criado", f"Produto '{produto.nome}' cadastrado (R${preco})."
            )

        return Response(ProdutoSerializer(produto).data, status=201)

    def perform_update(self, serializer):
        produto = serializer.save()
        registrar_auditoria(self.request.user, "produto_editado", f"Produto '{produto.nome}' editado.")
