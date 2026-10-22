from django.conf import settings
from django.db import models


class Cliente(models.Model):
    """
    Cliente fiado (RF32): consome ao longo do mês e paga no fechamento
    mensal (RF34). Não há limite de crédito/bloqueio no MVP (decisão
    explícita do usuário).
    """

    nome = models.CharField(max_length=150)
    telefone = models.CharField(max_length=20, blank=True, default="")
    observacoes = models.CharField(max_length=255, blank=True, default="")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    def saldo_devedor(self):
        """
        Não existe um campo de saldo guardado — soma os `LancamentoContaCliente`
        (mesmo padrão já usado em `caixa.Caixa`/`MovimentoCaixa` e
        `estoque.ItemEstoque`/`MovimentoEstoque`), para manter uma única
        fonte de verdade (o ledger) em vez de um contador que pode
        dessincronizar.
        """
        total = self.lancamentos.aggregate(total=models.Sum("valor"))["total"]
        return total or 0


class LancamentoContaCliente(models.Model):
    """
    Lançamento no ledger da conta corrente de um `Cliente` (RF33/RF34).
    `valor` é sempre assinado e soma diretamente para
    `Cliente.saldo_devedor()`: `consumo` é sempre positivo (aumenta o que o
    cliente deve) e `pagamento` é sempre negativo (reduz a dívida).
    """

    CONSUMO = "consumo"
    PAGAMENTO = "pagamento"
    TIPO_CHOICES = [
        (CONSUMO, "Consumo (débito)"),
        (PAGAMENTO, "Pagamento recebido"),
    ]

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="lancamentos")
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    descricao = models.CharField(max_length=255, blank=True, default="")
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.tipo}: R${self.valor} ({self.cliente.nome})"
