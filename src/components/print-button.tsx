// Botão flutuante "Imprimir" na tela de impressão de documentos — some
// sozinho quando a impressão realmente sai do navegador (print:hidden),
// então não aparece no PDF/papel gerado.
"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed top-4 right-4 sm:top-6 sm:right-6 btn-primary z-10"
    >
      <Printer size={16} /> Imprimir
    </button>
  );
}
