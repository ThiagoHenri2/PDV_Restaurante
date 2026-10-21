from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Usuário do sistema. Fica como um app próprio (em vez de usar o
    ``auth.User`` padrão do Django) porque, a partir do Ciclo 1, vamos
    adicionar os papéis (Administrador, Caixa, Atendente, Estoquista) e
    trocar o AUTH_USER_MODEL depois é muito mais trabalhoso do que já
    começar com um modelo próprio.

    Os "papéis" (Administrador, Caixa, Atendente, Estoquista) são
    implementados com o modelo de Grupo (``django.contrib.auth.models.Group``)
    que o Django já traz pronto — não criamos um modelo "Papel" próprio.
    """


class LogAuditoria(models.Model):
    """
    Registro de ações sensíveis do sistema (RF05), usado por todos os
    módulos (não só este app): criação/edição de usuário, abertura/
    fechamento de caixa, desconto concedido, baixa de fiado, etc.
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="logs_auditoria",
    )
    acao = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de auditoria"
        verbose_name_plural = "Logs de auditoria"
        ordering = ["-criado_em"]

    def __str__(self):
        quem = self.usuario.username if self.usuario else "sistema"
        return f"[{self.criado_em:%d/%m/%Y %H:%M}] {quem}: {self.acao}"
