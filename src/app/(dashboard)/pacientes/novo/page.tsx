// Formulário de CADASTRO de um novo paciente.
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCPF } from "@/lib/cpf";
import { formatPhone } from "@/lib/phone";

// Itens do checklist de anamnese — condições que mudam a forma como o
// dentista conduz o atendimento (anestesia, sangramento, cicatrização).
// Cada um vira um campo boolean em medicalHistory (veja src/models/Patient.ts).
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

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    // FormData lê todos os campos do formulário pelo atributo "name" de cada input
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

    const res = await fetch("/api/patients", {
      method: "POST",
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
        setError("Não foi possível salvar o paciente. Verifique os campos.");
      }
      return;
    }

    const data = await res.json();
    router.push(`/pacientes/${data.patient._id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Novo paciente</h1>
        <p className="text-ink-muted">Preencha os dados cadastrais e o histórico médico</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-line p-6 space-y-6">
        <fieldset className="space-y-4">
          <legend className="font-semibold text-ink mb-1">Dados pessoais</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Field
              label="Nome completo"
              name="name"
              required
              className="sm:col-span-2 lg:col-span-3 xl:col-span-4"
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
              max={new Date().toISOString().slice(0, 10)}
            />
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Gênero</label>
              <select name="gender" className="input">
                <option value="">Não informado</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <Field label="E-mail" name="email" type="email" error={fieldErrors.email} />
            <Field label="Convênio" name="healthInsurance" />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-line-soft pt-4">
          <legend className="font-semibold text-ink mb-1">Contato de emergência</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome" name="emergencyName" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Field label="Rua" name="street" className="sm:col-span-2 lg:col-span-3 xl:col-span-2" />
            <Field label="Número" name="number" />
            <Field label="Bairro" name="neighborhood" />
            <Field label="Cidade" name="city" />
            <Field label="Estado" name="state" placeholder="UF" />
            <Field label="CEP" name="zip" placeholder="00000-000" />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-line-soft pt-4">
          <legend className="font-semibold text-ink mb-1">Histórico médico (anamnese)</legend>

          <div>
            <p className="text-sm font-medium text-ink mb-2">Condições relevantes para o atendimento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {CONDITION_ITEMS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 text-sm text-ink-muted rounded-lg border border-line px-3 py-2 hover:bg-surface-soft cursor-pointer"
                >
                  <input type="checkbox" name={c.key} className="accent-blue" />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Alergias" name="allergies" />
            <Field label="Medicamentos em uso" name="medications" />
            <Field label="Outras condições de saúde" name="conditions" className="sm:col-span-2" />
            <Field label="Observações gerais" name="notes" className="sm:col-span-2" />
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Salvando..." : "Salvar paciente"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Campo de formulário reutilizável, para não repetir o mesmo bloco de label+input várias vezes.
// Aceita `value`/`onChange` opcionais pra permitir formatação ao vivo (CPF, telefone) sem
// deixar de ser um campo "não controlado" comum quando não precisa disso.
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
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
      {error?.length ? <p className="text-xs text-danger mt-1">{error[0]}</p> : null}
    </div>
  );
}
