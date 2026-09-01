// Página de IMPRESSÃO de um documento clínico (atestado, laudo,
// comparecimento ou receita). Fica FORA do grupo "(dashboard)" de
// propósito — não tem barra lateral nem topo, só o papel em si, do
// jeito que sai impresso ou salvo em PDF (Ctrl+P / botão Imprimir).
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { ClinicDocument, IPrescriptionItem } from "@/models/ClinicDocument";
import { PrintButton } from "@/components/print-button";

type Props = { params: Promise<{ id: string }> };

const TYPE_TITLES: Record<string, string> = {
  atestado: "Atestado Odontológico",
  laudo: "Laudo Odontológico",
  presenca: "Declaração de Comparecimento",
  receita: "Receituário",
};

export default async function PrintDocumentPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const doc = await ClinicDocument.findById(id)
    .populate("patient", "name cpf")
    .populate("dentist", "name cro")
    .lean();

  if (!doc) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient = doc.patient as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dentist = doc.dentist as any;
  const items = (doc.items ?? []) as IPrescriptionItem[];

  return (
    <div className="min-h-screen bg-porcelain print:bg-white flex flex-col items-center py-10 print:py-0">
      <PrintButton />

      <div className="print-doc w-full max-w-[210mm] bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none p-10 sm:p-14 print:p-[20mm] text-ink">
        {/* Cabeçalho da clínica — o mesmo em todos os tipos de documento */}
        <div className="text-center border-b border-line pb-6 mb-8">
          <p className="font-display text-xl font-semibold">ClinBox</p>
          <p className="text-sm text-ink-muted">Clínica Odontológica</p>
        </div>

        <h1 className="text-center font-display text-lg font-semibold uppercase tracking-wide mb-8">
          {TYPE_TITLES[doc.type]}
        </h1>

        <p className="text-sm text-ink-muted mb-6">
          <strong className="text-ink font-medium">Paciente:</strong> {patient?.name ?? "—"}
          {patient?.cpf ? ` · CPF ${patient.cpf}` : ""}
        </p>

        {doc.type === "receita" ? (
          items.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum medicamento informado.</p>
          ) : (
            <ol className="space-y-4 list-decimal list-inside">
              {items.map((it, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="font-medium">{it.medication}</span>
                  {it.dosage ? ` — ${it.dosage}` : ""}
                  {it.instructions && <p className="text-sm text-ink-muted ml-5 mt-0.5">{it.instructions}</p>}
                </li>
              ))}
            </ol>
          )
        ) : (
          <div className="space-y-4">
            <p className="leading-relaxed whitespace-pre-wrap">{doc.content}</p>
            {doc.type === "atestado" && (doc.daysOff || doc.cid) && (
              <p className="leading-relaxed">
                {doc.daysOff ? `Período de afastamento: ${doc.daysOff} dia${doc.daysOff > 1 ? "s" : ""}. ` : ""}
                {doc.cid ? `CID: ${doc.cid}.` : ""}
              </p>
            )}
            {doc.type === "presenca" && doc.visitDate && (
              <p className="leading-relaxed">
                Data/hora do atendimento: {new Date(doc.visitDate).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}

        {/* Rodapé: data de emissão e assinatura do profissional responsável */}
        <div className="pt-20 print:pt-16 text-center">
          <p className="text-sm text-ink-muted mb-10">
            {new Date(doc.issuedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <div className="inline-block border-t border-ink pt-1.5 px-10">
            <p className="font-medium">{dentist?.name ?? "—"}</p>
            {dentist?.cro && <p className="text-sm text-ink-muted">CRO {dentist.cro}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
