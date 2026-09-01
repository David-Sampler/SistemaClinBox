// Página INICIAL do painel (rota "/"): a primeira coisa que a equipe vê
// ao entrar — por isso reúne um resumo do dia (consultas, financeiro),
// atalhos pras ações mais comuns e um lembrete de aniversários da semana.
// É um server component: busca os dados direto no banco (mais rápido,
// não precisa passar pela API HTTP já que já estamos no servidor).
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import {
  Users,
  CalendarDays,
  Wallet,
  ArrowRight,
  UserPlus,
  CalendarPlus,
  Stethoscope,
  Cake,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { PatientAvatar } from "@/components/patient-avatar";
import { WhatsAppLink } from "@/components/whatsapp-link";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Frases curtas pra equipe, uma diferente a cada vez que a tela é
// aberta — bem discretas, só um empurrãozinho no canto da tela de
// boas-vindas, sem chamar mais atenção que os números do dia.
const MOTIVATIONAL_QUOTES = [
  "Cada paciente bem atendido é uma indicação garantida.",
  "Um sorriso cuidado hoje evita uma dor de cabeça amanhã.",
  "Excelência é feita de detalhes, consulta após consulta.",
  "O cuidado que você oferece hoje é lembrado por anos.",
  "Prevenção salva sorrisos — e economiza tratamentos.",
  "Cada consulta é uma chance de fazer a diferença.",
  "Confiança se constrói consulta após consulta.",
  "Organização na clínica é mais tempo pra cuidar de gente.",
];

function randomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Aniversariantes de hoje até os próximos 6 dias — compara só mês/dia
// (não o ano), então funciona mesmo virando o ano no meio da janela.
function daysUntilBirthday(birthDate: Date, today: Date, windowDays: number) {
  for (let i = 0; i <= windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getMonth() === birthDate.getMonth() && d.getDate() === birthDate.getDate()) {
      return i;
    }
  }
  return null;
}

async function getDashboardData() {
  await connectDB();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalPatients, todayAppointments, pendingPayments, receivedThisMonth, patientsWithBirthday] =
    await Promise.all([
      Patient.countDocuments({ active: true }),
      Appointment.find({
        start: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["cancelado"] },
      })
        .populate("patient", "name phone")
        .populate("dentist", "name")
        .sort({ start: 1 })
        .lean(),
      Payment.find({ status: { $in: ["pendente", "atrasado"] } }).lean(),
      Payment.aggregate([
        { $match: { status: "pago", paidDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Patient.find({ active: true, birthDate: { $ne: null } }).select("name birthDate").lean(),
    ]);

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const receivedTotal = receivedThisMonth[0]?.total ?? 0;

  const todayForBirthdays = new Date();
  todayForBirthdays.setHours(0, 0, 0, 0);
  const birthdaysThisWeek = patientsWithBirthday
    .map((p) => ({
      name: p.name,
      daysAway: p.birthDate ? daysUntilBirthday(new Date(p.birthDate), todayForBirthdays, 6) : null,
    }))
    .filter((p): p is { name: string; daysAway: number } => p.daysAway !== null)
    .sort((a, b) => a.daysAway - b.daysAway);

  return {
    totalPatients,
    todayAppointments,
    pendingCount: pendingPayments.length,
    pendingTotal,
    receivedTotal,
    birthdaysThisWeek,
  };
}

export default async function DashboardHome() {
  const session = await auth();
  const {
    totalPatients,
    todayAppointments,
    pendingCount,
    pendingTotal,
    receivedTotal,
    birthdaysThisWeek,
  } = await getDashboardData();

  const userName = session?.user?.name ?? "Usuário";
  const userId = session?.user?.id ?? "";
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const quote = randomQuote();

  return (
    <div className="space-y-8">
      {/* Boas-vindas — a primeira coisa que a equipe vê ao entrar */}
      <div className="fade-up relative overflow-hidden rounded-2xl bg-sidebar p-6 sm:p-8">
        <div
          aria-hidden
          className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-blue-soft/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-10 bottom-0 w-56 h-56 rounded-full bg-brass/10 blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          {/* version=Date.now(): essa página é renderizada de novo no
              servidor a cada visita (usa a sessão), então isso gera uma
              URL sempre nova — sem depender de nenhuma regra de cache
              do navegador pra mostrar a foto mais recente aqui. */}
          <UserAvatar userId={userId} name={userName} size={56} tone="sidebar" version={Date.now()} className="ring-2 ring-white/15" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-sidebar-heading">
              {greeting()}, {userName.split(" ")[0]}
            </h1>
            <p className="text-sidebar-text-muted text-sm capitalize">{todayLabel}</p>
          </div>
        </div>
        {/* Frase motivacional — discreta, canto inferior, some em telas pequenas */}
        <p className="relative hidden sm:block mt-6 text-xs text-sidebar-text-muted/70 italic">
          {quote}
        </p>
      </div>

      {/* Atalhos para as ações mais comuns do dia a dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction href="/pacientes/novo" icon={UserPlus} label="Novo paciente" />
        <QuickAction href="/agenda" icon={CalendarPlus} label="Novo agendamento" />
        <QuickAction href="/servicos" icon={Stethoscope} label="Catálogo de serviços" />
      </div>

      {/* Cards com números resumidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Users} label="Pacientes ativos" value={totalPatients} href="/pacientes" />
        <SummaryCard
          icon={CalendarDays}
          label="Consultas hoje"
          value={todayAppointments.length}
          href="/agenda"
        />
        <SummaryCard
          icon={Wallet}
          label="Pagamentos pendentes"
          value={pendingCount}
          detail={pendingCount > 0 ? currency(pendingTotal) : undefined}
          href="/financeiro"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Lista das consultas de hoje */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-semibold text-ink">Consultas de hoje</h2>
            <Link
              href="/agenda"
              className="text-sm text-blue hover:text-blue-strong hover:underline flex items-center gap-1"
            >
              Ver agenda completa <ArrowRight size={14} />
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">
              Nenhuma consulta marcada para hoje.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {todayAppointments.map((appt) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const patient = appt.patient as any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dentist = appt.dentist as any;
                return (
                  <li key={String(appt._id)} className="px-5 py-3 flex items-center gap-3 text-sm">
                    <PatientAvatar name={patient?.name ?? "?"} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{patient?.name ?? "Paciente"}</p>
                      <p className="text-ink-muted truncate">com {dentist?.name ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-ink tabular">
                        {new Date(appt.start).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <WhatsAppLink phone={patient?.phone} size={14} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Coluna lateral: financeiro do mês + aniversariantes */}
        <div className="space-y-4">
          <div className="fade-up bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-5">
            <p className="text-ink-faint text-xs uppercase tracking-wide">Recebido este mês</p>
            <p className="font-display text-2xl font-semibold text-success tabular mt-1">
              {currency(receivedTotal)}
            </p>
          </div>

          <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
            <div className="px-5 py-4 border-b border-line flex items-center gap-2">
              <Cake size={16} className="text-brass" />
              <h2 className="font-semibold text-ink text-sm">Aniversários da semana</h2>
            </div>
            {birthdaysThisWeek.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-muted">
                Nenhum aniversário nos próximos dias.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {birthdaysThisWeek.map((b, i) => (
                  <li key={i} className="px-5 py-2.5 flex items-center justify-between text-sm">
                    <span className="text-ink">{b.name}</span>
                    <span className="text-ink-faint text-xs">
                      {b.daysAway === 0 ? "Hoje" : b.daysAway === 1 ? "Amanhã" : `em ${b.daysAway} dias`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card-hover fade-up flex items-center gap-3 bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] px-4 py-3.5 hover:border-blue/40"
    >
      <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-soft text-blue flex items-center justify-center">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-ink">{label}</span>
    </Link>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  detail?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card-hover fade-up bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-5 flex items-center gap-4 hover:border-blue/40"
    >
      <div className="w-11 h-11 shrink-0 rounded-lg bg-blue-soft text-blue flex items-center justify-center">
        <Icon size={22} />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-2xl font-semibold text-ink tabular">{value}</p>
          {detail && <p className="text-xs text-ink-faint tabular">{detail}</p>}
        </div>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </Link>
  );
}
