// Modelo de ANEXO: metadados de um arquivo enviado para o prontuário de
// um paciente (radiografia, foto, exame em PDF, etc). O conteúdo do
// arquivo em si NÃO fica aqui — fica no GridFS do MongoDB (veja
// src/lib/gridfs.ts); este documento só guarda a referência (fileId)
// e as informações para listar/exibir o anexo.
import { Schema, model, models, Model, Types } from "mongoose";

export type AttachmentCategory = "radiografia" | "foto" | "documento" | "outro";

export interface IAttachment {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  fileId: Types.ObjectId; // aponta para o arquivo guardado no GridFS
  filename: string;
  mimeType: string;
  size: number;
  category: AttachmentCategory;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    category: {
      type: String,
      enum: ["radiografia", "foto", "documento", "outro"],
      default: "outro",
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AttachmentSchema.index({ patient: 1, createdAt: -1 });

export const Attachment: Model<IAttachment> =
  models.Attachment || model<IAttachment>("Attachment", AttachmentSchema);
