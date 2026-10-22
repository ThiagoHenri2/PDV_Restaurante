from django.contrib import admin

from .models import Comanda, ItemComandaPrato, ItemComandaProduto


class ItemComandaPratoInline(admin.TabularInline):
    model = ItemComandaPrato
    extra = 0
    readonly_fields = ["registrado_por", "registrado_em", "cancelado_por", "cancelado_em"]


class ItemComandaProdutoInline(admin.TabularInline):
    model = ItemComandaProduto
    extra = 0
    readonly_fields = ["preco_unitario", "registrado_por", "registrado_em", "cancelado_por", "cancelado_em"]


@admin.register(Comanda)
class ComandaAdmin(admin.ModelAdmin):
    list_display = ["id", "mesa", "status", "quantidade_pessoas", "aberta_por", "aberta_em", "fechada_em"]
    list_filter = ["status"]
    inlines = [ItemComandaPratoInline, ItemComandaProdutoInline]


@admin.register(ItemComandaPrato)
class ItemComandaPratoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "comanda",
        "quantidade_pratos",
        "quantidade_extras_proteina",
        "cancelado",
        "registrado_em",
    ]
    list_filter = ["cancelado"]


@admin.register(ItemComandaProduto)
class ItemComandaProdutoAdmin(admin.ModelAdmin):
    list_display = ["id", "comanda", "produto", "quantidade", "preco_unitario", "cancelado", "registrado_em"]
    list_filter = ["cancelado"]
