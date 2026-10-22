from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CaixaViewSet,
    ConfiguracaoPrecoView,
    MesaViewSet,
    MovimentoCaixaViewSet,
    PagamentoViewSet,
)

router = DefaultRouter()
router.register("mesas", MesaViewSet, basename="mesa")
router.register("caixas", CaixaViewSet, basename="caixa")
router.register("movimentos-caixa", MovimentoCaixaViewSet, basename="movimento-caixa")
router.register("pagamentos", PagamentoViewSet, basename="pagamento")

urlpatterns = router.urls + [
    path("configuracao-preco/", ConfiguracaoPrecoView.as_view(), name="configuracao_preco"),
]
