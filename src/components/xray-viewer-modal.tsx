// Visualizador de imagem (radiografia, foto etc.) com ferramentas de
// ajuste: girar, zoom, inverter cores (negativo) e brilho/contraste —
// os controles clássicos de um visualizador de radiografia, pra
// enxergar melhor um detalhe sem precisar de outro programa.
//
// Importante: esses ajustes são só de VISUALIZAÇÃO, aplicados na tela
// com CSS — o arquivo original enviado nunca é alterado. Fechar e abrir
// de novo volta tudo ao padrão. Isso é proposital: preserva a imagem
// original do exame, que é o documento clínico de verdade.
//
// Também dá pra renomear o arquivo aqui (só o nome/categoria nos
// metadados, não o conteúdo).
"use client";

import { useState } from "react";
import {
  Check,
  Contrast,
  Pencil,
  RotateCcw,
  RotateCw,
  SunMedium,
  X,
  ZoomIn,
  ZoomOut,
  ScanEye,
} from "lucide-react";

type Attachment = {
  _id: string;
  filename: string;
  category: "radiografia" | "foto" | "documento" | "outro";
};

export function XRayViewerModal({
  attachment,
  onClose,
  onRenamed,
}: {
  attachment: Attachment;
  onClose: () => void;
  onRenamed: (filename: string) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [invert, setInvert] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(attachment.filename);
  const [saving, setSaving] = useState(false);

  const isAdjusted = rotation !== 0 || zoom !== 1 || invert || brightness !== 100 || contrast !== 100;

  function resetAdjustments() {
    setRotation(0);
    setZoom(1);
    setInvert(false);
    setBrightness(100);
    setContrast(100);
  }

  async function handleSaveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === attachment.filename) {
      setEditingName(false);
      setNameDraft(attachment.filename);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/attachments/${attachment._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      onRenamed(trimmed);
      setEditingName(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-[2px]" onClick={onClose} />

      <div className="anim-scale-in relative bg-[#14181f] rounded-xl border border-white/10 shadow-xl w-full max-w-3xl overflow-hidden">
        {/* Cabeçalho: nome do arquivo (editável) + fechar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <ScanEye size={16} className="text-white/50 shrink-0" />
          {editingName ? (
            <>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="flex-1 bg-white/10 text-white text-sm rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue"
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 shrink-0"
                aria-label="Salvar nome"
              >
                <Check size={15} />
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-white/90 truncate">{attachment.filename}</p>
              <button
                onClick={() => setEditingName(true)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 shrink-0"
                aria-label="Renomear arquivo"
              >
                <Pencil size={14} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 shrink-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Área da imagem */}
        <div className="h-[55vh] bg-black flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/attachments/${attachment._id}/file`}
            alt={attachment.filename}
            className="max-w-none transition-transform duration-150"
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(1)" : ""}`,
              maxHeight: rotation % 180 === 0 ? "55vh" : "none",
              maxWidth: rotation % 180 === 0 ? "100%" : "55vh",
            }}
          />
        </div>

        {/* Barra de ferramentas de ajuste */}
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.03] space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                aria-label="Girar à esquerda"
                title="Girar à esquerda"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                aria-label="Girar à direita"
                title="Girar à direita"
              >
                <RotateCw size={16} />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                aria-label="Diminuir zoom"
                title="Diminuir zoom"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                aria-label="Aumentar zoom"
                title="Aumentar zoom"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button
                onClick={() => setInvert((v) => !v)}
                className={`h-8 px-2.5 flex items-center gap-1.5 rounded-md text-xs font-medium ${invert ? "bg-blue text-white" : "text-white/80 hover:bg-white/10"}`}
                aria-pressed={invert}
                title="Inverter cores (negativo)"
              >
                Negativo
              </button>
            </div>

            {isAdjusted && (
              <button onClick={resetAdjustments} className="text-xs text-white/60 hover:text-white/90 underline underline-offset-2">
                Restaurar padrão
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <SunMedium size={15} className="text-white/50 shrink-0" />
            <input
              type="range"
              min={50}
              max={150}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-blue"
              aria-label="Brilho"
            />
          </div>
          <div className="flex items-center gap-3">
            <Contrast size={15} className="text-white/50 shrink-0" />
            <input
              type="range"
              min={50}
              max={150}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-blue"
              aria-label="Contraste"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
