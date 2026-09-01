// Escolhe uma cor "sempre igual pro mesmo texto" (nome de paciente,
// categoria de produto...) dentro de um conjunto de tons que já existem
// no sistema — não são cores novas, é só uma forma de variar
// visualmente listas e cartões sem sortear cor a cada render.
export const SOFT_PALETTE = [
  { bg: "bg-blue-soft", text: "text-blue-strong" },
  { bg: "bg-brass-soft", text: "text-brass" },
  { bg: "bg-tooth-plum-soft", text: "text-tooth-plum" },
  { bg: "bg-tooth-mauve-soft", text: "text-tooth-mauve" },
  { bg: "bg-tooth-metal-soft", text: "text-tooth-metal" },
  { bg: "bg-success-soft", text: "text-success" },
];

export function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return SOFT_PALETTE[hash % SOFT_PALETTE.length];
}
