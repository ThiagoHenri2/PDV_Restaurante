from rest_framework.routers import DefaultRouter

from .views import PapelViewSet, UsuarioViewSet

router = DefaultRouter()
router.register("usuarios", UsuarioViewSet, basename="usuario")
router.register("papeis", PapelViewSet, basename="papel")

urlpatterns = router.urls
