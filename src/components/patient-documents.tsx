// DOCUMENTOS do paciente: radiografias, fotos e outros arquivos anexados
// ao prontuário. Imagens aparecem com miniatura; outros arquivos (PDF)
// mostram um ícone. Clicar abre o arquivo numa nova aba.
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";

type Attachment = {
  _id: string;
  filename: string;
  mimeType: string;
  size: number;
  category: "radiografia" | "foto" | "documento" | "outro";
  createdAt: string;
  uploadedBy?: { name: string };
};

const categoryLabels: Record<Attachment["category"], string> = {
  radiografia: "Radiografia",
  foto: "Foto",
  documento: "Documento",
  outro: "Outro",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PatientDocuments({ patientId }: { patientId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadAttachments() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/attachments`);
    const data = await res.json();
    setAttachments(data.attachments ?? []);
    setLoading(false);
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Selecione um arquivo.");
      return;
    }

    setUploading(true);
    const res = await fetch(`/api/patients/${patientId}/attachments`, {
      method: "POST",
      body: form,
    });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Não foi possível enviar o arquivo.");
      return;
    }

    formRef.current?.reset();
    loadAttachments();
  }

  async function handleDelete(id: string) {
    setAttachments((prev) => prev.filter((a) => a._id !== id));
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        onSubmit={handleUpload}
        className="bg-surface-soft border border-line rounded-lg p-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-ink-muted mb-1">Arquivo</label>
          <input
            name="file"
            type="file"
            required
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Categoria</label>
          <select name="category" className="input" defaultValue="radiografia">
            <option value="radiografia">Radiografia</option>
            <option value="foto">Foto</option>
            <option value="documento">Documento</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <button type="submit" disabled={uploading} className="btn-primary">
          <Upload size={16} />
          {uploading ? "Enviando..." : "Enviar"}
        </button>

        {error && <p className="w-full text-sm text-danger">{error}</p>}
      </form>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-ink-muted py-4">Nenhum documento enviado ainda.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {attachments.map((a, i) => (
            <div
              key={a._id}
              className="fade-up group relative border border-line rounded-lg overflow-hidden bg-surface"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            >
              <a
                href={`/api/attachments/${a._id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="aspect-square bg-surface-soft flex items-center justify-center overflow-hidden">
                  {a.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/attachments/${a._id}/file`}
                      alt={a.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText size={32} className="text-ink-faint" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-ink truncate">{a.filename}</p>
                  <p className="text-[11px] text-ink-faint">
                    {categoryLabels[a.category]} · {formatSize(a.size)}
                  </p>
                </div>
              </a>
              <button
                onClick={() => handleDelete(a._id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-ink/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                aria-label="Excluir anexo"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
