// Modal pra ADMINISTRADOR redefinir a senha de outro usuário da equipe —
// resolve o caso de alguém esquecer a senha sem precisar mexer no banco
// na mão. Separado do modal de editar cadastro de propósito: trocar
// senha é uma ação mais sensível, merece sua própria confirmação.
"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/modal";

export function ResetPasswordModal({
  memberName,
  memberId,
  onClose,
  onSaved,
}: {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password !== confirm) {
      setError("As senhas digitadas não são iguais.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/users/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível redefinir a senha.");
      return;
    }

    onSaved();
  }

  return (
    <Modal title="Redefinir senha" onClose={onClose}>
      <p className="text-sm text-ink-muted mb-4">
        Defina uma nova senha provisória para <strong className="text-ink">{memberName}</strong>. Combine com a
        pessoa pra ela trocar por uma senha própria depois.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Nova senha</label>
          <input name="password" type="password" required minLength={6} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Confirmar nova senha</label>
          <input name="confirm" type="password" required minLength={6} className="input" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Salvando..." : "Redefinir senha"}
        </button>
      </form>
    </Modal>
  );
}
