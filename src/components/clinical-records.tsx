// PRONTUÁRIO / EVOLUÇÃO CLÍNICA: linha do tempo com os procedimentos
// já realizados no paciente, formulário para adicionar um novo registro,
// e edição/exclusão de registros existentes.
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Stethoscope, Trash2, X } from "lucide-react";
import { usePermission } from "@/components/permissions-provider";

type ClinicalRecord = {
  _id: string;
  date: string;
  tooth?: string;
  procedure: string;
  description?: string;
  dentist?: { _id: string; name: string };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

// Formulário compartilhado entre "novo registro" e "editar registro" —
// mesmos campos nos dois casos, só muda o que acontece ao salvar.
function RecordFields({ dentists, defaults }: { dentists: { id: string; name: string }[]; defaults?: Partial<ClinicalRecord> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">Dentista</label>
        <select name="dentist" required defaultValue={defaults?.dentist?._id ?? ""} className="input">
          <option value="">Selecione...</option>
          {dentists.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">Dente (opcional)</label>
        <input name="tooth" defaultValue={defaults?.tooth ?? ""} className="input" placeholder="ex: 26" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-ink-muted mb-1">Procedimento</label>
        <input
          name="procedure"
          required
          defaultValue={defaults?.procedure ?? ""}
          className="input"
          placeholder="ex: Restauração em resina"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-ink-muted mb-1">Descrição</label>
        <textarea name="description" rows={2} defaultValue={defaults?.description ?? ""} className="input" />
      </div>
    </div>
  );
}

// Modal de edição — mesmos campos do formulário de novo registro, mas
// já preenchidos, num modal separado (edita sem sair do lugar na lista).
function EditRecordModal({
  record,
  dentists,
  onClose,
  onSaved,
}: {
  record: ClinicalRecord;
  dentists: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (record: ClinicalRecord) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      dentist: form.get("dentist"),
      tooth: form.get("tooth") || undefined,
      procedure: form.get("procedure"),
      description: form.get("description") || undefined,
    };

    const res = await fetch(`/api/clinical-records/${record._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar as alterações.");
      return;
    }
    const data = await res.json();
    onSaved(data.record);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="anim-scale-in relative bg-surface rounded-xl border border-line shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Editar registro</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-soft"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <RecordFields dentists={dentists} defaults={record} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClinicalRecords({
  patientId,
  dentists,
}: {
  patientId: string;
  dentists: { id: string; name: string }[];
}) {
  // Prontuário é ação clínica — o admin decide em Equipe → Permissões
  // se a recepção (staff) pode registrar ou só acompanhar.
  const canManage = usePermission("clinicalRecords");
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ClinicalRecord | null>(null);

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadRecords() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/clinical-records`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      dentist: form.get("dentist"),
      tooth: form.get("tooth") || undefined,
      procedure: form.get("procedure"),
      description: form.get("description") || undefined,
    };

    const res = await fetch(`/api/patients/${patientId}/clinical-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      loadRecords();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este registro do prontuário? Essa ação não pode ser desfeita.")) return;
    setRecords((prev) => prev.filter((r) => r._id !== id));
    await fetch(`/api/clinical-records/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Histórico de procedimentos realizados</p>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue hover:underline"
          >
            <Plus size={14} /> Novo registro
          </button>
        )}
      </div>

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-surface-soft border border-line rounded-lg p-4 space-y-3">
          <RecordFields dentists={dentists} />
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Salvando..." : "Salvar registro"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <p className="text-sm text-ink-muted py-4">Nenhum registro clínico ainda.</p>
      ) : (
        <ul className="relative space-y-3 before:content-[''] before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-line">
          {records.map((r) => (
            <li key={r._id} className="group relative flex gap-3">
              {/* Marcador da linha do tempo */}
              <div className="relative z-10 w-10 h-10 rounded-full bg-blue-soft text-blue-strong flex items-center justify-center shrink-0 ring-4 ring-surface">
                <Stethoscope size={16} />
              </div>

              <div className="flex-1 min-w-0 border border-line rounded-lg p-4 bg-surface hover:border-blue/30 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ink">{r.procedure}</p>
                      {r.tooth && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-blue-soft border border-blue/30 text-blue-strong shrink-0">
                          Dente {r.tooth}
                        </span>
                      )}
                    </div>
                    {r.dentist?.name && <p className="text-xs text-ink-muted mt-0.5">Dr(a). {r.dentist.name}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <p className="text-xs text-ink-faint whitespace-nowrap">{formatDate(r.date)}</p>
                    {canManage && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(r)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-ink-faint hover:bg-surface-soft hover:text-ink"
                          aria-label="Editar registro"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger"
                          aria-label="Excluir registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {r.description && <p className="text-sm text-ink-muted mt-2.5">{r.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditRecordModal
          record={editing}
          dentists={dentists}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
