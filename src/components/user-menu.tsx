// Barra fina no topo de cada página, com a foto e o nome de quem está
// logado — sempre visível (diferente do avatar da barra lateral, que só
// aparece com o rótulo ao passar o mouse). Clicar na foto permite trocar.
"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarCropModal } from "@/components/avatar-crop-modal";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  dentist: "Dentista",
  staff: "Recepção",
};

export function UserMenu({ userId, userName, userRole }: { userId: string; userName: string; userRole: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    // Abre o ajuste (posição/zoom) antes de enviar, em vez de subir a
    // foto crua direto — sem isso, o corte automático no centro podia
    // deixar o rosto fora do círculo se a foto original não fosse quadrada.
    setPendingFile(file);
  }

  async function handleCropConfirm(blob: Blob) {
    setPendingFile(null);
    setUploading(true);

    const form = new FormData();
    form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/users/me/avatar", { method: "POST", body: form });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Não foi possível enviar a foto.");
      return;
    }

    // Muda a versão pra "furar" o cache do navegador e mostrar a foto nova.
    setVersion((v) => v + 1);
  }

  return (
    <div className="print:hidden relative flex items-center justify-end gap-3 px-4 md:px-8 py-3 border-b border-line bg-surface">
      <div className="text-right leading-tight">
        <p className="text-sm font-medium text-ink">{userName}</p>
        <p className="text-xs text-ink-muted">{roleLabels[userRole] ?? userRole}</p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative group shrink-0 rounded-full"
        aria-label="Trocar foto de perfil"
        title="Clique para trocar a foto"
      >
        <UserAvatar userId={userId} name={userName} size={36} version={version} />
        <span className="absolute inset-0 rounded-full bg-ink/0 group-hover:bg-ink/20 transition-colors" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="absolute top-14 right-4 md:right-8 text-xs text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-1.5 shadow-sm z-10">
          {error}
        </p>
      )}

      {pendingFile && (
        <AvatarCropModal file={pendingFile} onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
