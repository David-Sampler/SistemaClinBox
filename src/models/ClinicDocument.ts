// Modelo de DOCUMENTOS emitidos pela clínica para o paciente: atestado,
// laudo, declaração de comparecimento e receita — os papéis que a
// recepção/dentista precisa imprimir e entregar na hora. Fica separado
// dos "Attachment" (que são arquivos que o paciente TRAZ pra clínica,
// tipo radiografia) porque aqui é o contrário: a clínica GERA o documento.
import { Schema, model, models, Model, Types } from "mongoose";

export type ClinicDocumentType = "atestado" | "laudo" | "presenca" | "receita";

// Um item de receita: um medicamento com posologia — texto livre pra
// dosagem/instruções porque cada dentista escreve do seu jeito
// ("1 comprimido a cada 8h por 5 dias", "aplicar 2x ao dia"...).
export interface IPrescriptionItem {
  medication: string;
  dosage?: string;
  instructions?: string;
}

export interface IClinicDocument {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  dentist: Types.ObjectId; // profissional que assina (nome + CRO aparecem impressos)
  type: ClinicDocumentType;
  // Corpo do texto — usado por atestado, laudo e declaração de comparecimento.
  // Receita usa a lista "items" abaixo em vez de texto corrido.
  content?: string;
  daysOff?: number; // atestado: dias de afastamento das atividades
  cid?: string; // atestado: código CID-10, opcional
  visitDate?: Date; // presença: data/hora do atendimento declarado
  items?: IPrescriptionItem[]; // receita
  issuedAt: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicDocumentSchema = new Schema<IClinicDocument>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["atestado", "laudo", "presenca", "receita"], required: true },
    content: { type: String, trim: true },
    daysOff: { type: Number, min: 0 },
    cid: { type: String, trim: true },
    visitDate: { type: Date },
    items: [
      {
        medication: { type: String, trim: true, required: true },
        dosage: { type: String, trim: true },
        instructions: { type: String, trim: true },
      },
    ],
    issuedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ClinicDocumentSchema.index({ patient: 1, createdAt: -1 });

export const ClinicDocument: Model<IClinicDocument> =
  models.ClinicDocument || model<IClinicDocument>("ClinicDocument", ClinicDocumentSchema);
