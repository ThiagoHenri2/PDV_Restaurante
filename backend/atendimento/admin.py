from django.contrib import admin

from .models import Comanda, ItemComandaPrato


class ItemComandaPratoInline(admin.TabularInline):
    model = ItemComandaPrato
    extra = 0
    readonly_fields = ["registrado_por", "registrado_em", "cancelado_por", "cancelado_em"]


@admin.register(Comanda)
class ComandaAdmin(admin.ModelAdmin):
    list_display = ["id", "mesa", "status", "quantidade_pessoas", "aberta_por", "aberta_em", "fechada_em"]
    list_filter = ["status"]
    inlines = [ItemComandaPratoInline]


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
