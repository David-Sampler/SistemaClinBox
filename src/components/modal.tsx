// Modal genérico (fundo escurecido + caixa central), reaproveitado em
// qualquer tela que precise de um formulário rápido por cima do conteúdo
// (nova consulta na agenda, editar membro da equipe, etc).
"use client";

import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  // Modais com formulário mais recheado (ex: editar orçamento, com a
  // lista de itens) ficavam apertados no tamanho padrão — "wide" dá
  // mais respiro sem afetar quem não passa essa prop.
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`anim-scale-in relative bg-surface rounded-xl border border-line shadow-xl w-full ${wide ? "max-w-lg" : "max-w-md"} p-6 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-soft transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
