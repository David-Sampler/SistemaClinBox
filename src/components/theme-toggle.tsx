// Botão que alterna entre os três temas visuais do sistema: "Dark"
// (padrão, navy escuro #162936) → "Clínica Clara" (único tema claro,
// fundo branco, destaque verde) → "Verde Noturno" (verde escuro
// saturado) → volta pro início.
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
  saude: "Tema: Dark",
  clinic: "Tema: Clínica clara",
  green: "Tema: Verde limão",
};

const paletteTokens: Record<PaletteName, Record<string, string>> = {
  saude: {
    "--porcelain": "#0a151c",
    "--page-bg-top": "#16262f",
    "--page-bg-bottom": "#0a141a",
    "--surface": "#162936",
    "--surface-soft": "#1c313f",
    "--ink": "#eef3f6",
    "--ink-muted": "#9db0bb",
    "--ink-faint": "#677b86",
    "--line": "#25404f",
  },
  clinic: {
    "--porcelain": "#f3f1fb",
    "--page-bg-top": "#ffffff",
    "--page-bg-bottom": "#f1eefa",
    "--surface": "#ffffff",
    "--surface-soft": "#f4f1fb",
    "--ink": "#221c3b",
    "--ink-muted": "#8886a1",
    "--ink-faint": "#b7b4c9",
    "--line": "#ebe7f7",
  },
  green: {
    "--porcelain": "#0b0b0d",
    "--page-bg-top": "#121214",
    "--page-bg-bottom": "#0b0b0d",
    "--surface": "#19191c",
    "--surface-soft": "#222226",
    "--ink": "#f5f5f3",
    "--ink-muted": "#a8a8ae",
    "--ink-faint": "#6e6e74",
    "--line": "#2c2c31",
  },
};

function applyPalette(next: PaletteName) {
  const root = document.documentElement;
  const body = document.body;

  const tokens = paletteTokens[next];
  Object.entries(tokens).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  if (next === "saude") {
    root.removeAttribute("data-palette");
    body.style.background = "linear-gradient(180deg, #16262f 0%, #0a141a 100%)";
    body.style.backgroundColor = "#0a141a";
    body.style.color = tokens["--ink"];
    return;
  }

  root.setAttribute("data-palette", next);
  body.style.background = `linear-gradient(180deg, ${tokens["--page-bg-top"]} 0%, ${tokens["--page-bg-bottom"]} 100%)`;
  body.style.backgroundColor = tokens["--porcelain"];
  body.style.color = tokens["--ink"];
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
