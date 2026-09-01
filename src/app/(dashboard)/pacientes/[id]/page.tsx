// Página de DETALHE de um paciente: cabeçalho com resumo e atalhos,
// indicadores rápidos (próxima consulta, financeiro) e abas de
// prontuário/odontograma/documentos/financeiro/dados. Busca os dados
// iniciais no servidor e delega a parte interativa (abas) para um client
// component.
//
// O layout segue o padrão de prontuário eletrônico usado por sistemas
// odontológicos maiores (iClinic, Clinicorp, Dentrix): cabeçalho com
// ações rápidas, uma faixa de indicadores (é a primeira coisa que a
// recepção/dentista precisa saber: tem consulta marcada? tem pendência
// financeira?), alertas de saúde em destaque, e só depois os dados
// cadastrais completos, organizados por assunto em vez de uma lista única.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarPlus,
  ShoppingCart,
  Pencil,
  CalendarClock,
  History,
  Wallet,
  CircleCheck,
  MapPin,
  IdCard,
  ShieldPlus,
  Stethoscope,
} from "lucide-react";
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { PatientTabs } from "@/components/patient-tabs";
import { PatientAvatar } from "@/components/patient-avatar";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { PrintPageButton } from "@/components/print-page-button";
import { DeactivatePatientButton } from "@/components/deactivate-patient-button";

type Props = { params: Promise<{ id: string }> };

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const genderLabels: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", outro: "Outro" };

// Calcula a idade a partir da data de nascimento — só mais um jeito
// rápido de "ler" o paciente sem precisar fazer conta de cabeça.
// Retorna null pra data no futuro (cadastro com erro de digitação) em
// vez de uma "idade" negativa sem sentido na tela.
function calculateAge(birthDate: Date) {
  const today = new Date();
  if (birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

// Junta as partes do endereço numa única linha legível, pulando o que
// não foi preenchido — evita "Rua , 12,  - -" quando falta algum campo.
function formatAddress(addr?: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}) {
  if (!addr) return null;
  const line1 = [addr.street, addr.number].filter(Boolean).join(", ");
  const line2 = [addr.neighborhood, addr.city && addr.state ? `${addr.city}/${addr.state}` : addr.city].filter(Boolean).join(" — ");
  const full = [line1, line2, addr.zip].filter(Boolean).join(" · ");
  return full || null;
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const now = new Date();
  const objectId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

  const [patient, dentists, nextAppointment, lastAppointment, paymentsByStatus] = await Promise.all([
    Patient.findById(id).lean(),
    User.find({ role: "dentist", active: true }).select("name").lean(),
    Appointment.findOne({ patient: id, start: { $gte: now }, status: { $nin: ["cancelado"] } })
      .sort({ start: 1 })
      .populate("dentist", "name")
      .lean(),
    Appointment.findOne({ patient: id, start: { $lt: now }, status: { $nin: ["cancelado"] } })
      .sort({ start: -1 })
      .populate("dentist", "name")
      .lean(),
    objectId
      ? Payment.aggregate([
          { $match: { patient: objectId } },
          { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  if (!patient) notFound();

  const age = patient.birthDate ? calculateAge(new Date(patient.birthDate)) : null;

  const pendingTotal = paymentsByStatus
    .filter((p) => p._id === "pendente" || p._id === "atrasado")
    .reduce((sum, p) => sum + p.total, 0);
  const pendingCount = paymentsByStatus
    .filter((p) => p._id === "pendente" || p._id === "atrasado")
    .reduce((sum, p) => sum + p.count, 0);
  const paidTotal = paymentsByStatus.find((p) => p._id === "pago")?.total ?? 0;

  // Condições marcadas no checklist de anamnese que merecem destaque
  // logo no topo da ficha — o dentista precisa ver isso antes de tratar,
  // não só se abrir a aba "Dados e anamnese".
  const mh = patient.medicalHistory;
  const healthAlerts = [
    mh?.isPregnant && "Gestante",
    mh?.isSmoker && "Fumante",
    mh?.hasDiabetes && "Diabetes",
    mh?.hasHypertension && "Pressão alta",
    mh?.hasHeartCondition && "Cardiopatia",
    mh?.hasBleedingDisorder && "Problema de coagulação",
    mh?.hadAnesthesiaReaction && "Reação a anestésico",
  ].filter((v): v is string => Boolean(v));

  const addressLine = formatAddress(patient.address);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextDentistName = (nextAppointment?.dentist as any)?.name as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastDentistName = (lastAppointment?.dentist as any)?.name as string | undefined;

  // O "#patient-tabs" no final faz o navegador rolar até as abas — sem
  // isso, clicar em "Editar dados" trocava a aba certinho por baixo dos
  // panos, mas como as abas ficam mais abaixo na página (depois dos
  // cartões e indicadores), na prática parecia que "não acontecia nada".
  const editHref = `/pacientes/${id}?tab=dados#patient-tabs`;

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={15} /> Pacientes
        </Link>

        <div className="flex flex-wrap gap-2">
          <PrintPageButton />
          <Link href="/agenda" className="btn-secondary">
            <CalendarPlus size={15} /> Nova consulta
          </Link>
          <Link href="/vendas" className="btn-secondary">
            <ShoppingCart size={15} /> Registrar venda
          </Link>
          <Link href={editHref} className="btn-primary">
            <Pencil size={15} /> Editar dados
          </Link>
          <DeactivatePatientButton patientId={id} patientName={patient.name} />
        </div>
      </div>

      {healthAlerts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-warning-soft border border-warning/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-warning shrink-0" />
          {healthAlerts.map((label) => (
            <span key={label} className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-warning">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Identidade, dados gerais e anamnese lado a lado — cada cartão com
          seu próprio atalho de edição, igual a prontuários eletrônicos de
          mercado (a foto/contato nunca fica longe do lápis de editar). */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="fade-up bg-surface rounded-2xl border border-line shadow-sm shadow-ink/[0.02] p-5 flex flex-col items-center text-center gap-1">
          <Link
            href={editHref}
            className="print:hidden self-end -mt-1 -mr-1 text-ink-faint hover:text-blue transition-colors"
            aria-label="Editar dados"
          >
            <Pencil size={14} />
          </Link>
          <PatientAvatar name={patient.name} size={72} className="text-xl" />
          <h1 className="font-display text-lg font-semibold text-ink mt-2">{patient.name}</h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            {patient.phone}
            <WhatsAppLink phone={patient.phone} size={13} />
          </p>
          {patient.email && <p className="text-sm text-ink-muted truncate max-w-full">{patient.email}</p>}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            {age !== null && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-soft text-ink-muted">{age} anos</span>
            )}
            {patient.gender && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-soft text-ink-muted">
                {genderLabels[patient.gender] ?? patient.gender}
              </span>
            )}
            {patient.healthInsurance && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-soft text-blue-strong">
                {patient.healthInsurance}
              </span>
            )}
          </div>
        </div>

        <InfoCard icon={IdCard} title="Informações gerais" editHref={editHref}>
          <InfoItem label="CPF" value={patient.cpf} />
          <InfoItem
            label="Nascimento"
            value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : undefined}
          />
          <InfoItem label="Endereço" value={addressLine ?? undefined} icon={MapPin} />
          {patient.emergencyContact?.phone ? (
            <InfoItem
              label={`Emergência: ${patient.emergencyContact.name || "contato"}`}
              value={patient.emergencyContact.phone}
              icon={ShieldPlus}
              action={<WhatsAppLink phone={patient.emergencyContact.phone} size={13} />}
            />
          ) : (
            <InfoItem label="Contato de emergência" icon={ShieldPlus} />
          )}
        </InfoCard>

        <InfoCard icon={Stethoscope} title="Anamnese" editHref={editHref}>
          <InfoItem label="Alergias" value={patient.medicalHistory?.allergies} />
          <InfoItem label="Medicamentos em uso" value={patient.medicalHistory?.medications} />
          <InfoItem label="Outras condições" value={patient.medicalHistory?.conditions} />
          <InfoItem label="Observações" value={patient.medicalHistory?.notes} />
        </InfoCard>
      </div>

      {/* Indicadores rápidos: o que qualquer sistema clínico de verdade mostra
          logo de cara — tem consulta marcada? quando foi a última vez? tem
          pendência financeira? */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CalendarClock}
          label="Próxima consulta"
          value={
            nextAppointment
              ? new Date(nextAppointment.start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
              : "—"
          }
          detail={
            nextAppointment
              ? `${new Date(nextAppointment.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${nextDentistName ?? "—"}`
              : "Nenhuma agendada"
          }
        />
        <StatCard
          icon={History}
          label="Última visita"
          value={
            lastAppointment
              ? new Date(lastAppointment.start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
              : "—"
          }
          detail={lastAppointment ? lastDentistName ?? "—" : "Sem histórico"}
        />
        <StatCard
          icon={Wallet}
          label="Pendências"
          value={pendingCount > 0 ? currency(pendingTotal) : "R$ 0,00"}
          detail={pendingCount > 0 ? `${pendingCount} cobrança${pendingCount > 1 ? "s" : ""}` : "Em dia"}
          tone={pendingCount > 0 ? "warning" : "success"}
        />
        <StatCard icon={CircleCheck} label="Total pago" value={currency(paidTotal)} detail="Histórico completo" tone="success" />
      </div>

      <div id="patient-tabs" />
      <PatientTabs
        patientId={String(patient._id)}
        dentists={dentists.map((d) => ({ id: String(d._id), name: d.name }))}
        patient={{
          _id: String(patient._id),
          name: patient.name,
          cpf: patient.cpf,
          birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString() : undefined,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          healthInsurance: patient.healthInsurance,
          emergencyContact: patient.emergencyContact,
          medicalHistory: patient.medicalHistory,
          address: patient.address,
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone?: "warning" | "success";
}) {
  const toneClass =
    tone === "warning" ? "bg-warning-soft text-warning" : tone === "success" ? "bg-success-soft text-success" : "bg-blue-soft text-blue";
  return (
    <div className="fade-up bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneClass} mb-2.5`}>
        <Icon size={16} />
      </div>
      <p className="font-display text-lg font-semibold text-ink tabular leading-tight">{value}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
      <p className="text-xs text-ink-faint mt-1.5 truncate">{detail}</p>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  editHref,
  children,
}: {
  icon: React.ElementType;
  title: string;
  editHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fade-up bg-surface rounded-2xl border border-line shadow-sm shadow-ink/[0.02] p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-ink-faint" />
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </div>
        {editHref && (
          <Link href={editHref} className="print:hidden text-ink-faint hover:text-blue transition-colors" aria-label={`Editar ${title}`}>
            <Pencil size={14} />
          </Link>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
  action,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <div className="min-w-0">
        <p className="text-ink-faint text-xs uppercase tracking-wide">{label}</p>
        <p className="text-ink inline-flex items-center gap-1.5">
          {Icon && <Icon size={13} className="text-ink-faint shrink-0" />}
          {value || "—"}
        </p>
      </div>
      {action}
    </div>
  );
}
