from django.contrib import admin

from .models import Cliente, LancamentoContaCliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["id", "nome", "telefone", "ativo", "criado_em"]
    list_filter = ["ativo"]


@admin.register(LancamentoContaCliente)
class LancamentoContaClienteAdmin(admin.ModelAdmin):
    list_display = ["id", "cliente", "tipo", "valor", "criado_por", "criado_em"]
    list_filter = ["tipo"]
