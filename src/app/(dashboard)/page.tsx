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
import { Sale } from "@/models/Sale";
import { getCombinedRevenue } from "@/lib/revenue";
import {
  Users,
  AlertTriangle,
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
    overdueCount,
    pendingPayments,
    receivedThisMonth,
    patientsWithBirthday,
    clinicSettings,
    recentSales,
    salesByMonth,
    topServices,
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
      // Qualquer consulta (não só as de hoje) que passou do horário e
      // continua Agendada/Confirmada — mesmo critério de
      // isAppointmentOverdue() em status-badge.tsx, refeito aqui como
      // query porque precisa contar mesmo o que não é de hoje.
      Appointment.countDocuments({
        status: { $in: ["agendado", "confirmado"] },
        end: { $lt: new Date() },
      }),
      Payment.find({ status: { $in: ["pendente", "atrasado"] } }).lean(),
      Payment.aggregate([
        { $match: { status: "pago", paidDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Patient.find({ active: true, birthDate: { $ne: null } }).select("name birthDate phone").lean(),
      getClinicSettings(),
      // Últimas vendas/cobranças deste mês — junta venda de balcão
      // (avulsa ou não) com cobrança lançada na ficha do paciente, que
      // sem isso não aparecia em lugar nenhum do painel (ver
      // src/lib/revenue.ts). Filtrado por mês pra bater com "Recebido
      // este mês" logo acima na mesma coluna, em vez de mostrar as N
      // mais recentes de qualquer época.
      getCombinedRevenue({ from: startOfMonth, limit: 6 }),
      Sale.aggregate([
        {
          $match: {
            status: { $ne: "cancelada" },
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$total" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Sale.aggregate([
        {
          $match: { status: { $ne: "cancelada" }, createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            total: { $sum: "$items.subtotal" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
    ]);

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const receivedTotal = receivedThisMonth[0]?.total ?? 0;

  const monthlySales = salesByMonth.map((entry) => {
    const month = new Date(entry._id.year, entry._id.month - 1, 1);
    return {
      label: month.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      total: entry.total,
    };
  });

  const maxMonthlySales = monthlySales.reduce((max, item) => Math.max(max, item.total), 0) || 1;
  const bestMonth = monthlySales.reduce(
    (best, item) => (item.total > best.total ? item : best),
    monthlySales[0] ?? { label: "—", total: 0 }
  );

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
    overdueCount,
    pendingCount: pendingPayments.length,
    pendingTotal,
    receivedTotal,
    birthdaysThisWeek,
    clinicName,
    recentSales,
    monthlySales,
    bestMonth,
    maxMonthlySales,
    topServices,
  };
}

export default async function DashboardHome() {
  const session = await auth();
  const {
    totalPatients,
    todayAppointments,
    tomorrowCount,
    tomorrowDentistsPhrase,
    overdueCount,
    pendingCount,
    pendingTotal,
    receivedTotal,
    birthdaysThisWeek,
    clinicName,
    recentSales,
    monthlySales,
    bestMonth,
    maxMonthlySales,
    topServices,
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
    <div className="space-y-5">
      <div className="fade-up relative overflow-hidden rounded-[24px] bg-surface p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] sm:p-6">
        <div aria-hidden className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-soft opacity-80 blur-3xl" />
        <div aria-hidden className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-brass-soft opacity-80 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              userId={userId}
              name={userName}
              size={56}
              tone="sidebar"
              version={userId || "guest"}
              className="ring-2 ring-surface-soft"
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">Painel da clínica</p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
                {greeting()}, {userName.split(" ")[0]}!
              </h1>
              <p className="mt-1 text-sm capitalize text-ink-muted">{todayLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
            <span className="rounded-full bg-surface-soft px-3 py-1.5">{todayAppointments.length} consultas hoje</span>
            <span className="rounded-full bg-surface-soft px-3 py-1.5">{pendingCount} pendências</span>
            <span className="rounded-full bg-surface-soft px-3 py-1.5">{currency(receivedTotal)} este mês</span>
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <p className="max-w-xl text-sm text-ink-muted/90 italic">{quote}</p>
          {tomorrowCount > 0 && (
            <Link
              href="/agenda"
              className="inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-1.5 text-sm text-ink hover:bg-line-soft"
            >
              Amanhã: {tomorrowCount} {tomorrowCount === 1 ? "consulta" : "consultas"}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {tomorrowCount > 0 && (
        <div className="fade-up flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm shadow-sm shadow-ink/[0.02]">
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

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction href="/pacientes/novo" icon={UserPlus} label="Novo paciente" />
        <QuickAction href="/agenda?novo=1" icon={CalendarPlus} label="Novo agendamento" />
        <QuickAction href="/servicos" icon={Stethoscope} label="Catálogo de serviços" />
        <QuickAction href="/financeiro" icon={Wallet} label="Financeiro" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Pacientes ativos" value={totalPatients} href="/pacientes" />
        <SummaryCard icon={CalendarClock} label="Consultas hoje" value={todayAppointments.length} href="/agenda" />
        <SummaryCard
          icon={AlertTriangle}
          label="Consultas atrasadas"
          value={overdueCount}
          detail={overdueCount > 0 ? "sem baixa" : undefined}
          href="/agenda"
          tone={overdueCount > 0 ? "warning" : "blue"}
        />
        <SummaryCard
          icon={Wallet}
          label="Pagamentos pendentes"
          value={pendingCount}
          detail={pendingCount > 0 ? currency(pendingTotal) : undefined}
          href="/financeiro"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.9fr)] xl:items-start">
        <div className="min-w-0 xl:col-span-1 space-y-3">
          <div className="overflow-hidden rounded-[20px] bg-surface shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">Agenda do dia</p>
                <h2 className="mt-1 text-[1.06rem] font-semibold text-ink">Consultas de hoje</h2>
              </div>
              <Link href="/agenda" className="flex items-center gap-1 text-sm text-blue hover:text-blue-strong hover:underline">
                Ver agenda completa <ArrowRight size={14} />
              </Link>
            </div>

            {todayAppointments.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-muted">Nenhuma consulta marcada para hoje.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {todayAppointments.map((appt) => {
                  const patient = appt.patient as { name?: string; phone?: string } | null | undefined;
                  const dentist = appt.dentist as { name?: string } | null | undefined;
                  return (
                    <li key={String(appt._id)} className="flex flex-col gap-3 px-5 py-3.5 text-sm transition hover:bg-surface-soft/80 sm:min-h-[64px] sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <PatientAvatar name={patient?.name ?? appt.patientName ?? "?"} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink">{patient?.name ?? appt.patientName ?? "Paciente"}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-ink-muted">
                            <span>com {dentist?.name ?? "—"}</span>
                            {appt.procedure && <span className="text-ink-faint">• {appt.procedure}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <p className="tabular text-ink">
                          {new Date(appt.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div className="mt-0 sm:mt-1.5">
                          <StatusBadge
                            status={appt.status}
                            overdue={isAppointmentOverdue({ status: appt.status, end: appt.end as string | Date })}
                          />
                        </div>
                        <div className="shrink-0">
                          <WhatsAppLink phone={patient?.phone} size={15} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="overflow-hidden rounded-[22px] bg-surface shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <Cake size={16} className="text-brass" />
              <h2 className="text-[0.96rem] font-semibold text-ink">Aniversários da semana</h2>
            </div>
            {birthdaysThisWeek.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-muted">Nenhum aniversário nos próximos dias.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {birthdaysThisWeek.map((b, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <span className="block truncate text-ink">{b.name}</span>
                      <span className="block text-[11px] text-ink-faint">
                        {b.daysAway === 0 ? "Hoje" : b.daysAway === 1 ? "Amanhã" : `em ${b.daysAway} dias`}
                      </span>
                    </div>
                    {b.phone &&
                      (b.daysAway === 0 ? (
                        <WhatsAppLink
                          phone={b.phone}
                          message={`Feliz aniversário, ${b.name.split(" ")[0]}! 🎉 Toda a equipe da ${clinicName} deseja um dia maravilhoso, cheio de saúde e sorrisos!`}
                          label="Parabéns"
                          className="shrink-0 !text-xs !py-1"
                        />
                      ) : (
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

        <div className="min-w-0 space-y-4 xl:col-span-1">
          <div className="h-full overflow-hidden rounded-[22px] bg-surface shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-3 leading-none">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Financeiro</p>
                <p className="font-display text-[2.05rem] font-semibold leading-none text-success tabular">{currency(receivedTotal)}</p>
              </div>
              <Link href="/vendas" className="inline-flex items-center gap-1 self-center text-[11px] text-blue hover:text-blue-strong hover:underline">
                Vendas <ArrowRight size={12} />
              </Link>
            </div>

            <div className="px-4 pb-2 pt-3">
              <div className="mb-3 rounded-2xl bg-surface-soft p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={12} className="text-ink-faint" />
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Vendas por mês</p>
                  </div>
                  <span className="text-[9px] font-medium text-ink-muted">Melhor: {bestMonth.label}</span>
                </div>

                <div className="flex h-24 items-end gap-2">
                  {monthlySales.map((item) => {
                    const height = Math.max(12, (item.total / maxMonthlySales) * 100);
                    return (
                      <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                        <div className="flex h-20 w-full items-end justify-center">
                          <div
                            className={`w-full rounded-t-[10px] ${item.label === bestMonth.label ? "bg-[linear-gradient(180deg,var(--blue-strong)_0%,var(--blue)_100%)]" : "bg-line"}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="text-[9px] uppercase tracking-[0.12em] text-ink-faint">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3 rounded-2xl bg-surface-soft p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Stethoscope size={12} className="text-ink-faint" />
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Procedimentos</p>
                </div>

                <ul className="space-y-2">
                  {topServices.map((service, index) => (
                    <li key={service._id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-soft text-[9px] font-semibold text-blue">
                          {index + 1}
                        </span>
                        <span className="truncate text-ink">{service._id}</span>
                      </div>
                      <span className="tabular text-ink-muted">{currency(service.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-2 flex items-center gap-1.5">
                <ShoppingBag size={12} className="text-ink-faint" />
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Últimas vendas</p>
              </div>

              {recentSales.length === 0 ? (
                <p className="py-3 text-sm text-ink-muted">Nenhuma venda neste mês ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {recentSales.map((s) => {
                    const cancelled = s.status === "cancelada";
                    const tone = cancelled ? "text-ink-faint" : s.status === "pago" ? "text-success" : "text-warning";
                    return (
                      <li key={`${s.kind}:${s._id}`} className="flex items-center gap-2 rounded-xl bg-surface-soft/70 px-2.5 py-2 text-sm">
                        <div className={`min-w-0 flex-1 ${cancelled ? "opacity-60" : ""}`}>
                          <p className={`truncate text-[13px] text-ink ${cancelled ? "line-through" : ""}`}>
                            {s.patientName ?? "Venda avulsa"}
                          </p>
                          <p className="truncate text-[11px] text-ink-faint">{s.description}</p>
                        </div>
                        <p className={`shrink-0 tabular text-[13px] font-medium ${tone}`}>{currency(s.total)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
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
      className="card-hover fade-up flex items-center gap-3 rounded-[16px] bg-surface px-3.5 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--blue)]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-soft text-blue">
        <Icon size={17} />
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
  tone = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  detail?: string;
  href: string;
  // "warning" chama atenção quando o número é ruim de ver alto (ex:
  // consultas atrasadas) — o padrão "blue" é neutro, sem julgamento.
  tone?: "blue" | "warning";
}) {
  const iconTone = tone === "warning" ? "bg-warning-soft text-warning" : "bg-blue-soft text-blue";
  return (
    <Link
      href={href}
      className="card-hover fade-up flex items-center gap-3.5 rounded-[18px] bg-surface p-4 shadow-[0_10px_18px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--blue)]"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${iconTone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-[1.8rem] font-semibold leading-none text-ink tabular">{value}</p>
          {detail && <p className="text-xs text-ink-faint tabular">{detail}</p>}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{label}</p>
      </div>
    </Link>
  );
}
