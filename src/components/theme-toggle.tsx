// Botão que alterna entre os três temas visuais do sistema:
// "Azul-saúde" (padrão) → "Clínica Moderna" (claro e colorido) →
// "Verde-consultório" (verde-clínico, barra escura) → volta pro início.
// A escolha fica salva no navegador (localStorage) — cada pessoa da
// equipe pode usar o tema que preferir, sem afetar as outras.
"use client";

import { useState } from "react";
import { Palette } from "lucide-react";

type PaletteName = "saude" | "clinic" | "green";

const STORAGE_KEY = "clinbox-palette";

// Ordem do ciclo: cada clique avança pra próxima da lista.
const ORDER: PaletteName[] = ["saude", "clinic", "green"];

const paletteLabels: Record<PaletteName, string> = {
  saude: "Tema: Azul-saúde",
  clinic: "Tema: Clínica moderna",
  green: "Tema: Verde-consultório",
};

function applyPalette(next: PaletteName) {
  const root = document.documentElement;
  if (next === "saude") {
    root.removeAttribute("data-palette");
    return;
  }
  root.setAttribute("data-palette", next);
}

export function ThemeToggle() {
  const [palette, setPalette] = useState<PaletteName>(() => {
    if (typeof window === "undefined") return "saude";

    const stored = localStorage.getItem(STORAGE_KEY) as PaletteName | null;
    const initial = stored && ORDER.includes(stored) ? stored : "saude";
    applyPalette(initial);
    return initial;
  });

  function cycle() {
    const next = ORDER[(ORDER.indexOf(palette) + 1) % ORDER.length];
    setPalette(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyPalette(next);
  }

  return (
    <button
      onClick={cycle}
      className="group relative w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text transition-colors"
      aria-label={paletteLabels[palette]}
    >
      <Palette size={18} />
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-porcelain opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 z-50 hidden md:block">
        {paletteLabels[palette]} · trocar
      </span>
    </button>
  );
}
