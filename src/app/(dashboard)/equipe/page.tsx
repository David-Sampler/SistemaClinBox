// Página de EQUIPE: lista os usuários do sistema, permite ao administrador
// cadastrar novos, editar papel/dados e desativar (dentistas, recepção,
// outros administradores). Reforça que o sistema é multiusuário: várias
// pessoas usam com papéis diferentes — é aqui que o admin decide quem
// tem qual papel (veja também as regras de acesso: staff não mexe em
// prontuário/odontograma/atestados, só admin/dentista podem).
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Modal } from "@/components/modal";
import { PermissionsPanel } from "@/components/permissions-panel";
import { ResetPasswordModal } from "@/components/reset-password-modal";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "dentist" | "staff";
  cro?: string;
  phone?: string;
  active: boolean;
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  dentist: "Dentista",
  staff: "Recepção",
};

export default function EquipePage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Por padrão só traz quem está ativo; ligar isso também busca quem foi
  // desativado, pra mostrar a seção "Usuários inativos" com opção de reativar.
  const [showInactive, setShowInactive] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  async function loadMembers() {
    setLoading(true);
    const res = await fetch(showInactive ? "/api/users?includeInactive=true" : "/api/users");
    const data = await res.json();
    setMembers(data.users ?? []);
    setLoading(false);
  }

  const activeMembers = members.filter((m) => m.active);
  const inactiveMembers = members.filter((m) => !m.active);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
      cro: form.get("cro") || undefined,
      phone: form.get("phone") || undefined,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Não foi possível cadastrar o usuário.");
      return;
    }

    (e.target as HTMLFormElement).reset();
    setShowForm(false);
    loadMembers();
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Desativar este usuário? Ele perde o acesso ao sistema, mas o histórico dele é mantido.")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadMembers();
  }

  // Reverte a desativação: usa o mesmo PUT de editar usuário, só que
  // mandando "active: true" — o campo já existia no schema de edição,
  // faltava só este botão pra usar.
  async function handleReactivate(id: string) {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    loadMembers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Equipe</h1>
          <p className="text-ink-muted">Pessoas com acesso ao sistema (dentistas, recepção e administração)</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="btn-secondary"
            >
              {showInactive ? "Ocultar inativos" : "Ver inativos"}
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary"
            >
              <Plus size={16} /> Novo usuário
            </button>
          </div>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-line p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Nome</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">E-mail</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Senha provisória</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Papel</label>
            <select name="role" required className="input">
              <option value="dentist">Dentista</option>
              <option value="staff">Recepção</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">CRO (se dentista)</label>
            <input name="cro" className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Telefone (com DDD)</label>
            <input name="phone" placeholder="(00) 00000-0000" className="input" />
          </div>

          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="btn-primary"
            >
              Cadastrar usuário
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {activeMembers.map((m, i) => (
              <li
                key={m._id}
                className="fade-up px-5 py-3 flex items-center gap-3 text-sm hover:bg-surface-soft transition-colors"
                style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              >
                <UserAvatar userId={m._id} name={m.name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{m.name}</p>
                  <p className="text-ink-muted truncate">{m.email}</p>
                </div>
                {m.phone && <span className="text-ink-faint text-xs shrink-0 hidden sm:inline">{m.phone}</span>}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-soft text-blue-strong shrink-0">
                  {roleLabels[m.role] ?? m.role}
                </span>
                <WhatsAppLink phone={m.phone} />
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(m)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:bg-surface hover:text-blue transition-colors"
                      aria-label="Editar usuário"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setResetting(m)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:bg-surface hover:text-blue transition-colors"
                      aria-label="Redefinir senha"
                      title="Redefinir senha"
                    >
                      <KeyRound size={14} />
                    </button>
                    {m._id !== session?.user?.id && (
                      <button
                        onClick={() => handleDeactivate(m._id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors"
                        aria-label="Desativar usuário"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin && showInactive && (
        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
          <div className="px-5 py-3 border-b border-line-soft">
            <p className="text-sm font-medium text-ink">Usuários inativos</p>
            <p className="text-xs text-ink-muted">
              Perderam o acesso ao sistema, mas o histórico deles foi mantido. Reative quando precisar.
            </p>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="skeleton h-10" />
            </div>
          ) : inactiveMembers.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-faint">Nenhum usuário inativo no momento.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {inactiveMembers.map((m) => (
                <li key={m._id} className="px-5 py-3 flex items-center gap-3 text-sm opacity-60">
                  <UserAvatar userId={m._id} name={m.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{m.name}</p>
                    <p className="text-ink-muted truncate">{m.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-soft text-ink-faint shrink-0">
                    {roleLabels[m.role] ?? m.role}
                  </span>
                  <button
                    onClick={() => handleReactivate(m._id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:bg-success-soft hover:text-success transition-colors shrink-0"
                    aria-label="Reativar usuário"
                    title="Reativar usuário"
                  >
                    <UserCheck size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isAdmin && <PermissionsPanel />}

      {editing && (
        <EditMemberModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadMembers();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          memberId={resetting._id}
          memberName={resetting.name}
          onClose={() => setResetting(null)}
          onSaved={() => setResetting(null)}
        />
      )}
    </div>
  );
}

function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      role: form.get("role"),
      cro: form.get("cro") || undefined,
      phone: form.get("phone") || undefined,
    };

    const res = await fetch(`/api/users/${member._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível salvar as alterações.");
      return;
    }

    onSaved();
  }

  return (
    <Modal title="Editar usuário" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Nome</label>
          <input name="name" required defaultValue={member.name} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">E-mail</label>
          <input name="email" type="email" required defaultValue={member.email} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Papel</label>
          <select name="role" required defaultValue={member.role} className="input">
            <option value="dentist">Dentista</option>
            <option value="staff">Recepção</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">CRO</label>
            <input name="cro" defaultValue={member.cro} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Telefone</label>
            <input name="phone" defaultValue={member.phone} placeholder="(00) 00000-0000" className="input" />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </Modal>
  );
}
