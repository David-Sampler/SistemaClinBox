// Página de IMPRESSÃO de um documento clínico (atestado, laudo,
// comparecimento ou receita). Fica FORA do grupo "(dashboard)" de
// propósito — não tem barra lateral nem topo, só o papel em si, do
// jeito que sai impresso ou salvo em PDF (Ctrl+P / botão Imprimir).
//
// O visual é um papel timbrado de verdade: barra de marca no topo,
// selo do tipo de documento (cor e ícone mudam conforme atestado/
// laudo/receita/comparecimento — mesma paleta usada na lista da aba
// "Atestados e receitas", pra ficar reconhecível), dados do paciente
// numa caixa própria, e um rodapé de autenticidade abaixo da assinatura.
import { notFound } from "next/navigation";
import { CalendarCheck, ClipboardCheck, FileSearch, Pill } from "lucide-react";
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

// Mesma paleta de cores da lista de documentos (src/components/clinic-documents.tsx),
// só que em tom sólido — pra combinar visualmente na hora de imprimir.
const TYPE_ACCENT: Record<string, { badge: string; icon: React.ElementType }> = {
  atestado: { badge: "bg-warning-soft text-warning border-warning/20", icon: ClipboardCheck },
  laudo: { badge: "bg-tooth-plum-soft text-tooth-plum border-tooth-plum/20", icon: FileSearch },
  presenca: { badge: "bg-blue-soft text-blue-strong border-blue/20", icon: CalendarCheck },
  receita: { badge: "bg-success-soft text-success border-success/20", icon: Pill },
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
  const accent = TYPE_ACCENT[doc.type] ?? TYPE_ACCENT.laudo;
  const TypeIcon = accent.icon;
  const issuedAt = new Date(doc.issuedAt);

  return (
    <div className="min-h-screen bg-porcelain print:bg-white flex flex-col items-center py-10 print:py-0">
      <PrintButton />

      <div className="print-doc relative w-full max-w-[210mm] bg-white shadow-lg print:shadow-none rounded-lg print:rounded-none text-ink overflow-hidden">
        {/* Barra de marca — identidade fixa do papel, em qualquer tipo de documento */}
        <div className="h-2.5 bg-gradient-to-r from-[#1f6fb0] to-[#00203f] print:h-2" />

        <div className="p-10 sm:p-14 print:p-[18mm] print:pt-[10mm]">
          {/* Cabeçalho: logo + nome da clínica */}
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-line">
            <span
              className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-display font-semibold text-lg shrink-0"
              style={{ background: "linear-gradient(155deg, #1f6fb0, #00203f)" }}
            >
              C
            </span>
            <div>
              <p className="font-display text-xl font-semibold leading-tight">ClinBox</p>
              <p className="text-xs text-ink-muted">Clínica Odontológica</p>
            </div>
          </div>

          {/* Selo do tipo de documento + título */}
          <div className="flex flex-col items-center text-center gap-2.5 mb-6">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${accent.badge}`}>
              <TypeIcon size={13} />
              {TYPE_TITLES[doc.type]}
            </span>
            <h1 className="font-display text-2xl font-semibold uppercase tracking-wide">{TYPE_TITLES[doc.type]}</h1>
          </div>

          {/* Dados do paciente numa caixa própria, em vez de uma frase corrida */}
          <div className="bg-surface-soft border border-line rounded-xl px-5 py-3.5 mb-6">
            <p className="text-[10px] text-ink-faint uppercase tracking-wide">Paciente</p>
            <p className="font-medium text-ink">{patient?.name ?? "—"}</p>
            {patient?.cpf && <p className="text-xs text-ink-muted mt-0.5">CPF {patient.cpf}</p>}
          </div>

          {/* Corpo do documento */}
          <div>
            {doc.type === "receita" ? (
              items.length === 0 ? (
                <p className="text-sm text-ink-muted">Nenhum medicamento informado.</p>
              ) : (
                <ol className="space-y-5">
                  {items.map((it, i) => (
                    <li key={i} className="flex gap-3 leading-relaxed">
                      <span className="font-display font-semibold text-blue-strong shrink-0">{i + 1}.</span>
                      <div>
                        <span className="font-medium">{it.medication}</span>
                        {it.dosage ? <span className="text-ink-muted"> — {it.dosage}</span> : ""}
                        {it.instructions && <p className="text-sm text-ink-muted mt-0.5">{it.instructions}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )
            ) : (
              <div className="space-y-4">
                <p className="leading-loose whitespace-pre-wrap">{doc.content}</p>
                {doc.type === "atestado" && (doc.daysOff || doc.cid) && (
                  <p className="leading-relaxed font-medium">
                    {doc.daysOff ? `Período de afastamento: ${doc.daysOff} dia${doc.daysOff > 1 ? "s" : ""}. ` : ""}
                    {doc.cid ? `CID: ${doc.cid}.` : ""}
                  </p>
                )}
                {doc.type === "presenca" && doc.visitDate && (
                  <p className="leading-relaxed font-medium">
                    Data/hora do atendimento: {new Date(doc.visitDate).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            )}
          </div>

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

        {/* Rodapé de autenticidade — id do documento + quando foi gerado,
            discreto, só pra dar rastreabilidade a quem recebe o papel. */}
        <div className="border-t border-line-soft px-10 sm:px-14 print:px-[18mm] py-3 text-center">
          <p className="text-[10px] text-ink-faint tracking-wide">
            Documento emitido pelo ClinBox em {issuedAt.toLocaleDateString("pt-BR")} às{" "}
            {issuedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · Nº {String(doc._id)}
          </p>
        </div>
      </div>
    </div>
  );
}
