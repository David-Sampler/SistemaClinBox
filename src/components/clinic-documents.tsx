// Aba de DOCUMENTOS CLÍNICOS de um paciente: emitir atestado, laudo,
// declaração de comparecimento ou receita, e reimprimir os que já foram
// emitidos antes. Cada tipo tem um texto inicial pronto (o dentista só
// ajusta o que for preciso antes de imprimir).
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Printer, Trash2, X } from "lucide-react";

type DocType = "atestado" | "laudo" | "presenca" | "receita";

type PrescriptionItem = { medication: string; dosage: string; instructions: string };

type ClinicDoc = {
  _id: string;
  type: DocType;
  content?: string;
  daysOff?: number;
  cid?: string;
  visitDate?: string;
  items?: PrescriptionItem[];
  issuedAt: string;
  dentist?: { _id: string; name: string; cro?: string };
};

const TYPE_LABELS: Record<DocType, string> = {
  atestado: "Atestado",
  laudo: "Laudo",
  presenca: "Comparecimento",
  receita: "Receita",
};

const TYPE_STYLES: Record<DocType, string> = {
  atestado: "bg-warning-soft text-warning",
  laudo: "bg-tooth-plum-soft text-tooth-plum",
  presenca: "bg-blue-soft text-blue-strong",
  receita: "bg-success-soft text-success",
};

// Texto inicial de cada tipo de documento — já com o nome do paciente
// no lugar certo, pra economizar digitação. O dentista pode editar
// livremente antes de emitir.
function templateFor(type: DocType, patientName: string): string {
  const today = new Date().toLocaleDateString("pt-BR");
  switch (type) {
    case "atestado":
      return `Atesto para os devidos fins que o(a) paciente ${patientName} esteve sob meus cuidados odontológicos nesta data, necessitando de afastamento de suas atividades pelo período abaixo indicado.`;
    case "laudo":
      return `Laudo odontológico referente ao(à) paciente ${patientName}, emitido em ${today}.\n\nDescrição clínica:\n`;
    case "presenca":
      return `Declaro para os devidos fins que o(a) paciente ${patientName} compareceu a esta clínica odontológica na data e horário abaixo indicados para atendimento odontológico.`;
    case "receita":
      return "";
  }
}

export function ClinicDocuments({
  patientId,
  patientName,
  dentists,
}: {
  patientId: string;
  patientName: string;
  dentists: { id: string; name: string }[];
}) {
  const [documents, setDocuments] = useState<ClinicDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<DocType>("atestado");
  const [content, setContent] = useState(templateFor("atestado", patientName));
  const [items, setItems] = useState<PrescriptionItem[]>([{ medication: "", dosage: "", instructions: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadDocuments() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/documents`);
    const data = await res.json();
    setDocuments(data.documents ?? []);
    setLoading(false);
  }

  function changeType(t: DocType) {
    setType(t);
    setContent(templateFor(t, patientName));
  }

  function updateItem(index: number, field: keyof PrescriptionItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { medication: "", dosage: "", instructions: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      patient: patientId,
      dentist: form.get("dentist"),
      type,
    };

    if (type === "receita") {
      payload.items = items
        .filter((it) => it.medication.trim())
        .map((it) => ({ medication: it.medication, dosage: it.dosage || undefined, instructions: it.instructions || undefined }));
    } else {
      payload.content = content;
      if (type === "atestado") {
        payload.daysOff = form.get("daysOff") ? Number(form.get("daysOff")) : undefined;
        payload.cid = form.get("cid") || undefined;
      }
      if (type === "presenca") {
        payload.visitDate = form.get("visitDate") || undefined;
      }
    }

    setSubmitting(true);
    const res = await fetch(`/api/patients/${patientId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível emitir o documento.");
      return;
    }

    const data = await res.json();
    setShowForm(false);
    setItems([{ medication: "", dosage: "", instructions: "" }]);
    loadDocuments();
    // abre a impressão do documento recém-emitido direto numa nova aba
    window.open(`/documentos/${data.document._id}/imprimir`, "_blank");
  }

  async function handleDelete(id: string) {
    setDocuments((prev) => prev.filter((d) => d._id !== id));
    await fetch(`/api/clinic-documents/${id}`, { method: "DELETE" });
  }

  const typeOptions = useMemo(() => (Object.keys(TYPE_LABELS) as DocType[]), []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Atestados, laudos, comparecimento e receitas emitidos para este paciente.</p>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancelar" : "Novo documento"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-soft border border-line rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {typeOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={`px-3 h-8 text-xs font-medium rounded-full border transition-colors ${
                  type === t ? "bg-ink text-porcelain border-ink" : "bg-surface text-ink-muted border-line hover:border-blue/40"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Profissional responsável</label>
            <select name="dentist" required className="input max-w-xs">
              <option value="">Selecione...</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {type === "atestado" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Dias de afastamento</label>
                <input name="daysOff" type="number" min={0} className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">CID (opcional)</label>
                <input name="cid" className="input" />
              </div>
            </div>
          )}

          {type === "presenca" && (
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-ink-muted mb-1">Data/hora do atendimento</label>
              <input name="visitDate" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="input" />
            </div>
          )}

          {type === "receita" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-muted">Medicamentos</p>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1.4fr_auto] gap-2 items-start">
                  <input
                    placeholder="Medicamento"
                    value={it.medication}
                    onChange={(e) => updateItem(i, "medication", e.target.value)}
                    className="input"
                  />
                  <input
                    placeholder="Dosagem (ex: 500mg)"
                    value={it.dosage}
                    onChange={(e) => updateItem(i, "dosage", e.target.value)}
                    className="input"
                  />
                  <input
                    placeholder="Instruções (ex: 1 cp a cada 8h por 5 dias)"
                    value={it.instructions}
                    onChange={(e) => updateItem(i, "instructions", e.target.value)}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="h-9 w-9 rounded-lg border border-line flex items-center justify-center text-ink-faint hover:text-danger hover:border-danger/30 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-sm text-blue hover:underline">
                + Adicionar medicamento
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Texto do documento</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="input resize-y"
              />
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Emitindo..." : "Emitir e imprimir"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">Nenhum documento emitido ainda.</p>
      ) : (
        <ul className="divide-y divide-line-soft border border-line rounded-xl overflow-hidden">
          {documents.map((doc) => (
            <li key={doc._id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-soft transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_STYLES[doc.type]}`}>
                <FileText size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink">{TYPE_LABELS[doc.type]}</p>
                <p className="text-xs text-ink-faint truncate">
                  {new Date(doc.issuedAt).toLocaleDateString("pt-BR")} · {doc.dentist?.name ?? "—"}
                </p>
              </div>
              <Link
                href={`/documentos/${doc._id}/imprimir`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue hover:text-blue-strong hover:underline shrink-0"
              >
                <Printer size={13} /> Imprimir
              </Link>
              <button
                onClick={() => handleDelete(doc._id)}
                className="text-ink-faint hover:text-danger shrink-0"
                aria-label="Excluir documento"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
