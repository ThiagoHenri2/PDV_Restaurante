"""
Funções únicas para criar movimentos de estoque (RF27-RF29), usadas pelos
apps `estoque`, `atendimento` (RF20) e `caixa` (RF14/RF15) — mesmo
princípio do `contas.auditoria.registrar_auditoria`: uma só forma de
alterar o ledger de estoque em todo o projeto, sempre dentro da transação
atômica de quem chama.
"""

from .models import MovimentoEstoque


def lancar_entrada(item, quantidade, usuario, descricao=""):
    """RF27: entrada de estoque (compra/recebimento). Sempre positiva."""
    return MovimentoEstoque.objects.create(
        item=item,
        tipo=MovimentoEstoque.ENTRADA,
        quantidade=quantidade,
        descricao=descricao,
        usuario=usuario,
    )


def lancar_ajuste(item, quantidade_delta, usuario, descricao=""):
    """RF29: conferência/ajuste manual. Pode ser positivo ou negativo."""
    return MovimentoEstoque.objects.create(
        item=item,
        tipo=MovimentoEstoque.AJUSTE,
        quantidade=quantidade_delta,
        descricao=descricao,
        usuario=usuario,
    )


def baixar_estoque(produto, quantidade, usuario, descricao=""):
    """RF28: baixa automática ao vender um `Produto` (mesa, avulso ou delivery)."""
    return MovimentoEstoque.objects.create(
        item=produto.item_estoque,
        tipo=MovimentoEstoque.BAIXA_AUTOMATICA,
        quantidade=-quantidade,
        descricao=descricao,
        usuario=usuario,
    )


def reverter_baixa_estoque(produto, quantidade, usuario, descricao=""):
    """
    Reversão de uma baixa automática (ex: cancelamento de um item de
    comanda antes do fechamento). Lançada como `ajuste` (não como uma
    segunda `baixa_automatica` negativa) para deixar claro no histórico que
    foi uma correção, não uma nova venda.
    """
    return MovimentoEstoque.objects.create(
        item=produto.item_estoque,
        tipo=MovimentoEstoque.AJUSTE,
        quantidade=quantidade,
        descricao=descricao,
        usuario=usuario,
    )
