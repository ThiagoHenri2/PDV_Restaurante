"""
Funções únicas para criar lançamentos na conta corrente de um `Cliente`
(RF33/RF34), usadas por este app e pelo app `caixa` (RF16, pagamento/avulso
em fiado) — mesmo princípio de `estoque.services` e
`contas.auditoria.registrar_auditoria`: uma só forma de alterar o ledger em
todo o projeto, sempre dentro da transação atômica de quem chama.
"""

from .models import LancamentoContaCliente


def lancar_consumo(cliente, valor, usuario, descricao=""):
    """RF33: débito por consumo (fiado). `valor` sempre positivo."""
    return LancamentoContaCliente.objects.create(
        cliente=cliente,
        tipo=LancamentoContaCliente.CONSUMO,
        valor=valor,
        descricao=descricao,
        criado_por=usuario,
    )


def lancar_pagamento(cliente, valor, usuario, descricao=""):
    """RF34: pagamento recebido no fechamento (total ou parcial). `valor` recebido é positivo; lançado como negativo."""
    return LancamentoContaCliente.objects.create(
        cliente=cliente,
        tipo=LancamentoContaCliente.PAGAMENTO,
        valor=-valor,
        descricao=descricao,
        criado_por=usuario,
    )
