// ODONTOGRAMA: grade visual com os 32 dentes permanentes (notação FDI),
// desenhados com o contorno de um dente de verdade (não quadrados
// numerados) — cada um clicável para registrar a situação clínica.
"use client";

import { useEffect, useState } from "react";
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
  { value: "restaurado", label: "Restaurado", tooth: "fill-blue-soft stroke-blue", chip: "bg-blue-soft border-blue/40 text-blue-strong" },
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

      <div className="overflow-x-auto">
        <div className="min-w-[720px] bg-surface-soft border border-line rounded-xl py-6 px-4 space-y-3">
          {/* Arcada superior */}
          <div className="flex justify-center gap-1.5">
            {UPPER_RIGHT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} />
            ))}
            <div className="w-4" />
            {UPPER_LEFT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} />
            ))}
          </div>
          <div className="border-t border-dashed border-line" />
          {/* Arcada inferior */}
          <div className="flex justify-center gap-1.5">
            {LOWER_RIGHT.map((n) => (
              <ToothButton key={n} tooth={teeth[n]} selected={selected === n} onClick={() => setSelected(n)} flip />
            ))}
            <div className="w-4" />
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
      <div className="bg-surface-soft border border-line rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-ink">
          {selected ? `Dente ${selected}` : "Situações clínicas"}
          {!canManage && selected && <span className="text-ink-faint font-normal"> — somente consulta</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = selectedTooth?.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => updateTooth(selected!, opt.value) : undefined}
                className={`text-xs px-3 py-1.5 rounded-full border transition-transform ${opt.chip} ${
                  isActive ? "ring-2 ring-offset-1 ring-offset-surface-soft ring-blue" : ""
                } ${clickable ? "hover:scale-105 cursor-pointer" : "cursor-default"}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Face do dente: só aparece quando a situação afeta uma parte
            específica do dente, não ele inteiro. */}
        {selectedTooth && FACE_RELEVANT_STATUSES.includes(selectedTooth.status) && (
          <div className="pt-1 border-t border-line-soft">
            <p className="text-xs font-medium text-ink-muted mb-1.5 mt-2">Face do dente (opcional)</p>
            <div className="flex flex-wrap gap-1.5">
              {FACE_OPTIONS.map((face) => {
                const active = selectedTooth.faces?.includes(face.value);
                return (
                  <button
                    key={face.value}
                    type="button"
                    disabled={!canManage}
                    onClick={canManage ? () => toggleFace(selected!, face.value) : undefined}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-ink text-porcelain border-ink"
                        : "bg-surface text-ink-muted border-line hover:border-blue/40"
                    } ${canManage ? "cursor-pointer" : "cursor-default"}`}
                  >
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

// Contorno simplificado de um dente (coroa arredondada + duas raízes),
// reaproveitado para todos os dentes — vira de cabeça para baixo na
// arcada inferior (as raízes das arcadas apontam uma para a outra).
const TOOTH_PATH =
  "M12 1.5C7.6 1.5 5 4.6 5 9c0 2.7.7 4.1 1 6.6.4 3.2 1.1 8.4 2.3 10.9.5 1.1 1.1 1.5 1.5 1.5.9 0 1-1.8 1.2-3.4.2-1.6.4-3.1 1-3.1s.8 1.5 1 3.1c.2 1.6.3 3.4 1.2 3.4.4 0 1-.4 1.5-1.5C17.9 24 18.6 18.8 19 15.6c.3-2.5 1-3.9 1-6.6 0-4.4-2.6-7.5-8-7.5Z";

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

  return (
    <button
      onClick={onClick}
      title={`Dente ${tooth.number} — ${option.label}${facesSuffix}`}
      className={`group flex flex-col items-center gap-1 shrink-0 rounded-lg px-1.5 py-1.5 transition-all ${
        selected ? "bg-blue-soft ring-2 ring-blue shadow-sm" : "hover:bg-surface-soft"
      }`}
    >
      <svg
        viewBox="0 0 24 32"
        width={26}
        height={34}
        className={`transition-transform group-hover:scale-110 ${flip ? "rotate-180" : ""} ${
          selected ? "scale-125 drop-shadow-md" : ""
        }`}
      >
        <path
          d={TOOTH_PATH}
          strokeWidth={selected ? 2.2 : 1.3}
          className={option.tooth}
        />
      </svg>
      <span
        className={`text-[10px] tabular rounded-full transition-colors ${
          selected ? "font-semibold text-white bg-blue px-1.5" : "text-ink-faint"
        }`}
      >
        {tooth.number}
      </span>
      {tooth.faces?.length ? <span className="w-1.5 h-1.5 rounded-full bg-ink-faint -mt-1" aria-hidden /> : null}
    </button>
  );
}
