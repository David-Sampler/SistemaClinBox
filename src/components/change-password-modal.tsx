// Modal pra QUALQUER usuário logado trocar a própria senha — pede a
// senha atual antes de aceitar a nova (ver /api/users/me/password).
"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/modal";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirm = String(form.get("confirm") || "");

    if (newPassword !== confirm) {
      setError("A nova senha e a confirmação não são iguais.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/users/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível trocar a senha.");
      return;
    }

    setSuccess(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Modal title="Trocar minha senha" onClose={onClose}>
      {success ? (
        <div className="space-y-4">
          <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
            Senha alterada com sucesso.
          </p>
          <button onClick={onClose} className="btn-primary w-full">
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Senha atual</label>
            <input name="currentPassword" type="password" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Nova senha</label>
            <input name="newPassword" type="password" required minLength={6} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Confirmar nova senha</label>
            <input name="confirm" type="password" required minLength={6} className="input" />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Salvando..." : "Trocar senha"}
          </button>
        </form>
      )}
    </Modal>
  );
}
