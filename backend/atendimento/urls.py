from rest_framework.routers import DefaultRouter

from .views import ComandaViewSet, ItemComandaPratoViewSet

router = DefaultRouter()
router.register("comandas", ComandaViewSet, basename="comanda")
router.register("itens-comanda-prato", ItemComandaPratoViewSet, basename="item-comanda-prato")

urlpatterns = router.urls
