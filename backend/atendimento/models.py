from django.conf import settings
from django.db import models

from caixa.models import ConfiguracaoPreco, Mesa


class Comanda(models.Model):
    """
    Comanda de uma mesa no modelo self-service (RF18, RF23, RF24): o
    cliente se serve sozinho e o atendente registra depois, em um ou mais
    lançamentos (`ItemComandaPrato`), a quantidade de pratos e de unidades
    extras de proteína. O valor é só estimado aqui — o cálculo oficial para
    pagamento é do Ciclo 4, usando sempre a `ConfiguracaoPreco` atual.
    """

    ABERTA = "aberta"
    FECHADA = "fechada"
    STATUS_CHOICES = [(ABERTA, "Aberta"), (FECHADA, "Fechada")]

    mesa = models.ForeignKey(Mesa, on_delete=models.PROTECT, related_name="comandas")
    quantidade_pessoas = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=ABERTA)
    aberta_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="comandas_abertas",
    )
    aberta_em = models.DateTimeField(auto_now_add=True)
    fechada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="comandas_fechadas",
    )
    fechada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-aberta_em"]

    def __str__(self):
        return f"Comanda #{self.pk} - Mesa {self.mesa.numero} ({self.status})"

    def valor_parcial_estimado(self):
        config = ConfiguracaoPreco.atual()
        itens = self.itens_prato.filter(cancelado=False)
        total_pratos = sum((item.quantidade_pratos for item in itens), 0)
        total_extras = sum((item.quantidade_extras_proteina for item in itens), 0)
        return (total_pratos * config.valor_prato) + (total_extras * config.valor_unidade_extra)


class ItemComandaPrato(models.Model):
    """
    Cada lançamento feito pelo atendente numa comanda (RF19): quantidade de
    pratos e de unidades extras de proteína. Pode haver vários lançamentos
    por comanda (o cliente pode repetir). Editar/cancelar (RF21) é feito
    neste registro, sem apagar nada, para manter o log de auditoria.
    """

    comanda = models.ForeignKey(Comanda, on_delete=models.CASCADE, related_name="itens_prato")
    quantidade_pratos = models.PositiveIntegerField()
    quantidade_extras_proteina = models.PositiveIntegerField(default=0)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="itens_prato_registrados",
    )
    registrado_em = models.DateTimeField(auto_now_add=True)
    cancelado = models.BooleanField(default=False)
    cancelado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="itens_prato_cancelados",
    )
    cancelado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["registrado_em"]

    def __str__(self):
        return (
            f"{self.quantidade_pratos} prato(s) + {self.quantidade_extras_proteina} "
            f"extra(s) - comanda #{self.comanda_id}"
        )
