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

export function StatusBadge({ status }: { status: string }) {
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
