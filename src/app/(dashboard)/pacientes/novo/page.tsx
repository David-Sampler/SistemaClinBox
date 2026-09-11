// Formulário de CADASTRO de um novo paciente.
"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { formatCPF } from "@/lib/cpf";
import { formatPhone } from "@/lib/phone";

type FieldErrors = Record<string, string[]>;

// useSearchParams precisa estar dentro de um <Suspense> (exigência do
// Next.js) — por isso o formulário fica num componente separado.
export default function NewPatientPage() {
  return (
    <Suspense>
      <NewPatientForm />
    </Suspense>
  );
}

function NewPatientForm() {
  const router = useRouter();
  // Vem preenchido quando o cadastro foi aberto a partir de uma consulta
  // marcada só com o nome (agenda → "Cadastrar", ver src/components/agenda-view.tsx)
  // — poupa a recepção de digitar o nome de novo.
  const prefilledName = useSearchParams().get("nome") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  // Aviso de "provável duplicata" (mesmo CPF ou nome parecido de um
  // paciente já cadastrado) devolvido pela API antes de criar de fato —
  // guarda o payload que tentou salvar pra poder reenviar com
  // confirmDuplicate:true se a pessoa confirmar que não é duplicata.
  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; patientId: string } | null>(null);
  const pendingPayloadRef = useRef<Record<string, unknown> | null>(null);

  async function submitPatient(payload: Record<string, unknown>) {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/pacientes/${data.patient._id}`);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.duplicate) {
      setDuplicateWarning({ message: data.error, patientId: data.duplicate.patient.id });
      return;
    }
    const flat = data.error?.fieldErrors as FieldErrors | undefined;
    if (flat) {
      setFieldErrors(flat);
      setError("Verifique os campos destacados abaixo.");
    } else {
      setError(typeof data.error === "string" ? data.error : "Não foi possível salvar o paciente. Verifique os campos.");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setDuplicateWarning(null);
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
      // A anamnese não entra mais aqui — vira o primeiro passo depois que
      // o paciente já está cadastrado, na aba "Anamnese" da própria ficha
      // (ver src/components/anamnesis-form.tsx). Isso deixa o cadastro
      // rápido pra quem está na recepção, sem travar em campos clínicos.
    };
    pendingPayloadRef.current = payload;

    await submitPatient(payload);
    setLoading(false);
  }

  async function handleConfirmDuplicate() {
    if (!pendingPayloadRef.current) return;
    setLoading(true);
    setError(null);
    await submitPatient({ ...pendingPayloadRef.current, confirmDuplicate: true });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Novo paciente</h1>
        <p className="text-ink-muted">Preencha os dados cadastrais — a anamnese é feita depois, na ficha do paciente</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-line p-6 space-y-6">
        <fieldset className="space-y-4">
          <legend className="font-semibold text-ink mb-1">Dados pessoais</legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Field
              label="Nome completo"
              name="name"
              required
              defaultValue={prefilledName}
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

        {error && (
          <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {duplicateWarning && (
          <div className="flex gap-2.5 rounded-lg border border-warning/20 bg-warning-soft px-3.5 py-3 text-sm text-warning">
            <AlertTriangle size={16} className="mt-px shrink-0" />
            <div className="space-y-2">
              <p>{duplicateWarning.message} Confira se não é a mesma pessoa antes de continuar.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/pacientes/${duplicateWarning.patientId}`}
                  className="font-medium underline underline-offset-2"
                >
                  Ver cadastro existente
                </Link>
                <button
                  type="button"
                  onClick={handleConfirmDuplicate}
                  disabled={loading}
                  className="font-medium underline underline-offset-2 disabled:opacity-60"
                >
                  Não é a mesma pessoa — cadastrar mesmo assim
                </button>
              </div>
            </div>
          </div>
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
        defaultValue={!controlled ? defaultValue : undefined}
        className={`input ${error?.length ? "border-danger focus:ring-danger/30" : ""}`}
        {...(controlled ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
      {error?.length ? <p className="text-xs text-danger mt-1">{error[0]}</p> : null}
    </div>
  );
}
