from django.urls import path

from .views import (
    RelatorioCaixaView,
    RelatorioContasAReceberView,
    RelatorioEstoqueBaixoView,
    RelatorioVendasView,
)

urlpatterns = [
    path("vendas/", RelatorioVendasView.as_view(), name="relatorio-vendas"),
    path("estoque-baixo/", RelatorioEstoqueBaixoView.as_view(), name="relatorio-estoque-baixo"),
    path("caixa/", RelatorioCaixaView.as_view(), name="relatorio-caixa"),
    path(
        "contas-a-receber/",
        RelatorioContasAReceberView.as_view(),
        name="relatorio-contas-a-receber",
    ),
]
