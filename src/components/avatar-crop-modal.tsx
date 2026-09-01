// Modal de AJUSTE DA FOTO antes de salvar: arrasta pra reposicionar e
// usa o controle de zoom pra aproximar/afastar, dentro de uma moldura
// circular (é assim que a foto aparece no resto do sistema). Sem isso,
// a foto enviada usava um corte automático no centro — se o rosto não
// ficasse bem no meio da imagem original, saía cortado.
"use client";

import { useMemo, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";

const FRAME = 260; // tamanho (px) da área de ajuste, na tela
const OUTPUT = 480; // tamanho (px) da imagem final enviada

export function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);
  const [saving, setSaving] = useState(false);

  // Escala "base": a menor dimensão da foto cobre a moldura inteira
  // (mesmo efeito do object-fit: cover) — o zoom multiplica em cima disso.
  const baseScale = natural ? FRAME / Math.min(natural.w, natural.h) : 1;
  const scale = baseScale * zoom;
  const renderedW = natural ? natural.w * scale : FRAME;
  const renderedH = natural ? natural.h * scale : FRAME;

  function clamp(value: { x: number; y: number }, w: number, h: number) {
    const maxX = Math.max(0, (w - FRAME) / 2);
    const maxY = Math.max(0, (h - FRAME) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, value.x)), y: Math.min(maxY, Math.max(-maxY, value.y)) };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clamp({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy }, renderedW, renderedH));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    if (!natural) return;
    const nextScale = baseScale * next;
    setOffset((prev) => clamp(prev, natural.w * nextScale, natural.h * nextScale));
  }

  async function handleConfirm() {
    if (!imgRef.current || !natural) return;
    setSaving(true);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d")!;
    const outputScale = OUTPUT / FRAME;

    ctx.drawImage(
      imgRef.current,
      0,
      0,
      natural.w,
      natural.h,
      (FRAME / 2 - renderedW / 2 + offset.x) * outputScale,
      (FRAME / 2 - renderedH / 2 + offset.y) * outputScale,
      renderedW * outputScale,
      renderedH * outputScale
    );

    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="anim-scale-in relative bg-surface rounded-xl border border-line shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink">Ajustar foto</h2>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-soft" aria-label="Cancelar">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-ink-muted mb-3">Arraste a foto pra posicionar e use o controle abaixo pra aproximar.</p>

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-neutral-soft cursor-grab active:cursor-grabbing touch-none select-none ring-4 ring-surface-soft"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Foto selecionada"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
              setOffset({ x: 0, y: 0 });
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: renderedW,
              height: renderedH,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
        </div>

        <div className="flex items-center gap-2 mt-4">
          <ZoomIn size={15} className="text-ink-faint shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full accent-blue"
          />
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving || !natural} className="btn-primary flex-1">
            <Check size={15} /> {saving ? "Salvando..." : "Usar essa foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
