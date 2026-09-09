// ODONTOGRAMA: grade visual com os 32 dentes permanentes (notação FDI),
// desenhados com o contorno de um dente de verdade (não quadrados
// numerados) — cada um clicável para registrar a situação clínica.
"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { usePermission } from "@/components/permissions-provider";

type ToothStatus =
  | "sadio"
  | "cariado"
  | "restaurado"
  | "ausente"
  | "extracao_indicada"
  | "tratamento_endodontico"
  | "coroa"
  | "implante"
  | "fraturado"
  | "protese";

type Tooth = { number: string; status: ToothStatus; faces?: string[]; notes?: string };

// Números dos dentes permanentes em notação FDI, organizados por arcada.
// Arcada superior: quadrantes 1 (direito) e 2 (esquerdo)
const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
// Arcada inferior: quadrantes 4 (direito) e 3 (esquerdo)
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

// Cada situação clínica tem uma cor com paralelo real no consultório:
// cárie e fratura puxam para o vermelho/terracota (alerta), restauração
// e implante puxam para os tons "de marca" (bom/resolvido), coroa usa o
// bronze (ouro/cerâmica), prótese e canal ganham tons próprios para não
// se confundirem com o resto. "tooth" colore o desenho do dente;
// "chip" é usado na lista de situações (que funciona como legenda E
// como seletor — ver renderização abaixo).
const STATUS_OPTIONS: {
  value: ToothStatus;
  label: string;
  tooth: string;
  chip: string;
}[] = [
  { value: "sadio", label: "Sadio", tooth: "fill-surface stroke-line-soft", chip: "bg-surface border-line text-ink-muted" },
  { value: "cariado", label: "Cariado", tooth: "fill-danger-soft stroke-danger", chip: "bg-danger-soft border-danger/40 text-danger" },
  { value: "restaurado", label: "Restauração", tooth: "fill-blue-soft stroke-blue", chip: "bg-blue-soft border-blue/40 text-blue-strong" },
  { value: "ausente", label: "Ausente", tooth: "fill-neutral-soft stroke-line", chip: "bg-neutral-soft border-line text-ink-faint" },
  { value: "extracao_indicada", label: "Extração indicada", tooth: "fill-warning-soft stroke-warning", chip: "bg-warning-soft border-warning/40 text-warning" },
  { value: "tratamento_endodontico", label: "Tratamento endodôntico", tooth: "fill-tooth-plum-soft stroke-tooth-plum", chip: "bg-tooth-plum-soft border-tooth-plum/40 text-tooth-plum" },
  { value: "coroa", label: "Coroa", tooth: "fill-brass-soft stroke-brass", chip: "bg-brass-soft border-brass/40 text-brass" },
  { value: "implante", label: "Implante", tooth: "fill-tooth-metal-soft stroke-tooth-metal", chip: "bg-tooth-metal-soft border-tooth-metal/40 text-tooth-metal" },
  { value: "fraturado", label: "Fraturado", tooth: "fill-tooth-rust-soft stroke-tooth-rust", chip: "bg-tooth-rust-soft border-tooth-rust/40 text-tooth-rust" },
  { value: "protese", label: "Prótese", tooth: "fill-tooth-mauve-soft stroke-tooth-mauve", chip: "bg-tooth-mauve-soft border-tooth-mauve/40 text-tooth-mauve" },
];

// Faces do dente — só fazem sentido pra situações que afetam uma parte
// específica do dente (cárie, restauração, fratura), não o dente
// inteiro (ausente, coroa, implante, prótese, canal, extração).
const FACE_OPTIONS: { value: string; label: string }[] = [
  { value: "oclusal", label: "Oclusal" },
  { value: "mesial", label: "Mesial" },
  { value: "distal", label: "Distal" },
  { value: "vestibular", label: "Vestibular" },
  { value: "lingual", label: "Lingual/Palatina" },
];
const FACE_RELEVANT_STATUSES: ToothStatus[] = ["cariado", "restaurado", "fraturado"];

function statusOption(status: ToothStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function faceLabel(value: string) {
  return FACE_OPTIONS.find((f) => f.value === value)?.label ?? value;
}

export function OdontogramChart({ patientId }: { patientId: string }) {
  // Odontograma é ação clínica — o admin decide em Equipe → Permissões
  // se a recepção (staff) pode registrar ou só acompanhar.
  const canManage = usePermission("odontogram");
  const [teeth, setTeeth] = useState<Record<string, Tooth>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOdontogram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadOdontogram() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/odontogram`);
    const data = await res.json();

    // Monta um mapa número->dente, começando com todos "sadios" e
    // sobrescrevendo com o que já foi salvo no banco.
    const map: Record<string, Tooth> = {};
    [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach((n) => {
      map[n] = { number: n, status: "sadio" };
    });
    (data.odontogram?.teeth ?? []).forEach((t: Tooth) => {
      map[t.number] = t;
    });

    setTeeth(map);
    setLoading(false);
  }

  async function persist(next: Record<string, Tooth>) {
    setTeeth(next);
    setSaving(true);
    await fetch(`/api/patients/${patientId}/odontogram`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teeth: Object.values(next) }),
    });
    setSaving(false);
  }

  async function updateTooth(number: string, status: ToothStatus) {
    // Trocar pra uma situação que não é "de face" (ex: ausente, coroa)
    // limpa as faces marcadas — não faz sentido guardar "mesial" num
    // dente que já foi extraído.
    const keepFaces = FACE_RELEVANT_STATUSES.includes(status);
    const next = {
      ...teeth,
      [number]: { ...teeth[number], status, faces: keepFaces ? teeth[number]?.faces : undefined },
    };
    await persist(next);
  }

  async function toggleFace(number: string, face: string) {
    const current = teeth[number]?.faces ?? [];
    const nextFaces = current.includes(face) ? current.filter((f) => f !== face) : [...current, face];
    const next = { ...teeth, [number]: { ...teeth[number], faces: nextFaces } };
    await persist(next);
  }

  if (loading) return <p className="text-sm text-ink-muted py-6">Carregando odontograma...</p>;

  const selectedTooth = selected ? teeth[selected] : undefined;
  const clickable = canManage && !!selected;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {canManage ? "Clique em um dente para registrar a situação clínica." : "Clique em um dente para ver a situação clínica."}
        </p>
        {saving && <span className="text-xs text-blue">Salvando...</span>}
      </div>

      {/* Na tela, se precisar, rola pro lado (overflow-x-auto + largura
          mínima). Na impressão isso não existe — papel não tem scroll —
          então print:min-w-0 deixa a grade encolher, e cada dente fica
          um pouco menor só no papel (print:...), pra garantir que TODOS
          os 32 dentes caibam na largura de uma folha A4, sem cortar os
          últimos (28 e 38) como acontecia antes. */}
      <div className="overflow-x-auto print:overflow-visible">
        <div className="min-w-[720px] print:min-w-0 print:break-inside-avoid rounded-2xl ring-1 ring-line bg-surface-soft py-6 px-2 sm:px-5 print:py-3 print:px-2 print:ring-0 space-y-2">
          {/* Arcada superior */}
          <div className="flex justify-center gap-1.5 print:gap-0.5">
            {UPPER_RIGHT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} />
            ))}
            <div className="w-4 print:w-2" />
            {UPPER_LEFT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} />
            ))}
          </div>
          {/* Linha média das arcadas */}
          <div className="flex items-center gap-2 px-2 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-faint print:hidden">
            <span className="h-px flex-1 bg-line" />
            <span>Direito</span>
            <span className="h-1 w-1 rounded-full bg-line" />
            <span>Esquerdo</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="hidden print:block border-t border-dashed border-line" />
          {/* Arcada inferior */}
          <div className="flex justify-center gap-1.5 print:gap-0.5">
            {LOWER_RIGHT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} flip />
            ))}
            <div className="w-4 print:w-2" />
            {LOWER_LEFT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} flip />
            ))}
          </div>
        </div>
      </div>

      {/* Uma lista só de situações clínicas — funciona como legenda
          (sempre visível, mostra o que cada cor significa) E como
          seletor (quando um dente está escolhido e dá pra editar, fica
          clicável e destaca a situação atual). Antes eram duas listas
          repetidas na tela; agora é uma coisa só. */}
      <div className="print:break-inside-avoid rounded-2xl ring-1 ring-line bg-surface p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {selected ? "Dente selecionado" : "Legenda"}
            </p>
            <p className="font-display text-base font-semibold text-ink mt-0.5">
              {selected ? `Dente ${selected}` : "Situações clínicas"}
            </p>
          </div>
          {selectedTooth && (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusOption(selectedTooth.status).chip}`}
            >
              <MiniTooth className={statusOption(selectedTooth.status).tooth} />
              {statusOption(selectedTooth.status).label}
            </span>
          )}
        </div>
        {!canManage && selected && (
          <p className="text-xs text-ink-faint">Somente consulta — sem permissão para editar o odontograma.</p>
        )}
        {canManage && !selected && (
          <p className="text-xs text-ink-faint">Toque em um dente para registrar a situação clínica.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = selectedTooth?.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => updateTooth(selected!, opt.value) : undefined}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${opt.chip} ${
                  isActive ? "ring-2 ring-offset-1 ring-offset-surface ring-blue shadow-sm" : ""
                } ${clickable ? "hover:-translate-y-0.5 hover:shadow-sm cursor-pointer" : "cursor-default"}`}
              >
                <MiniTooth className={opt.tooth} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Face do dente: só aparece quando a situação afeta uma parte
            específica do dente, não ele inteiro. */}
        {selectedTooth && FACE_RELEVANT_STATUSES.includes(selectedTooth.status) && (
          <div className="border-t border-line-soft pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Faces afetadas
              <span className="ml-1.5 font-normal normal-case tracking-normal">· opcional</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FACE_OPTIONS.map((face) => {
                const active = !!selectedTooth.faces?.includes(face.value);
                return (
                  <button
                    key={face.value}
                    type="button"
                    disabled={!canManage}
                    aria-pressed={active}
                    onClick={canManage ? () => toggleFace(selected!, face.value) : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "border-blue bg-blue text-white shadow-sm"
                        : "border-transparent bg-surface-soft text-ink-muted hover:border-line hover:text-ink"
                    } ${canManage ? "cursor-pointer" : "cursor-default opacity-70"}`}
                  >
                    <span
                      className={`grid h-3.5 w-3.5 place-items-center rounded-full border transition-colors ${
                        active ? "border-white/50 bg-white/20 text-white" : "border-ink-faint/40 text-transparent"
                      }`}
                    >
                      <Check size={9} strokeWidth={3.5} />
                    </span>
                    {face.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Contorno de um dente montado em duas camadas — COROA (parte de cima,
// com um brilho de esmalte) + RAIZ(ES) — reaproveitadas para todos os
// dentes e ajustadas por tipo (molar mais largo e com duas raízes,
// canino com raiz mais longa, incisivo mais estreito). Vira de cabeça
// para baixo na arcada inferior (as raízes das arcadas se opõem).
const CROWN_PATH =
  "M12 2.2c-3.6 0-6.1 1.9-6.1 5.1 0 1.9.3 3.3.6 4.8.3 1.6.6 2.5 1.1 3.3.8 1.2 2.4 1.7 4.4 1.7s3.6-.5 4.4-1.7c.5-.8.8-1.7 1.1-3.3.3-1.5.6-2.9.6-4.8 0-3.2-2.5-5.1-6.1-5.1Z";
const ROOT_PATH =
  "M7.9 12.8c-.6 3-.9 6.1-.4 9.6.4 3.1 1.1 6.2 2.1 8.1.5.9 1 1.3 1.6 1.3s1.1-.4 1.6-1.3c1-1.9 1.7-5 2.1-8.1.5-3.5.2-6.6-.4-9.6-2 .6-4.3.6-6.3 0Z";

// O último dígito do número FDI diz a posição na arcada: 1–2 incisivo,
// 3 canino, 4–5 pré-molar, 6–8 molar. Daí sai a "cara" de cada dente.
function toothGeometry(number: string) {
  const pos = Number(number.slice(-1));
  if (pos >= 6) return { crownScale: 1.2, rootScaleY: 0.9, roots: [-2.8, 2.8] };
  if (pos >= 4) return { crownScale: 1, rootScaleY: 1, roots: [0] };
  if (pos === 3) return { crownScale: 0.88, rootScaleY: 1.14, roots: [0] };
  return { crownScale: 0.78, rootScaleY: 0.96, roots: [0] };
}

// Mini silhueta de dente usada como "amostra" de cor na legenda /
// seletor de situações clínicas — mesma forma do odontograma, só que
// pequena, pra reforçar que aquela cor é a que aparece no dente.
function MiniTooth({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 34" className="h-4 w-3 shrink-0" aria-hidden strokeLinejoin="round">
      <path d={ROOT_PATH} strokeWidth={1.5} className={className} />
      <path d={CROWN_PATH} strokeWidth={1.5} className={className} />
    </svg>
  );
}

function ToothButton({
  tooth,
  selected,
  onClick,
  flip,
}: {
  tooth?: Tooth;
  selected: boolean;
  onClick: () => void;
  flip?: boolean;
}) {
  if (!tooth) return null;
  const option = statusOption(tooth.status);
  const facesSuffix = tooth.faces?.length ? ` (${tooth.faces.map(faceLabel).join(", ")})` : "";
  const geo = toothGeometry(tooth.number);
  const absent = tooth.status === "ausente";
  const sw = selected ? 1.9 : 1.3;

  return (
    <button
      onClick={onClick}
      title={`Dente ${tooth.number} — ${option.label}${facesSuffix}`}
      className={`group flex flex-col items-center gap-1 shrink-0 rounded-xl px-1.5 py-1.5 print:px-0.5 print:py-0.5 transition-all ${
        selected ? "bg-blue-soft ring-2 ring-blue shadow-sm" : "hover:bg-surface-soft"
      }`}
    >
      <svg
        viewBox="0 0 24 34"
        // largura/altura em classes (não em atributo fixo) só pra poder
        // encolher no print:... sem precisar de outro componente
        className={`w-[27px] h-[38px] print:w-[19px] print:h-[27px] overflow-visible transition-transform group-hover:scale-110 ${
          flip ? "rotate-180" : ""
        } ${selected ? "scale-[1.22] drop-shadow-md" : ""}`}
      >
        <g className={absent ? "opacity-40" : ""} strokeLinejoin="round" strokeLinecap="round">
          {geo.roots.map((dx, i) => (
            <path
              key={i}
              d={ROOT_PATH}
              transform={`translate(${dx} 0) translate(12 22) scale(1 ${geo.rootScaleY}) translate(-12 -22)`}
              strokeWidth={sw}
              className={option.tooth}
            />
          ))}
          <path
            d={CROWN_PATH}
            transform={`translate(12 12) scale(${geo.crownScale} 1) translate(-12 -12)`}
            strokeWidth={sw}
            className={option.tooth}
          />
          {!absent && (
            <ellipse
              cx={11}
              cy={6.4}
              rx={3 * geo.crownScale}
              ry={1.7}
              fill="#ffffff"
              fillOpacity={0.35}
              stroke="none"
            />
          )}
        </g>
        {absent && (
          <path
            d="M7 9l10 12M17 9L7 21"
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            className="stroke-ink-faint"
          />
        )}
      </svg>
      <span
        className={`text-[10px] print:text-[8px] leading-none tabular rounded-full px-1 transition-colors ${
          selected ? "font-semibold text-white bg-blue px-1.5" : "text-ink-faint"
        }`}
      >
        {tooth.number}
      </span>
      {tooth.faces?.length ? (
        <span className="-mt-0.5 text-[8px] print:text-[7px] font-semibold leading-none tracking-wide text-blue">
          {tooth.faces.map((f) => faceLabel(f)[0].toUpperCase()).join("")}
        </span>
      ) : null}
    </button>
  );
}
