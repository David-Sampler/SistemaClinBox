// Badge (selo colorido) usado para mostrar o status de uma consulta,
// tanto no dashboard quanto na agenda.
const statusStyles: Record<string, string> = {
  agendado: "bg-neutral-soft text-ink-muted",
  confirmado: "bg-blue-soft text-blue-strong",
  em_atendimento: "bg-brass-soft text-brass",
  concluido: "bg-success-soft text-success",
  cancelado: "bg-danger-soft text-danger",
  falta: "bg-danger-soft text-danger",
};

const statusLabels: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  falta: "Faltou",
};

// Uma consulta está "atrasada" quando o horário de término já passou e
// ninguém deu baixa nela (continua Agendado/Confirmado). Não é um status
// salvo no banco — é derivado da hora atual — porque só quem estava no
// atendimento sabe se foi Concluída ou Falta; aqui a gente só sinaliza
// que está pendente de resolução.
export function isAppointmentOverdue(appt: { status: string; end: string | Date }): boolean {
  if (appt.status !== "agendado" && appt.status !== "confirmado") return false;
  return new Date(appt.end).getTime() < Date.now();
}

export function StatusBadge({ status, overdue = false }: { status: string; overdue?: boolean }) {
  if (overdue) {
    return (
      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning-soft text-warning">
        Atrasada
      </span>
    );
  }
  return (
    <span
      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        statusStyles[status] ?? "bg-neutral-soft text-ink-muted"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
