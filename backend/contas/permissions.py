from rest_framework.permissions import BasePermission


class TemPapel(BasePermission):
    """
    Permissão base: libera acesso se o usuário tiver pelo menos um dos
    papéis (grupos) listados em ``papeis_permitidos``, ou se for
    superusuário (usado para o primeiro acesso via createsuperuser).

    Não use esta classe diretamente — use ``exige_papel(...)`` abaixo.
    """

    papeis_permitidos: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(name__in=self.papeis_permitidos).exists()


def exige_papel(*papeis: str):
    """
    Fábrica de permissão DRF por papel. Uso:

        permission_classes = [exige_papel("Administrador")]
        permission_classes = [exige_papel("Administrador", "Caixa")]
    """
    return type("TemPapelDinamico", (TemPapel,), {"papeis_permitidos": papeis})
