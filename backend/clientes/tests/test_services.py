from decimal import Decimal

import pytest

from clientes import services
from clientes.models import Cliente
from contas.models import LogAuditoria


@pytest.mark.django_db
def test_saldo_devedor_soma_consumo_e_pagamento(usuario_caixa):
    cliente = Cliente.objects.create(nome="Maria")
    services.lancar_consumo(cliente, Decimal("30.00"), usuario_caixa)
    services.lancar_consumo(cliente, Decimal("20.00"), usuario_caixa)
    services.lancar_pagamento(cliente, Decimal("15.00"), usuario_caixa)

    assert cliente.saldo_devedor() == Decimal("35.00")


@pytest.mark.django_db
def test_saldo_devedor_sem_lancamentos_eh_zero():
    cliente = Cliente.objects.create(nome="Sem consumo")

    assert cliente.saldo_devedor() == 0


@pytest.mark.django_db
def test_fechar_mes_sem_valor_zera_saldo_positivo(api_client, usuario_caixa):
    cliente = Cliente.objects.create(nome="João")
    services.lancar_consumo(cliente, Decimal("100.00"), usuario_caixa)

    resp = api_client.post(f"/api/clientes/{cliente.pk}/fechar_mes/", {}, format="json")

    assert resp.status_code == 200
    cliente.refresh_from_db()
    assert cliente.saldo_devedor() == 0
    assert LogAuditoria.objects.filter(acao="cliente_fechamento_mensal").exists()


@pytest.mark.django_db
def test_fechar_mes_valor_parcial_reduz_saldo_sem_zerar(api_client, usuario_caixa):
    cliente = Cliente.objects.create(nome="Ana")
    services.lancar_consumo(cliente, Decimal("100.00"), usuario_caixa)

    resp = api_client.post(f"/api/clientes/{cliente.pk}/fechar_mes/", {"valor": "40.00"}, format="json")

    assert resp.status_code == 200
    cliente.refresh_from_db()
    assert cliente.saldo_devedor() == Decimal("60.00")


@pytest.mark.django_db
def test_fechar_mes_valor_zero_ou_negativo_eh_rejeitado(api_client, usuario_caixa):
    cliente = Cliente.objects.create(nome="Carlos")
    services.lancar_consumo(cliente, Decimal("50.00"), usuario_caixa)

    resp = api_client.post(f"/api/clientes/{cliente.pk}/fechar_mes/", {"valor": "0"}, format="json")

    assert resp.status_code == 400
    cliente.refresh_from_db()
    assert cliente.saldo_devedor() == Decimal("50.00")


@pytest.mark.django_db
def test_fechar_mes_sem_saldo_devedor_eh_rejeitado(api_client, usuario_caixa):
    cliente = Cliente.objects.create(nome="Sem dívida")

    resp = api_client.post(f"/api/clientes/{cliente.pk}/fechar_mes/", {}, format="json")

    assert resp.status_code == 400


@pytest.mark.django_db
def test_fechar_mes_valor_maior_que_saldo_eh_rejeitado(api_client, usuario_caixa):
    cliente = Cliente.objects.create(nome="Pedro")
    services.lancar_consumo(cliente, Decimal("50.00"), usuario_caixa)

    resp = api_client.post(f"/api/clientes/{cliente.pk}/fechar_mes/", {"valor": "80.00"}, format="json")

    assert resp.status_code == 400
    cliente.refresh_from_db()
    assert cliente.saldo_devedor() == Decimal("50.00")
