// Página de AGENDA (server component): busca a lista de dentistas e pacientes
// no servidor (para preencher os seletores do formulário) e delega a parte
// interativa (ver consultas por dia, criar novo agendamento) para um client component.
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Patient } from "@/models/Patient";
import { AgendaView } from "@/components/agenda-view";

export default async function AgendaPage() {
  await connectDB();

  const [dentists, patients] = await Promise.all([
    User.find({ role: "dentist", active: true }).select("name").sort({ name: 1 }).lean(),
    Patient.find({ active: true }).select("name phone").sort({ name: 1 }).lean(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Agenda</h1>
        <p className="text-ink-muted">Consultas marcadas por dentista e por dia</p>
      </div>

      <AgendaView
        dentists={dentists.map((d) => ({ id: String(d._id), name: d.name }))}
        patients={patients.map((p) => ({ id: String(p._id), name: p.name }))}
      />
    </div>
  );
}
