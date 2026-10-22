from django.contrib import admin

from .models import ItemEstoque, MovimentoEstoque, Produto


@admin.register(ItemEstoque)
class ItemEstoqueAdmin(admin.ModelAdmin):
    list_display = ["id", "nome", "unidade_medida", "quantidade_minima", "ativo"]
    list_filter = ["ativo", "unidade_medida"]


@admin.register(MovimentoEstoque)
class MovimentoEstoqueAdmin(admin.ModelAdmin):
    list_display = ["id", "item", "tipo", "quantidade", "usuario", "criado_em"]
    list_filter = ["tipo"]


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ["id", "nome", "categoria", "preco", "item_estoque", "ativo"]
    list_filter = ["categoria", "ativo"]
