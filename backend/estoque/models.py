from django.conf import settings
from django.db import models


class ItemEstoque(models.Model):
    """
    Item de estoque (RF25/RF26). Pode ser um insumo geral do buffet
    self-service (sem `produto` vinculado — conferência manual, RF29) ou a
    base de um `Produto` de venda direta (bebida/sobremesa/marmitex/
    delivery — RF25), com baixa automática ao vender (RF28).

    Não existe um campo de quantidade armazenado: `quantidade_atual()`
    soma os `MovimentoEstoque` (mesmo padrão já usado em
    `caixa.Caixa`/`MovimentoCaixa` para o saldo do caixa), para manter uma
    única fonte de verdade (o ledger) em vez de um contador que pode
    dessincronizar.
    """

    UNIDADE_CHOICES = [
        ("un", "Unidade"),
        ("kg", "Quilograma"),
        ("g", "Grama"),
        ("l", "Litro"),
        ("ml", "Mililitro"),
    ]

    nome = models.CharField(max_length=100, unique=True)
    unidade_medida = models.CharField(max_length=5, choices=UNIDADE_CHOICES, default="un")
    quantidade_minima = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    def quantidade_atual(self):
        total = self.movimentos.aggregate(total=models.Sum("quantidade"))["total"]
        return total or 0

    def estoque_baixo(self):
        return self.quantidade_atual() < self.quantidade_minima


class MovimentoEstoque(models.Model):
    """
    Lançamento no ledger de um `ItemEstoque` (RF27/RF28/RF29).
    `quantidade` é sempre assinada (positiva = entrada, negativa = saída) e
    soma diretamente para `ItemEstoque.quantidade_atual()`.

    - `entrada`: compra/recebimento (RF27) — sempre positiva, lançada pelo
      Administrador/Caixa/Estoquista.
    - `baixa_automatica`: criada só internamente (por
      `estoque.services`) quando um `Produto` é vendido (mesa, avulso ou
      delivery) — nunca aceita diretamente neste endpoint, para não deixar
      a baixa automática ser forjada manualmente.
    - `ajuste`: conferência manual (RF29, itens de buffet) ou reversão de
      uma baixa automática por cancelamento de item — pode ser positiva ou
      negativa.
    """

    ENTRADA = "entrada"
    BAIXA_AUTOMATICA = "baixa_automatica"
    AJUSTE = "ajuste"
    TIPO_CHOICES = [
        (ENTRADA, "Entrada"),
        (BAIXA_AUTOMATICA, "Baixa automática"),
        (AJUSTE, "Ajuste/conferência"),
    ]

    item = models.ForeignKey(ItemEstoque, on_delete=models.PROTECT, related_name="movimentos")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    quantidade = models.DecimalField(max_digits=10, decimal_places=3)
    descricao = models.CharField(max_length=255, blank=True, default="")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.tipo}: {self.quantidade} ({self.item.nome})"


class Produto(models.Model):
    """
    Produto de venda direta (RF25): bebida, sobremesa, marmitex ou item de
    delivery. Vinculado 1:1 a um `ItemEstoque` — vender 1 unidade do
    produto baixa 1 unidade do item de estoque (`estoque.services`).
    """

    BEBIDA = "bebida"
    SOBREMESA = "sobremesa"
    MARMITEX = "marmitex"
    DELIVERY = "delivery"
    OUTRO = "outro"
    CATEGORIA_CHOICES = [
        (BEBIDA, "Bebida"),
        (SOBREMESA, "Sobremesa"),
        (MARMITEX, "Marmitex"),
        (DELIVERY, "Item de delivery"),
        (OUTRO, "Outro"),
    ]

    nome = models.CharField(max_length=100)
    categoria = models.CharField(max_length=10, choices=CATEGORIA_CHOICES, default=OUTRO)
    preco = models.DecimalField(max_digits=8, decimal_places=2)
    item_estoque = models.OneToOneField(
        ItemEstoque, on_delete=models.PROTECT, related_name="produto"
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} (R${self.preco})"
