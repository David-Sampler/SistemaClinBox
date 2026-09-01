// Botão "Imprimir" genérico pra páginas de conteúdo (ex: ficha do
// paciente) — usa a própria função de impressão do navegador. A barra
// lateral e o topo somem na impressão (ver print:hidden em nav.tsx e
// user-menu.tsx), então só o conteúdo da página sai no papel/PDF.
"use client";

import { Printer } from "lucide-react";

export function PrintPageButton() {
  return (
    <button onClick={() => window.print()} className="btn-secondary print:hidden">
      <Printer size={15} /> Imprimir
    </button>
  );
}
