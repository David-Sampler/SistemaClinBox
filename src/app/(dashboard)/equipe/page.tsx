// Página de EQUIPE: lista os usuários do sistema e permite ao administrador
// cadastrar novos (dentistas, recepção, outros administradores).
// Reforça que o sistema é multiusuário: várias pessoas usam com papéis diferentes.
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { WhatsAppLink } from "@/components/whatsapp-link";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "dentist" | "staff";
  cro?: string;
  phone?: string;
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
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setMembers(data.users ?? []);
    setLoading(false);
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Equipe</h1>
          <p className="text-ink-muted">Pessoas com acesso ao sistema (dentistas, recepção e administração)</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
          >
            <Plus size={16} /> Novo usuário
          </button>
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
            {members.map((m, i) => (
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
