from rest_framework.routers import DefaultRouter

from .views import ComandaViewSet, ItemComandaPratoViewSet, ItemComandaProdutoViewSet

router = DefaultRouter()
router.register("comandas", ComandaViewSet, basename="comanda")
router.register("itens-comanda-prato", ItemComandaPratoViewSet, basename="item-comanda-prato")
router.register("itens-comanda-produto", ItemComandaProdutoViewSet, basename="item-comanda-produto")

urlpatterns = router.urls
