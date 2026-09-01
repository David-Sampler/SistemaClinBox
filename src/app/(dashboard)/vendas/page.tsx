// Página de VENDAS: o "checkout" da clínica — escolhe (opcionalmente)
// um paciente, adiciona serviços e/ou produtos do catálogo, e finaliza
// a venda. Busca a lista de pacientes no servidor; o resto (catálogo,
// carrinho) é interativo, então fica no client component.
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { VendaView } from "@/components/venda-view";

export default async function VendasPage() {
  await connectDB();
  const patients = await Patient.find({ active: true }).select("name").sort({ name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Vendas</h1>
        <p className="text-ink-muted">Registre a venda de serviços e produtos</p>
      </div>

      <VendaView patients={patients.map((p) => ({ id: String(p._id), name: p.name }))} />
    </div>
  );
}
