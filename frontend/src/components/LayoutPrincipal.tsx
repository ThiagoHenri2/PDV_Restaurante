import { Outlet } from "react-router-dom";

import { BarraNavegacao } from "./BarraNavegacao";

export function LayoutPrincipal() {
  return (
    <div className="pb-20">
      <Outlet />
      <BarraNavegacao />
    </div>
  );
}
