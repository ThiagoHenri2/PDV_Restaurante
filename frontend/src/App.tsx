import { Route, Routes } from "react-router-dom";

import { RotaProtegida } from "./components/RotaProtegida";
import { AuthProvider } from "./context/AuthContext";
import AdminUsuarios from "./pages/AdminUsuarios";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ComandaDetalhePage from "./pages/atendimento/ComandaDetalhePage";
import ComandasPage from "./pages/atendimento/ComandasPage";
import CaixaPage from "./pages/caixa/CaixaPage";
import ConfiguracaoPrecoPage from "./pages/caixa/ConfiguracaoPrecoPage";
import MesasPage from "./pages/caixa/MesasPage";
import PagamentoPage from "./pages/caixa/PagamentoPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RotaProtegida />}>
          <Route path="/" element={<Home />} />
        </Route>

        <Route element={<RotaProtegida papeis={["Administrador"]} />}>
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
        </Route>

        <Route element={<RotaProtegida papeis={["Administrador", "Caixa"]} />}>
          <Route path="/caixa" element={<CaixaPage />} />
          <Route path="/caixa/mesas" element={<MesasPage />} />
          <Route path="/caixa/configuracao-preco" element={<ConfiguracaoPrecoPage />} />
          <Route path="/caixa/comandas/:comandaId/pagamento" element={<PagamentoPage />} />
        </Route>

        <Route element={<RotaProtegida papeis={["Administrador", "Caixa", "Atendente"]} />}>
          <Route path="/atendimento" element={<ComandasPage />} />
          <Route path="/atendimento/:id" element={<ComandaDetalhePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
