// Página INICIAL do painel (rota "/"): a primeira coisa que a equipe vê
// ao entrar — por isso reúne um resumo do dia (consultas, financeiro),
// atalhos pras ações mais comuns e um lembrete de aniversários da semana.
// É um server component: busca os dados direto no banco (mais rápido,
// não precisa passar pela API HTTP já que já estamos no servidor).
import Link from "next/link";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { getCombinedRevenue } from "@/lib/revenue";
import {
  Users,
  CalendarDays,
  CalendarClock,
  Wallet,
  ArrowRight,
  UserPlus,
  CalendarPlus,
  Stethoscope,
  Cake,
  ShoppingBag,
} from "lucide-react";
import { brazilDayBounds, brazilHour, brazilMonthStart, brazilNow } from "@/lib/timezone";
import { getClinicSettings } from "@/models/ClinicSettings";
import { StatusBadge, isAppointmentOverdue } from "@/components/status-badge";
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
  const hour = brazilHour();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Aniversariantes de hoje até os próximos 6 dias — compara só mês/dia
// (não o ano), então funciona mesmo virando o ano no meio da janela.
// Usa getters/setters UTC de propósito: "today" vem de brazilNow(), que
// codifica o dia de Brasília nos campos UTC do Date (ver
// src/lib/timezone.ts) — ler com os getters LOCAIS aqui misturaria o
// fuso do servidor de novo e desfaria a correção.
function daysUntilBirthday(birthDate: Date, today: Date, windowDays: number) {
  for (let i = 0; i <= windowDays; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    if (d.getUTCMonth() === birthDate.getUTCMonth() && d.getUTCDate() === birthDate.getUTCDate()) {
      return i;
    }
  }
  return null;
}

// Junta os nomes dos dentistas numa frase curta: "com Ana", "com Ana e
// João", "com Ana, João e mais 2".
function dentistsPhrase(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `com ${names[0]}`;
  if (names.length === 2) return `com ${names[0]} e ${names[1]}`;
  return `com ${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}

async function getDashboardData() {
  await connectDB();

  const { startOfDay, endOfDay } = brazilDayBounds();
  // Amanhã em Brasília: desloca a referência 24h (o Brasil não tem mais
  // horário de verão, então +24h é sempre o dia seguinte do calendário).
  const tomorrow = brazilDayBounds(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const startOfMonth = brazilMonthStart();

  const [
    totalPatients,
    todayAppointments,
    tomorrowAppointments,
    pendingPayments,
    receivedThisMonth,
    patientsWithBirthday,
    clinicSettings,
    recentSales,
  ] =
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
      Appointment.find({
        start: { $gte: tomorrow.startOfDay, $lte: tomorrow.endOfDay },
        status: { $nin: ["cancelado"] },
      })
        .populate("dentist", "name")
        .sort({ start: 1 })
        .lean(),
      Payment.find({ status: { $in: ["pendente", "atrasado"] } }).lean(),
      Payment.aggregate([
        { $match: { status: "pago", paidDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Patient.find({ active: true, birthDate: { $ne: null } }).select("name birthDate phone").lean(),
      getClinicSettings(),
      // Últimas vendas/cobranças — junta venda de balcão (avulsa ou não)
      // com cobrança lançada na ficha do paciente, que sem isso não
      // aparecia em lugar nenhum do painel (ver src/lib/revenue.ts).
      getCombinedRevenue({ limit: 6 }),
    ]);

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const receivedTotal = receivedThisMonth[0]?.total ?? 0;

  // Mesmo critério do papel timbrado (ClinicLetterhead): "Minha Clínica"
  // é o valor padrão de quem nunca abriu Configurações — nesse caso a
  // mensagem de parabéns usa um texto genérico em vez do nome de banco de dados.
  const clinicName =
    clinicSettings.name && clinicSettings.name !== "Minha Clínica" ? clinicSettings.name : "nossa equipe";

  const todayForBirthdays = brazilNow();
  const birthdaysThisWeek = patientsWithBirthday
    .map((p) => ({
      name: p.name,
      phone: p.phone as string | undefined,
      daysAway: p.birthDate ? daysUntilBirthday(new Date(p.birthDate), todayForBirthdays, 6) : null,
    }))
    .filter((p): p is { name: string; phone: string | undefined; daysAway: number } => p.daysAway !== null)
    .sort((a, b) => a.daysAway - b.daysAway);

  const tomorrowDentists = [
    ...new Set(
      tomorrowAppointments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a) => (a.dentist as any)?.name as string | undefined)
        .filter((n): n is string => !!n)
    ),
  ];

  return {
    totalPatients,
    todayAppointments,
    tomorrowCount: tomorrowAppointments.length,
    tomorrowDentistsPhrase: dentistsPhrase(tomorrowDentists),
    pendingCount: pendingPayments.length,
    pendingTotal,
    receivedTotal,
    birthdaysThisWeek,
    clinicName,
    recentSales,
  };
}

export default async function DashboardHome() {
  const session = await auth();
  const {
    totalPatients,
    todayAppointments,
    tomorrowCount,
    tomorrowDentistsPhrase,
    pendingCount,
    pendingTotal,
    receivedTotal,
    birthdaysThisWeek,
    clinicName,
    recentSales,
  } = await getDashboardData();

  const userName = session?.user?.name ?? "Usuário";
  const userId = session?.user?.id ?? "";
  // "timeZone" explícito: funciona certo não importa o fuso configurado
  // no processo do servidor (ver src/lib/timezone.ts pro porquê disso importar).
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
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

      {/* Aviso discreto: consultas marcadas para amanhã — só um lembrete
          pra equipe conferir a agenda com antecedência. Some quando não há
          nada marcado. */}
      {tomorrowCount > 0 && (
        <div className="fade-up flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm shadow-sm shadow-ink/[0.02]">
          <CalendarClock size={16} className="shrink-0 text-blue" />
          <p className="flex-1 text-ink-muted">
            <span className="font-medium text-ink">Amanhã</span> há {tomorrowCount}{" "}
            {tomorrowCount === 1 ? "consulta" : "consultas"}
            {tomorrowDentistsPhrase && ` ${tomorrowDentistsPhrase}`}. Vale conferir a agenda.
          </p>
          <Link
            href="/agenda"
            className="shrink-0 flex items-center gap-1 text-blue hover:text-blue-strong hover:underline"
          >
            Ver <ArrowRight size={13} />
          </Link>
        </div>
      )}

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
                    <PatientAvatar name={patient?.name ?? appt.patientName ?? "?"} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{patient?.name ?? appt.patientName ?? "Paciente"}</p>
                      <p className="text-ink-muted truncate">com {dentist?.name ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-ink tabular">
                        {new Date(appt.start).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <StatusBadge
                        status={appt.status}
                        overdue={isAppointmentOverdue({ status: appt.status, end: appt.end as string | Date })}
                      />
                    </div>
                    <WhatsAppLink phone={patient?.phone} size={14} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Coluna lateral: financeiro do mês (+ últimas vendas logo
            embaixo, no mesmo card) e aniversariantes */}
        <div className="space-y-4">
          {/* Recebido este mês + últimas vendas, um do lado do outro no
              mesmo card — junta venda de balcão (Sale) e cobrança lançada
              na ficha do paciente (Payment). Ver src/lib/revenue.ts. Lista
              propositalmente discreta (sem avatar, sem selo cheio — só a
              cor do valor indica o status), já que mora numa coluna
              estreita ao lado de "Consultas de hoje". */}
          <div className="fade-up bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
            <div className="px-5 py-4 border-b border-line flex items-end justify-between">
              <div>
                <p className="text-ink-faint text-xs uppercase tracking-wide">Recebido este mês</p>
                <p className="font-display text-2xl font-semibold text-success tabular mt-1">
                  {currency(receivedTotal)}
                </p>
              </div>
              <Link
                href="/vendas"
                className="mb-0.5 shrink-0 text-xs text-blue hover:text-blue-strong hover:underline flex items-center gap-1"
              >
                Vendas <ArrowRight size={12} />
              </Link>
            </div>

            <div className="px-5 pt-3 pb-1 flex items-center gap-1.5">
              <ShoppingBag size={12} className="text-ink-faint" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Últimas vendas</p>
            </div>

            {recentSales.length === 0 ? (
              <p className="px-5 pt-1 pb-4 text-sm text-ink-muted">Nenhuma venda registrada ainda.</p>
            ) : (
              <ul className="pb-1">
                {recentSales.map((s) => {
                  const cancelled = s.status === "cancelada";
                  const tone = cancelled ? "text-ink-faint" : s.status === "pago" ? "text-success" : "text-warning";
                  return (
                    <li key={`${s.kind}:${s._id}`} className="px-5 py-1.5 flex items-center gap-2 text-sm">
                      <div className={`min-w-0 flex-1 ${cancelled ? "opacity-60" : ""}`}>
                        <p className={`text-ink truncate text-[13px] ${cancelled ? "line-through" : ""}`}>
                          {s.patientName ?? "Venda avulsa"}
                        </p>
                        <p className="text-ink-faint text-xs truncate">{s.description}</p>
                      </div>
                      <p className={`tabular text-[13px] font-medium shrink-0 ${tone}`}>{currency(s.total)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
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
                  <li key={i} className="px-5 py-2.5 flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <span className="text-ink truncate">{b.name}</span>
                      <span className="block text-ink-faint text-xs">
                        {b.daysAway === 0 ? "Hoje" : b.daysAway === 1 ? "Amanhã" : `em ${b.daysAway} dias`}
                      </span>
                    </div>
                    {b.phone &&
                      (b.daysAway === 0 ? (
                        // No dia: botão em destaque com o texto de parabéns.
                        <WhatsAppLink
                          phone={b.phone}
                          message={`Feliz aniversário, ${b.name.split(" ")[0]}! 🎉 Toda a equipe da ${clinicName} deseja um dia maravilhoso, cheio de saúde e sorrisos!`}
                          label="Parabéns"
                          className="shrink-0 !text-xs !py-1"
                        />
                      ) : (
                        // Nos próximos dias: só o ícone, já com a mensagem
                        // pronta pra quem quiser adiantar os parabéns.
                        <WhatsAppLink
                          phone={b.phone}
                          message={`Oi, ${b.name.split(" ")[0]}! Passando para desejar um feliz aniversário! 🎉 Toda a equipe da ${clinicName} deseja um dia maravilhoso, cheio de saúde e sorrisos!`}
                          size={14}
                          className="shrink-0"
                        />
                      ))}
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
