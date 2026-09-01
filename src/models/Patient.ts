// Modelo de PACIENTES: dados cadastrais e histórico médico (anamnese).
// Este é o "centro" do sistema — agenda, prontuário e financeiro sempre
// se referem a um paciente (via campo "patient", que guarda o _id dele).
import { Schema, model, models, Model, Types } from "mongoose";

// Histórico médico resumido (anamnese), importante para o dentista saber
// antes de qualquer procedimento (ex: alergia a anestésico, gestação, etc).
export interface IMedicalHistory {
  allergies?: string;
  medications?: string;
  conditions?: string; // outras condições, em texto livre, fora do checklist abaixo
  isPregnant?: boolean;
  isSmoker?: boolean;
  hasDiabetes?: boolean;
  hasHypertension?: boolean; // pressão alta
  hasHeartCondition?: boolean; // cardiopatia
  hasBleedingDisorder?: boolean; // problema de coagulação/sangramento
  hadAnesthesiaReaction?: boolean; // já teve reação a anestésico
  notes?: string;
}

export interface IPatient {
  _id: Types.ObjectId;
  name: string;
  cpf?: string;
  birthDate?: Date;
  gender?: "masculino" | "feminino" | "outro";
  phone: string;
  email?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
  };
  healthInsurance?: string;
  medicalHistory?: IMedicalHistory;
  active: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    name: { type: String, required: true, trim: true },
    cpf: { type: String, trim: true },
    birthDate: { type: Date },
    gender: { type: String, enum: ["masculino", "feminino", "outro"] },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      street: String,
      number: String,
      neighborhood: String,
      city: String,
      state: String,
      zip: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
    },
    healthInsurance: { type: String, trim: true },
    medicalHistory: {
      allergies: String,
      medications: String,
      conditions: String,
      isPregnant: Boolean,
      isSmoker: Boolean,
      hasDiabetes: Boolean,
      hasHypertension: Boolean,
      hasHeartCondition: Boolean,
      hasBleedingDisorder: Boolean,
      hadAnesthesiaReaction: Boolean,
      notes: String,
    },
    // "active: false" = paciente "excluído" (na verdade só escondido, dado não é apagado)
    active: { type: Boolean, default: true },
    // Guarda qual usuário cadastrou o paciente (auditoria/rastreabilidade)
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Índice de texto: permite buscar pacientes digitando parte do nome, CPF ou telefone
// (usado na barra de pesquisa da lista de pacientes).
PatientSchema.index({ name: "text", cpf: "text", phone: "text" });

export const Patient: Model<IPatient> = models.Patient || model<IPatient>("Patient", PatientSchema);
