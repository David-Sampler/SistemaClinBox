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
  Mail,
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

  return (
    <div className="space-y-6">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={15} /> Pacientes
      </Link>

      {/* Cabeçalho: identidade do paciente + ações rápidas */}
      <div className="fade-up bg-surface rounded-2xl border border-line shadow-sm shadow-ink/[0.02] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <PatientAvatar name={patient.name} size={60} />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold text-ink truncate">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  {patient.phone}
                  <WhatsAppLink phone={patient.phone} size={13} />
                </span>
                {age !== null && <span>· {age} anos</span>}
                {patient.gender && <span>· {genderLabels[patient.gender] ?? patient.gender}</span>}
                {patient.healthInsurance && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-soft text-blue-strong">
                    {patient.healthInsurance}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/agenda" className="btn-secondary">
              <CalendarPlus size={15} /> Nova consulta
            </Link>
            <Link href="/vendas" className="btn-secondary">
              <ShoppingCart size={15} /> Registrar venda
            </Link>
            <Link href={`/pacientes/${id}?tab=dados`} className="btn-secondary">
              <Pencil size={15} /> Editar dados
            </Link>
          </div>
        </div>
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

      {/* Dados cadastrais, organizados por assunto em vez de uma lista única */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard icon={Mail} title="Contato">
          <InfoItem label="Telefone" value={patient.phone} />
          <InfoItem label="E-mail" value={patient.email} />
          <InfoItem label="Endereço" value={addressLine ?? undefined} icon={MapPin} />
        </InfoCard>

        <InfoCard icon={IdCard} title="Documento e convênio">
          <InfoItem label="CPF" value={patient.cpf} />
          <InfoItem
            label="Nascimento"
            value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : undefined}
          />
          <InfoItem label="Convênio" value={patient.healthInsurance} />
        </InfoCard>

        <InfoCard icon={ShieldPlus} title="Contato de emergência">
          {patient.emergencyContact?.phone ? (
            <InfoItem
              label={patient.emergencyContact.name || "Telefone"}
              value={patient.emergencyContact.phone}
              action={<WhatsAppLink phone={patient.emergencyContact.phone} size={13} />}
            />
          ) : (
            <p className="text-sm text-ink-faint">Não informado</p>
          )}
        </InfoCard>

        <InfoCard icon={Stethoscope} title="Anamnese resumida">
          <InfoItem label="Alergias" value={patient.medicalHistory?.allergies} />
          <InfoItem label="Medicamentos em uso" value={patient.medicalHistory?.medications} />
          <InfoItem label="Outras condições" value={patient.medicalHistory?.conditions} />
          <InfoItem label="Observações" value={patient.medicalHistory?.notes} />
        </InfoCard>
      </div>

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
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-5">
      <div className="flex items-center gap-2 mb-3.5">
        <Icon size={15} className="text-ink-faint" />
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
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
