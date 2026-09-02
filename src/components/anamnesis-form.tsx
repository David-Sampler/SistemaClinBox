// Formulário da ANAMNESE de um paciente — separado do cadastro (dados
// pessoais/endereço) porque muitas vezes quem cadastra na recepção não é
// quem vai preencher a anamnese (isso acontece na cadeira, com o
// dentista). Fica na sua própria aba "Anamnese" na ficha do paciente.
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CONDITION_ITEMS, type MedicalHistory } from "@/lib/anamnesis";

export function AnamnesisForm({
  patientId,
  medicalHistory,
}: {
  patientId: string;
  medicalHistory?: MedicalHistory;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const mh = medicalHistory;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    // Manda só "medicalHistory" — a rota de PUT aceita atualização parcial
    // (patientSchema.partial()), então isso não mexe em nome/telefone/
    // endereço já cadastrados, só substitui a anamnese inteira.
    const payload = {
      medicalHistory: {
        allergies: form.get("allergies") || undefined,
        medications: form.get("medications") || undefined,
        conditions: form.get("conditions") || undefined,
        notes: form.get("notes") || undefined,
        ...Object.fromEntries(CONDITION_ITEMS.map((c) => [c.key, form.get(c.key) === "on"])),
      },
    };

    const res = await fetch(`/api/patients/${patientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Não foi possível salvar a anamnese.");
      return;
    }

    setSuccess(true);
    // Atualiza o resumo de anamnese mostrado nos cartões acima das abas
    // e o alerta de saúde no topo da ficha (gestante, diabetes...).
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm font-medium text-ink mb-2">Condições relevantes para o atendimento</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CONDITION_ITEMS.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-2 text-sm text-ink-muted rounded-lg border border-line px-3 py-2 hover:bg-surface-soft cursor-pointer"
            >
              <input
                type="checkbox"
                name={c.key}
                defaultChecked={Boolean(mh?.[c.key as keyof MedicalHistory])}
                className="accent-blue"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Alergias" name="allergies" defaultValue={mh?.allergies} />
        <Field label="Medicamentos em uso" name="medications" defaultValue={mh?.medications} />
        <Field label="Outras condições de saúde" name="conditions" defaultValue={mh?.conditions} className="sm:col-span-2" />
        <Field label="Observações gerais" name="notes" defaultValue={mh?.notes} className="sm:col-span-2" />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
          Anamnese salva com sucesso.
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar anamnese"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  className = "",
  defaultValue,
}: {
  label: string;
  name: string;
  className?: string;
  defaultValue?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <input name={name} defaultValue={defaultValue} className="input" />
    </div>
  );
}
