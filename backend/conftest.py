import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient


@pytest.fixture
def usuario_caixa(db):
    """Usuário com o papel 'Caixa' (grupo seedado em contas/migrations/0003_seed_papeis.py)."""
    from contas.models import Usuario

    usuario = Usuario.objects.create_user(username="caixa_teste", password="senha123")
    grupo, _ = Group.objects.get_or_create(name="Caixa")
    usuario.groups.add(grupo)
    return usuario


@pytest.fixture
def api_client(usuario_caixa):
    client = APIClient()
    client.force_authenticate(user=usuario_caixa)
    return client
