from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from contas.views import EuView


def health(request):
    """Endpoint simples para confirmar que a API está no ar (usado no Ciclo 0)."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", EuView.as_view(), name="auth_me"),
    path("api/", include("contas.urls")),
    path("api/", include("caixa.urls")),
    path("api/", include("atendimento.urls")),
    path("api/", include("estoque.urls")),
]
