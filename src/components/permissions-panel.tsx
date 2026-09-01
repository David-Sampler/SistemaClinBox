// Painel de PERMISSÕES POR PAPEL — onde o admin decide o que dentista e
// recepção podem fazer além do básico (agenda, pacientes, financeiro e
// vendas já são liberados pra todo mundo logado). Cada clique salva na
// hora, sem precisar de um botão "Salvar" separado.
"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAllPermissions, type PermissionKey } from "@/components/permissions-provider";

const PERMISSION_ITEMS: { key: PermissionKey; label: string; description: string }[] = [
  { key: "clinicalRecords", label: "Prontuário", description: "Registrar procedimentos realizados no paciente" },
  { key: "odontogram", label: "Odontograma", description: "Registrar a situação de cada dente" },
  {
    key: "clinicDocuments",
    label: "Atestados e receitas",
    description: "Emitir e excluir atestados, laudos, receitas e comparecimento",
  },
  { key: "catalog", label: "Catálogo", description: "Criar, editar e desativar serviços e produtos" },
  { key: "deletePatients", label: "Excluir pacientes", description: "Desativar o cadastro de um paciente" },
];

const roleColumnLabels: Record<"dentist" | "staff", string> = { dentist: "Dentista", staff: "Recepção" };

export function PermissionsPanel() {
  const { permissions, loading, reload } = useAllPermissions();
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(role: "dentist" | "staff", key: PermissionKey) {
    const id = `${role}:${key}`;
    const next = { ...permissions[role], [key]: !permissions[role][key] };
    setSaving(id);
    await fetch("/api/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, permissions: next }),
    });
    await reload();
    setSaving(null);
  }

  if (loading) {
    return <div className="skeleton h-56 rounded-xl" />;
  }

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
      <div className="px-5 py-4 border-b border-line flex items-start gap-2">
        <ShieldCheck size={16} className="text-blue mt-0.5 shrink-0" />
        <div>
          <h2 className="font-semibold text-ink text-sm">Permissões por papel</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            O que cada papel pode fazer, além do básico (agenda, pacientes, financeiro, vendas — liberado pra
            todo mundo). Administrador sempre tem acesso total, não aparece aqui.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint text-xs uppercase tracking-wide">
              <th className="px-5 py-2 font-medium">Ação</th>
              <th className="px-5 py-2 font-medium text-center">Dentista</th>
              <th className="px-5 py-2 font-medium text-center">Recepção</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ITEMS.map((item) => (
              <tr key={item.key} className="border-t border-line-soft">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink-muted">{item.description}</p>
                </td>
                {(["dentist", "staff"] as const).map((role) => {
                  const id = `${role}:${item.key}`;
                  const checked = permissions[role][item.key];
                  return (
                    <td key={role} className="px-5 py-3 text-center">
                      <button
                        onClick={() => toggle(role, item.key)}
                        disabled={saving === id}
                        aria-label={`${item.label} — ${roleColumnLabels[role]}`}
                        aria-pressed={checked}
                        className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-60 ${
                          checked ? "bg-blue" : "bg-neutral-soft"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            checked ? "translate-x-4" : ""
                          }`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
