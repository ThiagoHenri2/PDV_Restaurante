import { Route, Routes } from "react-router-dom";

import { RotaProtegida } from "./components/RotaProtegida";
import { AuthProvider } from "./context/AuthContext";
import AdminUsuarios from "./pages/AdminUsuarios";
import Home from "./pages/Home";
import Login from "./pages/Login";

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
      </Routes>
    </AuthProvider>
  );
}
