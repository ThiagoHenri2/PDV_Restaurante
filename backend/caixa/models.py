from django.conf import settings
from django.db import models


class Mesa(models.Model):
    LIVRE = "livre"
    OCUPADA = "ocupada"
    STATUS_CHOICES = [(LIVRE, "Livre"), (OCUPADA, "Ocupada")]

    numero = models.PositiveIntegerField(unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=LIVRE)

    class Meta:
        ordering = ["numero"]

    def __str__(self):
        return f"Mesa {self.numero} ({self.status})"


class ConfiguracaoPreco(models.Model):
    """
    Linha única com os valores usados para calcular a conta do self-service
    (RF07): valor do prato simples e valor de cada unidade extra de
    proteína. O cálculo em si (Ciclo 4) lê sempre a configuração atual.
    """

    valor_prato = models.DecimalField(max_digits=8, decimal_places=2)
    valor_unidade_extra = models.DecimalField(max_digits=8, decimal_places=2)
    atualizado_em = models.DateTimeField(auto_now=True)
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    @classmethod
    def atual(cls):
        config = cls.objects.order_by("-id").first()
        if config is None:
            config = cls.objects.create(valor_prato=0, valor_unidade_extra=0)
        return config

    def __str__(self):
        return f"Prato: R${self.valor_prato} / Extra: R${self.valor_unidade_extra}"


class Caixa(models.Model):
    ABERTO = "aberto"
    FECHADO = "fechado"
    STATUS_CHOICES = [(ABERTO, "Aberto"), (FECHADO, "Fechado")]

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=ABERTO)
    valor_abertura = models.DecimalField(max_digits=10, decimal_places=2)
    aberto_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="caixas_abertos"
    )
    aberto_em = models.DateTimeField(auto_now_add=True)

    valor_fechamento_informado = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    valor_fechamento_esperado = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    fechado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="caixas_fechados",
    )
    fechado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-aberto_em"]

    def __str__(self):
        return f"Caixa #{self.pk} ({self.status})"

    def calcular_valor_esperado(self):
        total_movimentos = self.movimentos.aggregate_saldo()
        total_recebido_dinheiro = RecebimentoPagamento.objects.filter(
            pagamento__caixa=self, forma=RecebimentoPagamento.DINHEIRO
        ).aggregate(total=models.Sum("valor"))["total"] or 0
        return self.valor_abertura + total_movimentos + total_recebido_dinheiro


class MovimentoCaixaQuerySet(models.QuerySet):
    def aggregate_saldo(self):
        from django.db.models import Case, DecimalField, Sum, Value, When

        resultado = self.aggregate(
            saldo=Sum(
                Case(
                    When(tipo=MovimentoCaixa.SUPRIMENTO, then="valor"),
                    When(tipo=MovimentoCaixa.SANGRIA, then=-models.F("valor")),
                    default=Value(0),
                    output_field=DecimalField(max_digits=10, decimal_places=2),
                )
            )
        )["saldo"]
        return resultado or 0


class MovimentoCaixa(models.Model):
    SANGRIA = "sangria"
    SUPRIMENTO = "suprimento"
    TIPO_CHOICES = [(SANGRIA, "Sangria (retirada)"), (SUPRIMENTO, "Suprimento (entrada)")]

    caixa = models.ForeignKey(Caixa, on_delete=models.CASCADE, related_name="movimentos")
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    descricao = models.CharField(max_length=255, blank=True, default="")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    objects = MovimentoCaixaQuerySet.as_manager()

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.tipo}: R${self.valor}"


class Pagamento(models.Model):
    """
    Finalização de pagamento de uma comanda (RF11-RF13): calcula o valor
    final a partir de ``Comanda.valor_parcial_estimado()``, aplica desconto
    (fixo ou percentual) e registra o recebimento (que pode ser dividido em
    várias formas de pagamento, cobrindo também o split entre pessoas).

    ``comanda`` referencia o app ``atendimento`` por string para não criar
    import circular (atendimento já depende de caixa). RF16 (vincular a
    cliente fiado) fica adiado para o Ciclo 6, mesmo padrão usado para o
    RF20 — o modelo `Cliente` ainda não existe.
    """

    NENHUM = "nenhum"
    FIXO = "fixo"
    PERCENTUAL = "percentual"
    TIPO_DESCONTO_CHOICES = [
        (NENHUM, "Sem desconto"),
        (FIXO, "Valor fixo"),
        (PERCENTUAL, "Percentual"),
    ]

    comanda = models.OneToOneField(
        "atendimento.Comanda", on_delete=models.PROTECT, related_name="pagamento"
    )
    caixa = models.ForeignKey(Caixa, on_delete=models.PROTECT, related_name="pagamentos")
    valor_bruto = models.DecimalField(max_digits=10, decimal_places=2)
    tipo_desconto = models.CharField(max_length=10, choices=TIPO_DESCONTO_CHOICES, default=NENHUM)
    valor_desconto = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    valor_desconto_aplicado = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valor_final = models.DecimalField(max_digits=10, decimal_places=2)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="pagamentos_registrados",
    )
    registrado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-registrado_em"]

    def __str__(self):
        return f"Pagamento comanda #{self.comanda_id} - R${self.valor_final}"


class RecebimentoPagamento(models.Model):
    """
    Uma forma de pagamento recebida dentro de um `Pagamento` (RF13). Um
    pagamento pode ter vários recebimentos — isso cobre tanto o uso de mais
    de uma forma de pagamento quanto o split entre pessoas da mesa.
    """

    DINHEIRO = "dinheiro"
    DEBITO = "debito"
    CREDITO = "credito"
    PIX = "pix"
    FORMA_CHOICES = [
        (DINHEIRO, "Dinheiro"),
        (DEBITO, "Débito"),
        (CREDITO, "Crédito"),
        (PIX, "PIX"),
    ]

    pagamento = models.ForeignKey(Pagamento, on_delete=models.CASCADE, related_name="recebimentos")
    forma = models.CharField(max_length=10, choices=FORMA_CHOICES)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    descricao = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"{self.forma}: R${self.valor}"
