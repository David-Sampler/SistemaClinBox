// Página de IMPRESSÃO de um orçamento — mesmo espírito da impressão de
// atestado/receita (src/app/documentos/[id]/imprimir/page.tsx): fica
// FORA do grupo "(dashboard)" de propósito, sem barra lateral, só o
// papel em si, pronto pra imprimir ou salvar como PDF (Ctrl+P) e mandar
// pro paciente. Reaproveita o mesmo cabeçalho com a logo da clínica.
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, Clock } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Budget } from "@/models/Budget";
import { getClinicBranding } from "@/lib/clinic-branding";
import { PrintButton } from "@/components/print-button";
import { ClinicLetterhead, ClinicWatermark } from "@/components/clinic-letterhead";

type Props = { params: Promise<{ id: string }> };

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_ACCENT: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  pendente: { label: "Aguardando aprovação", badge: "bg-neutral-soft text-ink-muted border-line", icon: Clock },
  aprovado: { label: "Aprovado", badge: "bg-success-soft text-success border-success/20", icon: CircleCheck },
  rejeitado: { label: "Rejeitado", badge: "bg-danger-soft text-danger border-danger/20", icon: CircleX },
};

export default async function PrintBudgetPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const branding = await getClinicBranding();

  const budget = await Budget.findById(id)
    .populate("patient", "name cpf phone")
    .populate("dentist", "name cro")
    .lean();

  if (!budget) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient = budget.patient as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dentist = budget.dentist as any;
  const accent = STATUS_ACCENT[budget.status] ?? STATUS_ACCENT.pendente;
  const StatusIcon = accent.icon;
  const issuedAt = new Date(budget.createdAt);

  return (
    <div className="min-h-screen bg-porcelain print:bg-white flex flex-col items-center py-10 print:py-0">
      <PrintButton />

      <div className="print-doc relative w-full max-w-[210mm] bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none text-ink overflow-hidden">
        <div className="h-2.5 bg-gradient-to-r from-[#1f6fb0] to-[#00203f] print:h-2" />

        <div className="p-10 sm:p-14 print:p-[18mm] print:pt-[10mm] relative">
          <ClinicWatermark logoDataUri={branding.logoDataUri} />

          <div className="relative z-10">
          <ClinicLetterhead name={branding.name} logoDataUri={branding.logoDataUri} />

          {/* Selo de status + título */}
          <div className="flex flex-col items-center text-center gap-2.5 mb-6">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${accent.badge}`}>
              <StatusIcon size={13} />
              {accent.label}
            </span>
            <h1 className="font-display text-2xl font-semibold uppercase tracking-wide">Orçamento Odontológico</h1>
          </div>

          {/* Dados do paciente */}
          <div className="bg-surface-soft border border-line rounded-xl px-5 py-3.5 mb-6">
            <p className="text-[10px] text-ink-faint uppercase tracking-wide">Paciente</p>
            <p className="font-medium text-ink">{patient?.name ?? "—"}</p>
            {patient?.cpf && <p className="text-xs text-ink-muted mt-0.5">CPF {patient.cpf}</p>}
          </div>

          {/* Itens do orçamento — "table-fixed" + <colgroup> de propósito:
              sem largura de coluna EXPLÍCITA (não só no cabeçalho), o
              mecanismo de impressão podia calcular a largura da coluna
              "Dente" de um jeito no cabeçalho e de outro nas linhas,
              desalinhando os números na hora de virar PDF. */}
          <table className="w-full table-fixed text-sm border-collapse mb-4">
            <colgroup>
              <col />
              <col style={{ width: "70px" }} />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-ink/10 text-left text-xs text-ink-faint uppercase tracking-wide">
                <th className="pb-2 font-medium">Procedimento</th>
                <th className="pb-2 font-medium text-center">Dente</th>
                <th className="pb-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {budget.items.map((item, i) => (
                <tr key={i} className="border-b border-line-soft">
                  <td className="py-2.5 pr-2">{item.description}</td>
                  <td className="py-2.5 text-center text-ink-muted">{item.tooth || "—"}</td>
                  <td className="py-2.5 text-right tabular">{currency(item.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-3 text-right font-medium">
                  Total
                </td>
                <td className="pt-3 text-right font-display text-lg font-semibold tabular">{currency(budget.total)}</td>
              </tr>
            </tfoot>
          </table>

          {budget.notes && (
            <p className="text-sm text-ink-muted leading-relaxed bg-surface-soft border border-line rounded-lg px-4 py-3 mb-2">
              {budget.notes}
            </p>
          )}

          <p className="text-[11px] text-ink-faint mt-4">
            Orçamento sujeito a alteração conforme avaliação clínica atualizada. Valores válidos por 30 dias a partir da
            data de emissão.
          </p>

          {/* Assinatura */}
          <div className="pt-10 print:pt-8 text-center">
            <p className="text-sm text-ink-muted mb-8">
              {issuedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <div className="inline-block border-t border-ink pt-1.5 px-10">
              <p className="font-medium">{dentist?.name ?? "—"}</p>
              {dentist?.cro && <p className="text-sm text-ink-muted">CRO {dentist.cro}</p>}
            </div>
          </div>
          </div>
        </div>

        <div className="border-t border-line-soft px-10 sm:px-14 print:px-[18mm] py-3 text-center">
          <p className="text-[10px] text-ink-faint tracking-wide">
            Orçamento emitido pelo ClinBox em {issuedAt.toLocaleDateString("pt-BR")} às{" "}
            {issuedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · Nº {String(budget._id)}
          </p>
        </div>
      </div>
    </div>
  );
}
