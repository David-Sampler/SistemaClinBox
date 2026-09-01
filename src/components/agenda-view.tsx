// Visão interativa da AGENDA: duas formas de ver as consultas — "Dia"
// (uma coluna por dentista) e "Semana" (uma coluna por dia, com as
// consultas de todos os dentistas juntas) — com navegação por
// dia/semana, criação de consulta num modal e um painel lateral para
// ver/alterar o status de uma consulta.
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { addDays, format, isSameDay, isToday, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge } from "@/components/status-badge";
import { PatientAvatar } from "@/components/patient-avatar";
import { UserAvatar } from "@/components/user-avatar";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Modal } from "@/components/modal";

type Appointment = {
  _id: string;
  start: string;
  end: string;
  status: string;
  procedure?: string;
  patient?: { _id: string; name: string; phone?: string };
  dentist?: { _id: string; name: string };
};

type Dentist = { id: string; name: string };
type View = "day" | "week";

// Faixa de horário exibida na grade e altura (em px) de cada hora.
const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_PX = 60;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_PX;

const STATUS_FLOW: { value: string; label: string }[] = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "concluido", label: "Concluído" },
  { value: "falta", label: "Faltou" },
  { value: "cancelado", label: "Cancelado" },
];

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

// Converte um horário (Date) na posição vertical (em px) dentro da grade.
function minutesToTop(date: Date) {
  const minutes = (date.getHours() - START_HOUR) * 60 + date.getMinutes();
  return (minutes / 60) * HOUR_PX;
}

// Distribui consultas que se sobrepõem em "raias" lado a lado (como o
// Google Calendar) — necessário na visão semanal, onde uma coluna de
// dia pode ter consultas de vários dentistas no mesmo horário.
function assignLanes(appts: Appointment[]) {
  const sorted = [...appts].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const laneEndTimes: number[] = [];
  const placed = sorted.map((appt) => {
    const start = new Date(appt.start).getTime();
    const end = new Date(appt.end).getTime();
    let lane = laneEndTimes.findIndex((endTime) => endTime <= start);
    if (lane === -1) {
      lane = laneEndTimes.length;
      laneEndTimes.push(end);
    } else {
      laneEndTimes[lane] = end;
    }
    return { appt, lane };
  });
  const laneCount = laneEndTimes.length || 1;
  return placed.map(({ appt, lane }) => ({ appt, lane, laneCount }));
}

export function AgendaView({
  dentists,
  patients,
}: {
  dentists: Dentist[];
  patients: { id: string; name: string }[];
}) {
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(todayISO());
  const [dentistFilter, setDentistFilter] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(date);
  const [formTime, setFormTime] = useState("");
  const [formDentist, setFormDentist] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, view, dentistFilter]);

  // Atualiza a linha de "agora" a cada minuto.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadAppointments() {
    setLoading(true);
    const rangeStart = view === "week" ? weekDays[0] : parseISO(date);
    const rangeEnd = view === "week" ? weekDays[6] : parseISO(date);
    const from = new Date(`${format(rangeStart, "yyyy-MM-dd")}T00:00:00`).toISOString();
    const to = new Date(`${format(rangeEnd, "yyyy-MM-dd")}T23:59:59`).toISOString();
    const params = new URLSearchParams({ from, to });
    if (dentistFilter) params.set("dentist", dentistFilter);

    const res = await fetch(`/api/appointments?${params.toString()}`);
    const data = await res.json();
    setAppointments(data.appointments ?? []);
    setLoading(false);
  }

  function openNewAppointment(opts?: { dayISO?: string; time?: string; dentistId?: string }) {
    setFormDate(opts?.dayISO ?? date);
    setFormTime(opts?.time ?? "");
    setFormDentist(opts?.dentistId ?? "");
    setShowForm(true);
  }

  // Converte onde a pessoa clicou na grade (posição vertical, em px) num
  // horário "redondo" (arredondado pros 15 min mais próximos) — é isso
  // que permite clicar num espaço vazio da agenda e já abrir o
  // formulário com o horário daquele lugar preenchido.
  function clickPositionToTime(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalMinutes = (offsetY / HOUR_PX) * 60;
    const snapped = Math.max(0, Math.min(Math.round(totalMinutes / 15) * 15, (END_HOUR - START_HOUR) * 60));
    const hour = START_HOUR + Math.floor(snapped / 60);
    const minute = snapped % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const day = form.get("date") as string;
    const time = form.get("time") as string;
    const durationMin = Number(form.get("duration") || 30);
    const start = new Date(`${day}T${time}:00`);
    const end = new Date(start.getTime() + durationMin * 60000);

    const payload = {
      patient: form.get("patient"),
      dentist: form.get("dentist"),
      start: start.toISOString(),
      end: end.toISOString(),
      procedure: form.get("procedure") || undefined,
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Não foi possível agendar.");
      return;
    }

    (e.target as HTMLFormElement).reset();
    setShowForm(false);
    loadAppointments();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSelected((s) => (s && s._id === id ? { ...s, status } : s));
    loadAppointments();
  }

  function goPrev() {
    setDate(format(addDays(parseISO(date), view === "week" ? -7 : -1), "yyyy-MM-dd"));
  }
  function goNext() {
    setDate(format(addDays(parseISO(date), view === "week" ? 7 : 1), "yyyy-MM-dd"));
  }

  // Colunas da visão "Dia": só o dentista selecionado, ou todos.
  const dayColumns = dentistFilter ? dentists.filter((d) => d.id === dentistFilter) : dentists;
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );
  const viewingToday = isToday(parseISO(date));
  const nowTop = minutesToTop(now);

  const periodLabel =
    view === "week"
      ? `${format(weekDays[0], "d MMM", { locale: ptBR })} – ${format(weekDays[6], "d MMM", { locale: ptBR })}`
      : format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* Barra de navegação: período + alternador de visão + filtro + ação principal */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1">
          <button
            onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-soft transition-colors"
            aria-label={view === "week" ? "Semana anterior" : "Dia anterior"}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setDate(todayISO())}
            className="px-2.5 h-8 text-xs font-medium rounded-md text-ink-muted hover:bg-surface-soft transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={goNext}
            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-soft transition-colors"
            aria-label={view === "week" ? "Próxima semana" : "Próximo dia"}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <p className="font-display text-lg font-semibold text-ink capitalize leading-tight">
          {periodLabel}
        </p>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm text-ink-muted bg-transparent border-none focus:outline-none cursor-pointer"
        />

        {/* Alternador Dia / Semana */}
        <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1">
          {(["day", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                view === v ? "bg-blue text-white" : "text-ink-muted hover:bg-surface-soft"
              }`}
            >
              {v === "day" ? "Dia" : "Semana"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={dentistFilter}
            onChange={(e) => setDentistFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Todos os dentistas</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button onClick={() => openNewAppointment()} className="btn-primary">
            <Plus size={16} /> Novo agendamento
          </button>
        </div>
      </div>

      {/* Grade de horários */}
      <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] overflow-hidden">
        {dentists.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">
            Nenhum dentista cadastrado ainda. Cadastre um em{" "}
            <span className="font-medium text-ink">Equipe</span> para usar a agenda.
          </p>
        ) : loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-10" style={{ width: `${85 - i * 6}%` }} />
            ))}
          </div>
        ) : (
          <div className="flex overflow-x-auto">
            {/* Coluna de horários */}
            <div className="w-14 shrink-0 sticky left-0 bg-surface z-10">
              <div className="h-11 border-b border-line" />
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {hours.map((h, i) => (
                  <span
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[11px] text-ink-faint tabular"
                    style={{ top: i * HOUR_PX }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>

            {view === "day" ? (
              <div className="flex flex-1 divide-x divide-line-soft min-w-0">
                {dayColumns.map((dentist) => {
                  const dentistAppointments = appointments.filter(
                    (a) => a.dentist?._id === dentist.id
                  );
                  return (
                    <div key={dentist.id} className="flex-1 min-w-[200px]">
                      <div className="h-11 border-b border-line flex items-center gap-2 px-3 sticky top-0 bg-surface z-10">
                        <UserAvatar userId={dentist.id} name={dentist.name} size={22} />
                        <span className="text-sm font-medium text-ink truncate">{dentist.name}</span>
                      </div>
                      <div
                        className="relative cursor-pointer"
                        style={{ height: GRID_HEIGHT }}
                        onClick={(e) =>
                          openNewAppointment({ time: clickPositionToTime(e), dentistId: dentist.id })
                        }
                      >
                        <HourLines hours={hours} />
                        {viewingToday && <NowLine top={nowTop} />}
                        {dentistAppointments.map((appt) => (
                          <AppointmentBlock key={appt._id} appt={appt} onClick={() => setSelected(appt)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 divide-x divide-line-soft min-w-0">
                {weekDays.map((day) => {
                  const dayISO = format(day, "yyyy-MM-dd");
                  const dayAppointments = appointments.filter((a) =>
                    isSameDay(new Date(a.start), day)
                  );
                  const lanes = assignLanes(dayAppointments);
                  const isTodayCol = isToday(day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={dayISO}
                      className={`flex-1 min-w-[150px] ${
                        isTodayCol ? "bg-blue-soft/30" : isWeekend ? "bg-surface-soft/60" : ""
                      }`}
                    >
                      <button
                        onClick={() => openNewAppointment({ dayISO })}
                        className="w-full h-11 border-b border-line flex flex-col items-center justify-center gap-0.5 sticky top-0 bg-surface z-10 hover:bg-surface-soft transition-colors"
                      >
                        <span className="text-[11px] text-ink-faint uppercase leading-none">
                          {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                        </span>
                        {isTodayCol ? (
                          <span className="w-5 h-5 rounded-full bg-blue text-white text-[12px] font-semibold flex items-center justify-center tabular leading-none">
                            {format(day, "d")}
                          </span>
                        ) : (
                          <span className="text-sm font-medium leading-tight tabular text-ink">
                            {format(day, "d")}
                          </span>
                        )}
                      </button>
                      <div
                        className="relative cursor-pointer"
                        style={{ height: GRID_HEIGHT }}
                        onClick={(e) => openNewAppointment({ dayISO, time: clickPositionToTime(e) })}
                      >
                        <HourLines hours={hours} />
                        {isTodayCol && <NowLine top={nowTop} />}
                        {lanes.map(({ appt, lane, laneCount }) => (
                          <AppointmentBlock
                            key={appt._id}
                            appt={appt}
                            onClick={() => setSelected(appt)}
                            lane={lane}
                            laneCount={laneCount}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: novo agendamento */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Novo agendamento">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Paciente">
              <select name="patient" required className="input">
                <option value="">Selecione...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dentista">
              <select name="dentist" required defaultValue={formDentist || dentistFilter} className="input">
                <option value="">Selecione...</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input name="date" type="date" required defaultValue={formDate} className="input" />
              </Field>
              <Field label="Horário">
                <input name="time" type="time" required defaultValue={formTime} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duração (min)">
                <input name="duration" type="number" min={10} step={5} defaultValue={30} className="input" />
              </Field>
              <Field label="Procedimento">
                <input name="procedure" className="input" placeholder="ex: Avaliação, Limpeza..." />
              </Field>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" className="w-full btn-primary">
              Agendar
            </button>
          </form>
        </Modal>
      )}

      {/* Painel lateral: detalhe/status de uma consulta selecionada */}
      {selected && (
        <SidePanel onClose={() => setSelected(null)}>
          <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Consulta</p>
          <div className="flex items-center gap-3 mb-4">
            <PatientAvatar name={selected.patient?.name ?? "?"} size={40} />
            <h3 className="font-display text-xl font-semibold text-ink flex-1">
              {selected.patient?.name ?? "Paciente"}
            </h3>
            <WhatsAppLink phone={selected.patient?.phone} size={17} />
          </div>

          <dl className="space-y-3 text-sm mb-6">
            {selected.patient?.phone && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Telefone</dt>
                <dd className="text-ink font-medium tabular">{selected.patient.phone}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-muted">Dentista</dt>
              <dd className="text-ink font-medium">{selected.dentist?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Horário</dt>
              <dd className="text-ink font-medium tabular">
                {new Date(selected.start).toLocaleDateString("pt-BR")}{" "}
                {new Date(selected.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(selected.end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </dd>
            </div>
            {selected.procedure && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Procedimento</dt>
                <dd className="text-ink font-medium">{selected.procedure}</dd>
              </div>
            )}
            <div className="flex justify-between items-center">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <StatusBadge status={selected.status} />
              </dd>
            </div>
          </dl>

          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Alterar status
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(selected._id, s.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selected.status === s.value
                    ? "bg-blue text-white border-blue"
                    : "bg-surface text-ink-muted border-line hover:border-blue/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </SidePanel>
      )}
    </div>
  );
}

// Linhas horizontais de cada hora, dentro de uma coluna da grade.
function HourLines({ hours }: { hours: number[] }) {
  return (
    <>
      {hours.map((h, i) => (
        <div key={h} className="absolute left-0 right-0 border-t border-line-soft" style={{ top: i * HOUR_PX }} />
      ))}
    </>
  );
}

// Linha vermelha marcando o horário atual, só aparece no dia de hoje.
function NowLine({ top }: { top: number }) {
  return (
    <div className="absolute left-0 right-0 flex items-center gap-1 z-20 pointer-events-none" style={{ top }}>
      <span className="w-1.5 h-1.5 rounded-full bg-danger -ml-0.5" />
      <span className="flex-1 border-t border-danger" />
    </div>
  );
}

function AppointmentBlock({
  appt,
  onClick,
  lane,
  laneCount,
  compact,
}: {
  appt: Appointment;
  onClick: () => void;
  lane?: number;
  laneCount?: number;
  compact?: boolean;
}) {
  const start = new Date(appt.start);
  const end = new Date(appt.end);
  const top = minutesToTop(start);
  const height = Math.max(((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_PX, 26);

  const palette: Record<string, string> = {
    agendado: "bg-neutral-soft border-ink-faint/30 text-ink-muted",
    confirmado: "bg-blue-soft border-blue/40 text-blue-strong",
    em_atendimento: "bg-brass-soft border-brass/40 text-brass",
    concluido: "bg-success-soft border-success/40 text-success",
    cancelado: "bg-danger-soft border-danger/30 text-ink-faint line-through",
    falta: "bg-danger-soft border-danger/40 text-danger",
  };

  // Quando há mais de uma consulta no mesmo horário (visão semanal com
  // vários dentistas), cada uma ocupa uma "raia" lado a lado.
  const usesLanes = laneCount !== undefined && laneCount > 1;
  const style: React.CSSProperties = usesLanes
    ? {
        top,
        height,
        left: `${((lane ?? 0) / laneCount!) * 100}%`,
        width: `${100 / laneCount!}%`,
      }
    : { top, height };

  return (
    <button
      onClick={(e) => {
        // Sem isso, clicar numa consulta existente também "vazaria" o
        // clique pra grade por trás, que abriria o formulário de nova
        // consulta ao mesmo tempo que o painel de detalhe.
        e.stopPropagation();
        onClick();
      }}
      style={style}
      className={`absolute z-10 hover:z-20 ${usesLanes ? "px-1" : "left-1 right-1 px-2"} py-1 rounded-md border-l-[3px] text-left overflow-hidden hover:brightness-95 hover:shadow-md hover:scale-[1.02] transition-[filter,box-shadow,transform] ${
        palette[appt.status] ?? palette.agendado
      }`}
    >
      <p className="text-[11px] font-semibold leading-tight truncate">
        {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        {!compact && ` · ${appt.patient?.name ?? "Paciente"}`}
      </p>
      {compact && (
        <p className="text-[11px] leading-tight truncate">{appt.patient?.name ?? "Paciente"}</p>
      )}
      {!compact && height > 34 && appt.procedure && (
        <p className="text-[11px] leading-tight truncate opacity-80">{appt.procedure}</p>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

function SidePanel({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="anim-slide-in-right relative w-full max-w-sm h-full bg-surface border-l border-line shadow-xl p-6 overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-soft transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
