// Configurações da CLÍNICA: nome e logo que aparecem no papel timbrado
// dos documentos impressos (atestado, receita, orçamento) — dado da
// clínica como um todo, não de um usuário. Só administrador edita.
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Building2, Check, Trash2, Upload } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [name, setName] = useState("");
  const [hasLogo, setHasLogo] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0); // muda pra forçar o <img> recarregar depois de trocar a logo
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/clinic-settings");
    const data = await res.json();
    setName(data.settings?.name ?? "");
    setHasLogo(!!data.settings?.hasLogo);
    setLoading(false);
  }

  async function handleSaveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/clinic-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/clinic-settings/logo", { method: "POST", body: form });

    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Não foi possível enviar a logo.");
      return;
    }
    setHasLogo(true);
    setLogoVersion((v) => v + 1);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRemoveLogo() {
    if (!confirm("Remover a logo da clínica? Os documentos voltam a usar a marca padrão do ClinBox.")) return;
    await fetch("/api/clinic-settings/logo", { method: "DELETE" });
    setHasLogo(false);
    setLogoVersion((v) => v + 1);
  }

  if (!loading && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <Building2 size={32} className="mx-auto text-ink-faint mb-3" />
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Configurações da clínica</h1>
        <p className="text-ink-muted">Somente administradores podem ver e editar essas configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Configurações da clínica</h1>
        <p className="text-ink-muted">Nome e logo exibidos no papel timbrado dos documentos impressos.</p>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : (
        <div className="bg-surface rounded-xl border border-line p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Logo da clínica</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-line bg-surface-soft flex items-center justify-center overflow-hidden shrink-0">
                {hasLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/clinic-settings/logo?v=${logoVersion}`}
                    alt="Logo da clínica"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 size={26} className="text-ink-faint" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary cursor-pointer inline-flex w-fit">
                  <Upload size={15} />
                  {uploading ? "Enviando..." : hasLogo ? "Trocar logo" : "Enviar logo"}
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUploadLogo} className="hidden" />
                </label>
                {hasLogo && (
                  <button onClick={handleRemoveLogo} className="text-xs text-danger hover:underline inline-flex items-center gap-1 w-fit">
                    <Trash2 size={12} /> Remover logo
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-ink-faint mt-2">
              Sem logo, os documentos usam a marca padrão do ClinBox. PNG ou SVG com fundo transparente fica melhor.
            </p>
          </div>

          <form onSubmit={handleSaveName} className="border-t border-line-soft pt-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Nome da clínica</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="Ex: Clínica Odontofaci"
              />
              <p className="text-xs text-ink-faint mt-1">Aparece ao lado da logo no cabeçalho dos documentos impressos.</p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary">
              {saved ? (
                <>
                  <Check size={15} /> Salvo
                </>
              ) : saving ? (
                "Salvando..."
              ) : (
                "Salvar nome"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
