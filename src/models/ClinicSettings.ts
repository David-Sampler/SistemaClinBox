// Configurações da CLÍNICA (não do sistema ClinBox) — nome e logo que
// aparecem no papel timbrado dos documentos impressos (atestado, receita,
// orçamento). Existe só UM documento dessa coleção (padrão "singleton"):
// não tem paciente/dono, é uma configuração global da conta.
import { Schema, model, models, Model, Types } from "mongoose";

export interface IClinicSettings {
  _id: Types.ObjectId;
  name: string;
  logoBlobUrl?: string;
  logoMimeType?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSettingsSchema = new Schema<IClinicSettings>(
  {
    name: { type: String, required: true, trim: true, default: "Minha Clínica" },
    logoBlobUrl: { type: String },
    logoMimeType: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const ClinicSettings: Model<IClinicSettings> =
  models.ClinicSettings || model<IClinicSettings>("ClinicSettings", ClinicSettingsSchema);

// Sempre existe exatamente um documento — se ainda não tiver sido criado
// (primeiro uso do sistema), cria um com os valores padrão na hora.
export async function getClinicSettings() {
  let settings = await ClinicSettings.findOne();
  if (!settings) {
    settings = await ClinicSettings.create({ name: "Minha Clínica" });
  }
  return settings;
}
