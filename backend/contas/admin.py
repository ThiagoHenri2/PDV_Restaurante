from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import LogAuditoria, Usuario

admin.site.register(Usuario, UserAdmin)


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ["criado_em", "usuario", "acao", "descricao"]
    list_filter = ["acao"]
    ordering = ["-criado_em"]
    readonly_fields = ["usuario", "acao", "descricao", "criado_em"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
