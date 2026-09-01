// Modelo de PRONTUÁRIO / EVOLUÇÃO CLÍNICA: registro de cada procedimento
// realizado no paciente ao longo do tempo (uma "linha do tempo" do tratamento).
// Diferente do Odontogram (que é o estado ATUAL dos dentes), aqui fica o HISTÓRICO.
import { Schema, model, models, Model, Types } from "mongoose";

export interface IClinicalRecord {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  dentist: Types.ObjectId;
  appointment?: Types.ObjectId;
  date: Date;
  tooth?: string;
  procedure: string;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalRecordSchema = new Schema<IClinicalRecord>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    date: { type: Date, required: true, default: Date.now },
    tooth: { type: String, trim: true },
    procedure: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ClinicalRecordSchema.index({ patient: 1, date: -1 });

export const ClinicalRecord: Model<IClinicalRecord> =
  models.ClinicalRecord || model<IClinicalRecord>("ClinicalRecord", ClinicalRecordSchema);
