from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CaixaViewSet,
    ConfiguracaoPrecoView,
    ItemPedidoAvulsoViewSet,
    MesaViewSet,
    MovimentoCaixaViewSet,
    PagamentoViewSet,
    PedidoAvulsoViewSet,
)

router = DefaultRouter()
router.register("mesas", MesaViewSet, basename="mesa")
router.register("caixas", CaixaViewSet, basename="caixa")
router.register("movimentos-caixa", MovimentoCaixaViewSet, basename="movimento-caixa")
router.register("pagamentos", PagamentoViewSet, basename="pagamento")
router.register("pedidos-avulsos", PedidoAvulsoViewSet, basename="pedido-avulso")
router.register("itens-pedido-avulso", ItemPedidoAvulsoViewSet, basename="item-pedido-avulso")

urlpatterns = router.urls + [
    path("configuracao-preco/", ConfiguracaoPrecoView.as_view(), name="configuracao_preco"),
]
