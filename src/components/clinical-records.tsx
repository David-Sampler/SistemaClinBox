// PRONTUÁRIO / EVOLUÇÃO CLÍNICA: linha do tempo com os procedimentos
// já realizados no paciente, e formulário para adicionar um novo registro.
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";

type ClinicalRecord = {
  _id: string;
  date: string;
  tooth?: string;
  procedure: string;
  description?: string;
  dentist?: { name: string };
};

export function ClinicalRecords({
  patientId,
  dentists,
}: {
  patientId: string;
  dentists: { id: string; name: string }[];
}) {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Histórico de procedimentos realizados</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-sm text-blue hover:underline"
        >
          <Plus size={14} /> Novo registro
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-soft border border-line rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Dentista</label>
              <select
                name="dentist"
                required
                className="input"
              >
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
              <input
                name="tooth"
                className="input"
                placeholder="ex: 26"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink-muted mb-1">Procedimento</label>
              <input
                name="procedure"
                required
                className="input"
                placeholder="ex: Restauração em resina"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink-muted mb-1">Descrição</label>
              <textarea
                name="description"
                rows={2}
                className="input"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Salvando..." : "Salvar registro"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted py-4">Carregando...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-ink-muted py-4">Nenhum registro clínico ainda.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r._id} className="border border-line rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-ink">
                  {r.procedure} {r.tooth ? `· dente ${r.tooth}` : ""}
                </p>
                <p className="text-ink-faint">
                  {new Date(r.date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <p className="text-sm text-ink-muted mt-1">
                {r.dentist?.name ? `Dr(a). ${r.dentist.name}` : ""}
              </p>
              {r.description && <p className="text-sm text-ink-muted mt-2">{r.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
