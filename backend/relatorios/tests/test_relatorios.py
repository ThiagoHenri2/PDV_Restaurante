from datetime import datetime
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework.test import APIClient

from atendimento.models import Comanda
from caixa.models import (
    Caixa,
    MovimentoCaixa,
    Mesa,
    Pagamento,
    PedidoAvulso,
    RecebimentoPagamento,
)
from clientes import services as clientes_services
from clientes.models import Cliente
from estoque import services as estoque_services
from estoque.models import ItemEstoque

INICIO_PERIODO = "2024-06-01"
FIM_PERIODO = "2024-06-30"

DENTRO_DO_PERIODO = timezone.make_aware(datetime(2024, 6, 15, 12, 0, 0))
FORA_DO_PERIODO = timezone.make_aware(datetime(2024, 5, 15, 12, 0, 0))
ULTIMO_INSTANTE_DO_PERIODO = timezone.make_aware(datetime(2024, 6, 30, 23, 50, 0))
PRIMEIRO_INSTANTE_FORA_DO_PERIODO = timezone.make_aware(datetime(2024, 7, 1, 0, 10, 0))

_contador_mesa = iter(range(1000, 10000))


def _nova_mesa():
    return Mesa.objects.create(numero=next(_contador_mesa))


def _criar_pagamento(usuario, caixa, valor_final, formas, registrado_em):
    """
    `formas` é uma lista de tuplas (forma, valor). A soma precisa ser igual
    a `valor_final` no mundo real (validado pela view de pagamento), mas
    aqui criamos direto via ORM para controlar a data, então isso não é
    verificado — quem monta o teste é responsável por somar certo.
    """
    comanda = Comanda.objects.create(
        mesa=_nova_mesa(), quantidade_pessoas=1, aberta_por=usuario, status=Comanda.FECHADA
    )
    pagamento = Pagamento.objects.create(
        comanda=comanda,
        caixa=caixa,
        valor_bruto=valor_final,
        valor_final=valor_final,
        registrado_por=usuario,
    )
    for forma, valor in formas:
        RecebimentoPagamento.objects.create(pagamento=pagamento, forma=forma, valor=valor)
    Pagamento.objects.filter(pk=pagamento.pk).update(registrado_em=registrado_em)
    pagamento.refresh_from_db()
    return pagamento


def _criar_avulso_confirmado(caixa, valor_total, forma_pagamento, confirmado_em):
    pedido = PedidoAvulso.objects.create(
        tipo=PedidoAvulso.BALCAO,
        status=PedidoAvulso.CONFIRMADO,
        forma_pagamento=forma_pagamento,
        valor_total=valor_total,
        caixa=caixa,
    )
    PedidoAvulso.objects.filter(pk=pedido.pk).update(confirmado_em=confirmado_em)
    pedido.refresh_from_db()
    return pedido


@pytest.fixture
def caixa_aberto(usuario_caixa):
    caixa = Caixa.objects.create(valor_abertura=Decimal("100.00"), aberto_por=usuario_caixa)
    Caixa.objects.filter(pk=caixa.pk).update(aberto_em=DENTRO_DO_PERIODO)
    caixa.refresh_from_db()
    return caixa


@pytest.mark.django_db
def test_vendas_soma_pagamento_e_avulso_dentro_do_periodo_e_ignora_fora(api_client, usuario_caixa, caixa_aberto):
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("100.00"), [("dinheiro", Decimal("100.00"))], DENTRO_DO_PERIODO
    )
    _criar_avulso_confirmado(caixa_aberto, Decimal("50.00"), "pix", DENTRO_DO_PERIODO)

    # fora do período: não deve entrar no total
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("999.00"), [("dinheiro", Decimal("999.00"))], FORA_DO_PERIODO
    )
    _criar_avulso_confirmado(caixa_aberto, Decimal("999.00"), "pix", FORA_DO_PERIODO)

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    assert resp.data["faturamento_total"] == Decimal("150.00")
    assert resp.data["quantidade_vendas"] == 2


@pytest.mark.django_db
def test_por_forma_pagamento_soma_pagamento_e_avulso_na_mesma_forma(api_client, usuario_caixa, caixa_aberto):
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("30.00"), [("pix", Decimal("30.00"))], DENTRO_DO_PERIODO
    )
    _criar_avulso_confirmado(caixa_aberto, Decimal("20.00"), "pix", DENTRO_DO_PERIODO)

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    formas = {linha["forma"]: linha["valor"] for linha in resp.data["por_forma_pagamento"]}
    assert formas["pix"] == Decimal("50.00")


@pytest.mark.django_db
def test_ticket_medio_calculado_certo_e_zero_sem_erro_quando_sem_venda(api_client, usuario_caixa, caixa_aberto):
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("100.00"), [("dinheiro", Decimal("100.00"))], DENTRO_DO_PERIODO
    )
    _criar_avulso_confirmado(caixa_aberto, Decimal("50.00"), "pix", DENTRO_DO_PERIODO)

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")
    assert resp.status_code == 200
    assert resp.data["ticket_medio"] == Decimal("75.00")

    resp_vazio = api_client.get("/api/relatorios/vendas/?inicio=2030-01-01&fim=2030-01-31")
    assert resp_vazio.status_code == 200
    assert resp_vazio.data["quantidade_vendas"] == 0
    assert resp_vazio.data["ticket_medio"] == Decimal("0")
    assert resp_vazio.data["faturamento_total"] == Decimal("0")


@pytest.mark.django_db
def test_pagamento_fiado_conta_no_faturamento_e_na_forma_fiado(api_client, usuario_caixa, caixa_aberto):
    cliente = Cliente.objects.create(nome="Fulano Fiado")
    pagamento = _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("40.00"), [("fiado", Decimal("40.00"))], DENTRO_DO_PERIODO
    )
    Pagamento.objects.filter(pk=pagamento.pk).update(cliente=cliente)

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    assert resp.data["faturamento_total"] == Decimal("40.00")
    formas = {linha["forma"]: linha["valor"] for linha in resp.data["por_forma_pagamento"]}
    assert formas["fiado"] == Decimal("40.00")


@pytest.mark.django_db
def test_estoque_baixo_lista_so_itens_ativos_abaixo_do_minimo(api_client, usuario_caixa):
    item_baixo = ItemEstoque.objects.create(nome="Arroz", unidade_medida="kg", quantidade_minima=Decimal("10"))
    estoque_services.lancar_entrada(item_baixo, Decimal("5"), usuario_caixa)

    item_ok = ItemEstoque.objects.create(nome="Feijão", unidade_medida="kg", quantidade_minima=Decimal("10"))
    estoque_services.lancar_entrada(item_ok, Decimal("20"), usuario_caixa)

    item_inativo_baixo = ItemEstoque.objects.create(
        nome="Óleo", unidade_medida="l", quantidade_minima=Decimal("10"), ativo=False
    )
    estoque_services.lancar_entrada(item_inativo_baixo, Decimal("1"), usuario_caixa)

    resp = api_client.get("/api/relatorios/estoque-baixo/")

    assert resp.status_code == 200
    nomes = [item["nome"] for item in resp.data["itens"]]
    assert nomes == ["Arroz"]


@pytest.mark.django_db
def test_relatorio_caixa_soma_sangria_suprimento_e_dinheiro_e_diferenca_none_quando_aberto(
    api_client, usuario_caixa, caixa_aberto
):
    suprimento = MovimentoCaixa.objects.create(
        caixa=caixa_aberto, tipo=MovimentoCaixa.SUPRIMENTO, valor=Decimal("50.00"), usuario=usuario_caixa
    )
    sangria = MovimentoCaixa.objects.create(
        caixa=caixa_aberto, tipo=MovimentoCaixa.SANGRIA, valor=Decimal("20.00"), usuario=usuario_caixa
    )
    MovimentoCaixa.objects.filter(pk__in=[suprimento.pk, sangria.pk]).update(criado_em=DENTRO_DO_PERIODO)
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("30.00"), [("dinheiro", Decimal("30.00"))], DENTRO_DO_PERIODO
    )

    resp = api_client.get(f"/api/relatorios/caixa/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    assert len(resp.data["caixas"]) == 1
    dados = resp.data["caixas"][0]
    assert dados["total_suprimento"] == Decimal("50.00")
    assert dados["total_sangria"] == Decimal("20.00")
    assert dados["total_recebido_dinheiro"] == Decimal("30.00")
    assert dados["diferenca"] is None

    assert resp.data["totais"]["total_suprimento"] == Decimal("50.00")
    assert resp.data["totais"]["total_sangria"] == Decimal("20.00")
    assert resp.data["totais"]["total_recebido_dinheiro"] == Decimal("30.00")


@pytest.mark.django_db
def test_contas_a_receber_lista_so_saldo_positivo_ordenado_do_maior_para_menor(api_client, usuario_caixa):
    cliente_zerado = Cliente.objects.create(nome="Zerado")
    clientes_services.lancar_consumo(cliente_zerado, Decimal("10.00"), usuario_caixa)
    clientes_services.lancar_pagamento(cliente_zerado, Decimal("10.00"), usuario_caixa)

    cliente_pequeno = Cliente.objects.create(nome="Pequeno Devedor")
    clientes_services.lancar_consumo(cliente_pequeno, Decimal("30.00"), usuario_caixa)

    cliente_grande = Cliente.objects.create(nome="Grande Devedor")
    clientes_services.lancar_consumo(cliente_grande, Decimal("100.00"), usuario_caixa)

    resp = api_client.get("/api/relatorios/contas-a-receber/")

    assert resp.status_code == 200
    nomes = [c["nome"] for c in resp.data["clientes"]]
    assert nomes == ["Grande Devedor", "Pequeno Devedor"]
    assert resp.data["total_geral"] == Decimal("130.00")


@pytest.mark.django_db
def test_periodo_invalido_retorna_400(api_client):
    resp_invertido = api_client.get("/api/relatorios/vendas/?inicio=2024-06-30&fim=2024-06-01")
    assert resp_invertido.status_code == 400

    resp_mal_formatado = api_client.get("/api/relatorios/caixa/?inicio=abacate&fim=2024-06-30")
    assert resp_mal_formatado.status_code == 400


@pytest.mark.django_db
def test_split_pagamento_nao_duplica_nem_perde_valor_no_relatorio(api_client, usuario_caixa, caixa_aberto):
    """
    Um único `Pagamento` dividido em duas formas (split) precisa contar como
    UMA venda no total/ticket médio, mas aparecer separado nas duas formas
    em `por_forma_pagamento` — sem duplicar nem perder valor.
    """
    _criar_pagamento(
        usuario_caixa,
        caixa_aberto,
        Decimal("100.00"),
        [("dinheiro", Decimal("60.00")), ("pix", Decimal("40.00"))],
        DENTRO_DO_PERIODO,
    )

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    assert resp.data["faturamento_total"] == Decimal("100.00")
    assert resp.data["quantidade_vendas"] == 1
    formas = {linha["forma"]: linha["valor"] for linha in resp.data["por_forma_pagamento"]}
    assert formas["dinheiro"] == Decimal("60.00")
    assert formas["pix"] == Decimal("40.00")


@pytest.mark.django_db
def test_faturamento_por_dia_soma_pagamento_e_avulso_do_mesmo_dia(api_client, usuario_caixa, caixa_aberto):
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("30.00"), [("dinheiro", Decimal("30.00"))], DENTRO_DO_PERIODO
    )
    _criar_avulso_confirmado(caixa_aberto, Decimal("20.00"), "pix", DENTRO_DO_PERIODO)

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    por_dia = {linha["data"]: linha["valor"] for linha in resp.data["faturamento_por_dia"]}
    assert por_dia[DENTRO_DO_PERIODO.date()] == Decimal("50.00")


@pytest.mark.django_db
def test_borda_de_dia_no_timezone_local_nao_vaza_para_o_dia_seguinte(api_client, usuario_caixa, caixa_aberto):
    """
    Um pagamento feito às 23h50 (horário local) do último dia do período
    precisa contar DENTRO do período, e um feito 20 minutos depois (já no
    dia seguinte, horário local) precisa ficar FORA — mesmo os dois caindo
    perto da virada de dia em UTC. Trava a configuração `USE_TZ=True` +
    `TIME_ZONE="America/Sao_Paulo"` contra regressão.
    """
    _criar_pagamento(
        usuario_caixa,
        caixa_aberto,
        Decimal("10.00"),
        [("dinheiro", Decimal("10.00"))],
        ULTIMO_INSTANTE_DO_PERIODO,
    )
    _criar_pagamento(
        usuario_caixa,
        caixa_aberto,
        Decimal("999.00"),
        [("dinheiro", Decimal("999.00"))],
        PRIMEIRO_INSTANTE_FORA_DO_PERIODO,
    )

    resp = api_client.get(f"/api/relatorios/vendas/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    assert resp.data["faturamento_total"] == Decimal("10.00")
    assert resp.data["quantidade_vendas"] == 1


@pytest.mark.django_db
def test_relatorio_caixa_diferenca_real_quando_caixa_fechado(api_client, usuario_caixa, caixa_aberto):
    _criar_pagamento(
        usuario_caixa, caixa_aberto, Decimal("30.00"), [("dinheiro", Decimal("30.00"))], DENTRO_DO_PERIODO
    )
    Caixa.objects.filter(pk=caixa_aberto.pk).update(
        status=Caixa.FECHADO,
        valor_fechamento_esperado=Decimal("130.00"),
        valor_fechamento_informado=Decimal("125.00"),
        fechado_em=DENTRO_DO_PERIODO,
    )

    resp = api_client.get(f"/api/relatorios/caixa/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    dados = resp.data["caixas"][0]
    assert dados["status"] == "fechado"
    assert dados["diferenca"] == Decimal("-5.00")


@pytest.mark.django_db
def test_relatorio_caixa_sessao_que_atravessa_a_borda_do_periodo(api_client, usuario_caixa):
    """
    Caixa aberto ANTES do período e ainda ativo (sem fechar) precisa
    aparecer no relatório do período — senão vendas de hoje "desaparecem"
    só porque o caixa foi aberto ontem e não foi fechado. Os totais da
    sessão, porém, devem contar só a movimentação dentro do período
    pedido (não tudo da sessão inteira).
    """
    caixa = Caixa.objects.create(valor_abertura=Decimal("100.00"), aberto_por=usuario_caixa)
    Caixa.objects.filter(pk=caixa.pk).update(aberto_em=FORA_DO_PERIODO)
    caixa.refresh_from_db()

    # sangria antes do período: não deve entrar no total do relatório
    MovimentoCaixa.objects.create(caixa=caixa, tipo=MovimentoCaixa.SANGRIA, valor=Decimal("500.00"))
    MovimentoCaixa.objects.filter(caixa=caixa, tipo=MovimentoCaixa.SANGRIA).update(criado_em=FORA_DO_PERIODO)

    # pagamento dentro do período: deve entrar
    _criar_pagamento(
        usuario_caixa, caixa, Decimal("30.00"), [("dinheiro", Decimal("30.00"))], DENTRO_DO_PERIODO
    )

    resp = api_client.get(f"/api/relatorios/caixa/?inicio={INICIO_PERIODO}&fim={FIM_PERIODO}")

    assert resp.status_code == 200
    assert len(resp.data["caixas"]) == 1
    dados = resp.data["caixas"][0]
    assert dados["total_recebido_dinheiro"] == Decimal("30.00")
    assert dados["total_sangria"] == Decimal("0")


@pytest.mark.django_db
def test_cliente_inativo_com_saldo_devedor_aparece_em_contas_a_receber(api_client, usuario_caixa):
    cliente = Cliente.objects.create(nome="Inativo Devedor", ativo=False)
    clientes_services.lancar_consumo(cliente, Decimal("25.00"), usuario_caixa)

    resp = api_client.get("/api/relatorios/contas-a-receber/")

    assert resp.status_code == 200
    nomes = [c["nome"] for c in resp.data["clientes"]]
    assert "Inativo Devedor" in nomes
    assert resp.data["total_geral"] == Decimal("25.00")


@pytest.mark.django_db
def test_relatorios_exigem_autenticacao(db):
    client = APIClient()
    resp = client.get("/api/relatorios/vendas/")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_relatorios_bloqueiam_papel_sem_permissao():
    from contas.models import Usuario

    usuario = Usuario.objects.create_user(username="atendente_teste", password="senha123")
    grupo, _ = Group.objects.get_or_create(name="Atendente")
    usuario.groups.add(grupo)

    client = APIClient()
    client.force_authenticate(user=usuario)

    assert client.get("/api/relatorios/vendas/").status_code == 403
    assert client.get("/api/relatorios/caixa/").status_code == 403
    assert client.get("/api/relatorios/contas-a-receber/").status_code == 403
    # Atendente não é Estoquista nem Caixa/Administrador — também bloqueado aqui.
    assert client.get("/api/relatorios/estoque-baixo/").status_code == 403
