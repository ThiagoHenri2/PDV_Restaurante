import { Route, Routes } from "react-router-dom";

import StatusCiclo0 from "./pages/StatusCiclo0";

export default function App() {
  return (
    <Routes>
      {/* A partir do Ciclo 1 esta rota vira a tela de login. */}
      <Route path="/" element={<StatusCiclo0 />} />
    </Routes>
  );
}
