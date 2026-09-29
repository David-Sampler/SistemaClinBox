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
        className={`anim-scale-in relative bg-surface/95 rounded-2xl border border-line shadow-[0_20px_60px_rgba(15,23,42,0.18)] w-full ${wide ? "max-w-2xl" : "max-w-lg"} p-5 sm:p-6 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-line">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft transition-colors"
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
