from django.contrib import admin

from .models import Caixa, ConfiguracaoPreco, Mesa, MovimentoCaixa

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
