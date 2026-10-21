from django.contrib.auth.models import Group
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .auditoria import registrar_auditoria
from .models import Usuario
from .permissions import exige_papel
from .serializers import PapelSerializer, UsuarioCreateUpdateSerializer, UsuarioSerializer


class EuView(APIView):
    """Retorna os dados do usuário autenticado (usado pelo frontend para saber quem está logado e quais papéis tem)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)


class PapelViewSet(ReadOnlyModelViewSet):
    """Lista os papéis (grupos) existentes — usado para montar o formulário de usuário."""

    queryset = Group.objects.all().order_by("name")
    serializer_class = PapelSerializer
    permission_classes = [exige_papel("Administrador")]


class UsuarioViewSet(ModelViewSet):
    """CRUD de usuários (RF02/RF04), restrito ao papel Administrador."""

    queryset = Usuario.objects.all().order_by("username")
    permission_classes = [exige_papel("Administrador")]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UsuarioCreateUpdateSerializer
        return UsuarioSerializer

    def perform_create(self, serializer):
        usuario = serializer.save()
        registrar_auditoria(
            self.request.user, "usuario_criado", f"Usuário '{usuario.username}' criado."
        )

    def perform_update(self, serializer):
        usuario = serializer.save()
        registrar_auditoria(
            self.request.user, "usuario_editado", f"Usuário '{usuario.username}' editado."
        )

    def perform_destroy(self, instance):
        # Nunca removemos o registro de verdade: outros módulos (caixa,
        # estoque, comandas) vão referenciar o usuário no histórico, então
        # excluir de fato quebraria esse histórico. "Excluir" aqui significa
        # desativar o acesso.
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        registrar_auditoria(
            self.request.user, "usuario_desativado", f"Usuário '{instance.username}' desativado."
        )
