// Círculo colorido com a inicial do nome do paciente — usado em toda
// lista/cartão que mostra um paciente (Pacientes, ficha do paciente,
// agenda, financeiro), pra dar identidade visual imediata, como
// qualquer CRM/prontuário eletrônico moderno faz.
// A cor é sempre a mesma para o mesmo nome (não muda a cada render) —
// ver src/lib/palette.ts.
import { colorFor } from "@/lib/palette";

export function PatientAvatar({
  name,
  size = 36,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const { bg, text } = colorFor(name);

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${bg} ${text} ${className}`}
    >
      {initial}
    </div>
  );
}
