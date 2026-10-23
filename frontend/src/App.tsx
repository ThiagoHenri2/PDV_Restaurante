import { Route, Routes } from "react-router-dom";

import { LayoutPrincipal } from "./components/LayoutPrincipal";
import { RotaProtegida } from "./components/RotaProtegida";
import { AuthProvider } from "./context/AuthContext";
import AdminUsuarios from "./pages/AdminUsuarios";
import Login from "./pages/Login";
import PerfilPage from "./pages/PerfilPage";
import RedirecionarInicio from "./pages/RedirecionarInicio";
import ComandaDetalhePage from "./pages/atendimento/ComandaDetalhePage";
import ComandasPage from "./pages/atendimento/ComandasPage";
import CaixaPage from "./pages/caixa/CaixaPage";
import ConfiguracaoPrecoPage from "./pages/caixa/ConfiguracaoPrecoPage";
import MesasPage from "./pages/caixa/MesasPage";
import PagamentoPage from "./pages/caixa/PagamentoPage";
import ClienteDetalhePage from "./pages/clientes/ClienteDetalhePage";
import ClientesPage from "./pages/clientes/ClientesPage";
import EstoquePage from "./pages/estoque/EstoquePage";
import ContasAReceberPage from "./pages/relatorios/ContasAReceberPage";
import EstoqueBaixoPage from "./pages/relatorios/EstoqueBaixoPage";
import RelatorioCaixaPage from "./pages/relatorios/RelatorioCaixaPage";
import RelatoriosPage from "./pages/relatorios/RelatoriosPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RotaProtegida />}>
          <Route element={<LayoutPrincipal />}>
            <Route path="/" element={<RedirecionarInicio />} />
            <Route path="/perfil" element={<PerfilPage />} />

            <Route element={<RotaProtegida papeis={["Administrador"]} />}>
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            </Route>

            <Route element={<RotaProtegida papeis={["Administrador", "Caixa"]} />}>
              <Route path="/caixa" element={<CaixaPage />} />
              <Route path="/caixa/mesas" element={<MesasPage />} />
              <Route path="/caixa/configuracao-preco" element={<ConfiguracaoPrecoPage />} />
              <Route path="/caixa/comandas/:comandaId/pagamento" element={<PagamentoPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:id" element={<ClienteDetalhePage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/relatorios/caixa" element={<RelatorioCaixaPage />} />
              <Route path="/relatorios/contas-a-receber" element={<ContasAReceberPage />} />
            </Route>

            <Route element={<RotaProtegida papeis={["Administrador", "Caixa", "Atendente"]} />}>
              <Route path="/atendimento" element={<ComandasPage />} />
              <Route path="/atendimento/:id" element={<ComandaDetalhePage />} />
            </Route>

            <Route element={<RotaProtegida papeis={["Administrador", "Caixa", "Estoquista"]} />}>
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/relatorios/estoque-baixo" element={<EstoqueBaixoPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
