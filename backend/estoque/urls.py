from rest_framework.routers import DefaultRouter

from .views import ItemEstoqueViewSet, MovimentoEstoqueViewSet, ProdutoViewSet

router = DefaultRouter()
router.register("itens-estoque", ItemEstoqueViewSet, basename="item-estoque")
router.register("movimentos-estoque", MovimentoEstoqueViewSet, basename="movimento-estoque")
router.register("produtos", ProdutoViewSet, basename="produto")

urlpatterns = router.urls
