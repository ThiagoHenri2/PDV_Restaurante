from decimal import Decimal

import pytest

from atendimento.models import Comanda, ItemComandaPrato
from caixa.models import Caixa, ConfiguracaoPreco, Mesa, Pagamento, PedidoAvulso
from caixa.models import ItemPedidoAvulso
from clientes.models import Cliente, LancamentoContaCliente
from estoque import services as estoque_services
from estoque.models import ItemEstoque, Produto


@pytest.fixture
def caixa_aberto(usuario_caixa):
    return Caixa.objects.create(valor_abertura=Decimal("100.00"), aberto_por=usuario_caixa)


@pytest.fixture
def comanda_fechada(usuario_caixa):
    ConfiguracaoPreco.objects.create(valor_prato=Decimal("25.00"), valor_unidade_extra=Decimal("8.00"))
    mesa = Mesa.objects.create(numero=1)
    comanda = Comanda.objects.create(mesa=mesa, quantidade_pessoas=2, aberta_por=usuario_caixa)
    ItemComandaPrato.objects.create(
        comanda=comanda, quantidade_pratos=2, quantidade_extras_proteina=0, registrado_por=usuario_caixa
    )
    comanda.status = Comanda.FECHADA
    comanda.save()
    return comanda


@pytest.fixture
def produto_com_estoque(usuario_caixa):
    item = ItemEstoque.objects.create(nome="Refrigerante", unidade_medida="un", quantidade_minima=0)
    estoque_services.lancar_entrada(item, 10, usuario_caixa)
    return Produto.objects.create(
        nome="Refrigerante", categoria=Produto.BEBIDA, preco=Decimal("6.00"), item_estoque=item
    )


@pytest.mark.django_db
def test_pagamento_fiado_sem_cliente_retorna_erro(api_client, caixa_aberto, comanda_fechada):
    resp = api_client.post(
        "/api/pagamentos/",
        {"comanda": comanda_fechada.pk, "recebimentos": [{"forma": "fiado", "valor": "50.00"}]},
        format="json",
    )

    assert resp.status_code == 400
    assert "cliente" in resp.data


@pytest.mark.django_db
def test_pagamento_fiado_com_cliente_gera_consumo_e_nao_entra_no_caixa(api_client, caixa_aberto, comanda_fechada):
    cliente = Cliente.objects.create(nome="Fulano")

    resp = api_client.post(
        "/api/pagamentos/",
        {
            "comanda": comanda_fechada.pk,
            "cliente": cliente.pk,
            "recebimentos": [{"forma": "fiado", "valor": "50.00"}],
        },
        format="json",
    )

    assert resp.status_code == 201
    pagamento = Pagamento.objects.get(pk=resp.data["id"])
    assert pagamento.cliente_id == cliente.pk

    lancamento = LancamentoContaCliente.objects.get(cliente=cliente)
    assert lancamento.tipo == LancamentoContaCliente.CONSUMO
    assert lancamento.valor == Decimal("50.00")
    assert cliente.saldo_devedor() == Decimal("50.00")

    caixa_aberto.refresh_from_db()
    assert caixa_aberto.calcular_valor_esperado() == Decimal("100.00")


@pytest.mark.django_db
def test_pagamento_cliente_invalido_retorna_400_nao_500(api_client, caixa_aberto, comanda_fechada):
    resp = api_client.post(
        "/api/pagamentos/",
        {
            "comanda": comanda_fechada.pk,
            "cliente": "abc",
            "recebimentos": [{"forma": "dinheiro", "valor": "50.00"}],
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "cliente" in resp.data


@pytest.mark.django_db
def test_pedido_avulso_fiado_sem_cliente_retorna_erro(api_client, caixa_aberto, produto_com_estoque):
    pedido = PedidoAvulso.objects.create(tipo=PedidoAvulso.BALCAO)
    ItemPedidoAvulso.objects.create(
        pedido=pedido, produto=produto_com_estoque, quantidade=2, preco_unitario=produto_com_estoque.preco
    )

    resp = api_client.post(f"/api/pedidos-avulsos/{pedido.pk}/confirmar/", {"forma_pagamento": "fiado"}, format="json")

    assert resp.status_code == 400
    assert "cliente" in resp.data


@pytest.mark.django_db
def test_pedido_avulso_fiado_com_cliente_gera_consumo_e_nao_entra_no_caixa(api_client, caixa_aberto, produto_com_estoque):
    cliente = Cliente.objects.create(nome="Beltrano")
    pedido = PedidoAvulso.objects.create(tipo=PedidoAvulso.BALCAO)
    ItemPedidoAvulso.objects.create(
        pedido=pedido, produto=produto_com_estoque, quantidade=2, preco_unitario=produto_com_estoque.preco
    )

    resp = api_client.post(
        f"/api/pedidos-avulsos/{pedido.pk}/confirmar/",
        {"forma_pagamento": "fiado", "cliente": cliente.pk},
        format="json",
    )

    assert resp.status_code == 200
    pedido.refresh_from_db()
    assert pedido.cliente_id == cliente.pk
    assert pedido.status == PedidoAvulso.CONFIRMADO

    lancamento = LancamentoContaCliente.objects.get(cliente=cliente)
    assert lancamento.tipo == LancamentoContaCliente.CONSUMO
    assert lancamento.valor == Decimal("12.00")

    caixa_aberto.refresh_from_db()
    assert caixa_aberto.calcular_valor_esperado() == Decimal("100.00")


@pytest.mark.django_db
def test_pedido_avulso_pago_em_dinheiro_nao_grava_cliente_mesmo_se_informado(
    api_client, caixa_aberto, produto_com_estoque
):
    """
    Regressão: `cliente` só pode ficar gravado no pedido quando a forma de
    pagamento realmente é "fiado" — do contrário um pedido pago em dinheiro
    ficaria aparentando estar vinculado a um cliente fiado (sem nenhum
    lançamento de consumo correspondente).
    """
    cliente = Cliente.objects.create(nome="Ciclano")
    pedido = PedidoAvulso.objects.create(tipo=PedidoAvulso.BALCAO)
    ItemPedidoAvulso.objects.create(
        pedido=pedido, produto=produto_com_estoque, quantidade=1, preco_unitario=produto_com_estoque.preco
    )

    resp = api_client.post(
        f"/api/pedidos-avulsos/{pedido.pk}/confirmar/",
        {"forma_pagamento": "dinheiro", "cliente": cliente.pk},
        format="json",
    )

    assert resp.status_code == 200
    pedido.refresh_from_db()
    assert pedido.cliente_id is None
    assert not LancamentoContaCliente.objects.filter(cliente=cliente).exists()
