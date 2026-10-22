from rest_framework import serializers

from .models import ItemEstoque, MovimentoEstoque, Produto


class ItemEstoqueSerializer(serializers.ModelSerializer):
    quantidade_atual = serializers.SerializerMethodField()
    estoque_baixo = serializers.SerializerMethodField()
    produto_id = serializers.SerializerMethodField()
    produto_nome = serializers.SerializerMethodField()

    class Meta:
        model = ItemEstoque
        fields = [
            "id",
            "nome",
            "unidade_medida",
            "quantidade_minima",
            "ativo",
            "quantidade_atual",
            "estoque_baixo",
            "produto_id",
            "produto_nome",
        ]

    def get_quantidade_atual(self, obj):
        return obj.quantidade_atual()

    def get_estoque_baixo(self, obj):
        return obj.estoque_baixo()

    def get_produto_id(self, obj):
        produto = getattr(obj, "produto", None)
        return produto.id if produto else None

    def get_produto_nome(self, obj):
        produto = getattr(obj, "produto", None)
        return produto.nome if produto else None


class MovimentoEstoqueSerializer(serializers.ModelSerializer):
    item_nome = serializers.CharField(source="item.nome", read_only=True)
    usuario_username = serializers.CharField(source="usuario.username", read_only=True, default=None)

    class Meta:
        model = MovimentoEstoque
        fields = ["id", "item", "item_nome", "tipo", "quantidade", "descricao", "usuario_username", "criado_em"]
        read_only_fields = ["tipo", "usuario_username", "criado_em"]


class ProdutoSerializer(serializers.ModelSerializer):
    quantidade_atual = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "categoria",
            "preco",
            "item_estoque",
            "ativo",
            "quantidade_atual",
        ]
        read_only_fields = ["item_estoque"]

    def get_quantidade_atual(self, obj):
        return obj.item_estoque.quantidade_atual()
