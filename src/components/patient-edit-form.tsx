// Formulário de EDIÇÃO dos dados cadastrais e da anamnese de um paciente
// já existente — é aqui que dá pra completar informações que faltaram no
// cadastro inicial (ex: preencheram só nome e telefone na correria da
// recepção, e depois o dentista completa a anamnese durante a consulta).
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCPF } from "@/lib/cpf";
import { formatPhone } from "@/lib/phone";

const CONDITION_ITEMS: { key: string; label: string }[] = [
  { key: "isPregnant", label: "Gestante" },
  { key: "isSmoker", label: "Fumante" },
  { key: "hasDiabetes", label: "Diabetes" },
  { key: "hasHypertension", label: "Pressão alta (hipertensão)" },
  { key: "hasHeartCondition", label: "Cardiopatia" },
  { key: "hasBleedingDisorder", label: "Problema de coagulação/sangramento" },
  { key: "hadAnesthesiaReaction", label: "Já teve reação a anestésico" },
];

type FieldErrors = Record<string, string[]>;

export type EditablePatient = {
  _id: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  phone: string;
  email?: string;
  healthInsurance?: string;
  emergencyContact?: { name?: string; phone?: string };
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  medicalHistory?: {
    allergies?: string;
    medications?: string;
    conditions?: string;
    notes?: string;
    isPregnant?: boolean;
    isSmoker?: boolean;
    hasDiabetes?: boolean;
    hasHypertension?: boolean;
    hasHeartCondition?: boolean;
    hasBleedingDisorder?: boolean;
    hadAnesthesiaReaction?: boolean;
  };
};

export function PatientEditForm({ patient }: { patient: EditablePatient }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState(patient.cpf ?? "");
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(patient.emergencyContact?.phone ?? "");

  const mh = patient.medicalHistory;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      cpf: form.get("cpf") || undefined,
      birthDate: form.get("birthDate") || undefined,
      gender: form.get("gender") || undefined,
      phone: form.get("phone"),
      email: form.get("email") || undefined,
      healthInsurance: form.get("healthInsurance") || undefined,
      emergencyContact: {
        name: form.get("emergencyName") || undefined,
        phone: form.get("emergencyPhone") || undefined,
      },
      address: {
        street: form.get("street") || undefined,
        number: form.get("number") || undefined,
        neighborhood: form.get("neighborhood") || undefined,
        city: form.get("city") || undefined,
        state: form.get("state") || undefined,
        zip: form.get("zip") || undefined,
      },
      medicalHistory: {
        allergies: form.get("allergies") || undefined,
        medications: form.get("medications") || undefined,
        conditions: form.get("conditions") || undefined,
        notes: form.get("notes") || undefined,
        ...Object.fromEntries(CONDITION_ITEMS.map((c) => [c.key, form.get(c.key) === "on"])),
      },
    };

    const res = await fetch(`/api/patients/${patient._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const flat = data.error?.fieldErrors as FieldErrors | undefined;
      if (flat) {
        setFieldErrors(flat);
        setError("Verifique os campos destacados abaixo.");
      } else {
        setError("Não foi possível salvar as alterações.");
      }
      return;
    }

    setSuccess(true);
    router.refresh(); // atualiza o cabeçalho da página (nome, telefone, idade...) com os novos dados
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <fieldset className="space-y-4">
        <legend className="font-semibold text-ink mb-1">Dados pessoais</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Nome completo"
            name="name"
            required
            defaultValue={patient.name}
            className="sm:col-span-2"
            error={fieldErrors.name}
          />
          <Field
            label="Telefone"
            name="phone"
            required
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={(v) => setPhone(formatPhone(v))}
            error={fieldErrors.phone}
          />
          <Field
            label="CPF"
            name="cpf"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(v) => setCpf(formatCPF(v))}
            error={fieldErrors.cpf}
          />
          <Field
            label="Data de nascimento"
            name="birthDate"
            type="date"
            defaultValue={patient.birthDate?.slice(0, 10)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Gênero</label>
            <select name="gender" defaultValue={patient.gender ?? ""} className="input">
              <option value="">Não informado</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <Field label="E-mail" name="email" type="email" defaultValue={patient.email} error={fieldErrors.email} />
          <Field label="Convênio" name="healthInsurance" defaultValue={patient.healthInsurance} />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line-soft pt-4">
        <legend className="font-semibold text-ink mb-1">Contato de emergência</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome" name="emergencyName" defaultValue={patient.emergencyContact?.name} />
          <Field
            label="Telefone"
            name="emergencyPhone"
            placeholder="(00) 00000-0000"
            value={emergencyPhone}
            onChange={(v) => setEmergencyPhone(formatPhone(v))}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line-soft pt-4">
        <legend className="font-semibold text-ink mb-1">Endereço</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Rua" name="street" defaultValue={patient.address?.street} className="sm:col-span-2" />
          <Field label="Número" name="number" defaultValue={patient.address?.number} />
          <Field label="Bairro" name="neighborhood" defaultValue={patient.address?.neighborhood} />
          <Field label="Cidade" name="city" defaultValue={patient.address?.city} />
          <Field label="Estado" name="state" defaultValue={patient.address?.state} placeholder="UF" />
          <Field label="CEP" name="zip" defaultValue={patient.address?.zip} placeholder="00000-000" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line-soft pt-4">
        <legend className="font-semibold text-ink mb-1">Histórico médico (anamnese)</legend>
        <div>
          <p className="text-sm font-medium text-ink mb-2">Condições relevantes para o atendimento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONDITION_ITEMS.map((c) => (
              <label
                key={c.key}
                className="flex items-center gap-2 text-sm text-ink-muted rounded-lg border border-line px-3 py-2 hover:bg-surface-soft cursor-pointer"
              >
                <input
                  type="checkbox"
                  name={c.key}
                  defaultChecked={Boolean(mh?.[c.key as keyof typeof mh])}
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
          <Field
            label="Outras condições de saúde"
            name="conditions"
            defaultValue={mh?.conditions}
            className="sm:col-span-2"
          />
          <Field label="Observações gerais" name="notes" defaultValue={mh?.notes} className="sm:col-span-2" />
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
          Dados salvos com sucesso.
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  max,
  className = "",
  value,
  onChange,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  max?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  error?: string[];
}) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        max={max}
        className={`input ${error?.length ? "border-danger focus:ring-danger/30" : ""}`}
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : { defaultValue })}
      />
      {error?.length ? <p className="text-xs text-danger mt-1">{error[0]}</p> : null}
    </div>
  );
}
