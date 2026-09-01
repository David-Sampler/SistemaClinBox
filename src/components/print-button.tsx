// Botões de impressão da tela de documento clínico (atestado, laudo,
// comparecimento, receita) — deixa escolher o tamanho do papel (A4 ou
// A5, comum pra receita/atestado, que não precisa de uma folha inteira).
// Como a regra @page global do sistema (globals.css) é fixa em A4,
// aqui a gente injeta uma <style> por cima na hora do clique, trocando
// só pra ESSA impressão — e desfaz sozinho depois (evento "afterprint"),
// então o resto do sistema continua imprimindo em A4 normalmente.
"use client";

import { Printer } from "lucide-react";

// ".print-doc" é a classe no container do papel, em
// src/app/documentos/[id]/imprimir/page.tsx — aqui só sobrescrevemos o
// tamanho máximo/preenchimento dele pra caber direitinho no papel menor.
const PAGE_CSS: Record<"a4" | "a5", string> = {
  a4: `
    @page { size: A4; margin: 12mm; }
    @media print { .print-doc { max-width: 210mm; padding: 20mm; } }
  `,
  a5: `
    @page { size: A5; margin: 8mm; }
    @media print { .print-doc { max-width: 148mm; padding: 10mm; } }
  `,
};

function printAs(size: "a4" | "a5") {
  const style = document.createElement("style");
  style.textContent = PAGE_CSS[size];
  document.head.appendChild(style);

  const cleanup = () => {
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  window.print();
}

export function PrintButton() {
  return (
    <div className="print:hidden fixed top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-1 bg-surface border border-line rounded-lg p-1 shadow-lg">
      <button onClick={() => printAs("a4")} className="btn-primary !py-1.5">
        <Printer size={15} /> A4
      </button>
      <button onClick={() => printAs("a5")} className="btn-secondary !py-1.5 !shadow-none !border-0">
        <Printer size={15} /> A5
      </button>
    </div>
  );
}
