from django.contrib import admin

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

admin.site.register(Mesa)
admin.site.register(ConfiguracaoPreco)


@admin.register(Caixa)
class CaixaAdmin(admin.ModelAdmin):
    list_display = ["id", "status", "valor_abertura", "aberto_por", "aberto_em", "fechado_em"]
    list_filter = ["status"]


@admin.register(MovimentoCaixa)
class MovimentoCaixaAdmin(admin.ModelAdmin):
    list_display = ["id", "caixa", "tipo", "valor", "usuario", "criado_em"]
    list_filter = ["tipo"]


class RecebimentoPagamentoInline(admin.TabularInline):
    model = RecebimentoPagamento
    extra = 0


@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    list_display = ["id", "comanda", "caixa", "valor_bruto", "valor_final", "registrado_por", "registrado_em"]
    list_filter = ["tipo_desconto"]
    inlines = [RecebimentoPagamentoInline]


class ItemPedidoAvulsoInline(admin.TabularInline):
    model = ItemPedidoAvulso
    extra = 0
    readonly_fields = ["preco_unitario"]


@admin.register(PedidoAvulso)
class PedidoAvulsoAdmin(admin.ModelAdmin):
    list_display = ["id", "tipo", "status", "valor_total", "forma_pagamento", "criado_por", "criado_em"]
    list_filter = ["tipo", "status"]
    inlines = [ItemPedidoAvulsoInline]
