// Modelo de ODONTOGRAMA: o "mapa" visual dos dentes do paciente,
// mostrando a situação de cada dente (saudável, cariado, restaurado, etc).
// Cada paciente tem UM odontograma (é atualizado, não criado de novo a cada consulta).
import { Schema, model, models, Model, Types } from "mongoose";

// Situação clínica que um dente pode ter:
export type ToothStatus =
  | "sadio"
  | "cariado"
  | "restaurado"
  | "ausente"
  | "extracao_indicada"
  | "tratamento_endodontico"
  | "coroa"
  | "implante"
  | "fraturado"
  | "protese";

// Registro de UM dente dentro do odontograma do paciente.
export interface IToothRecord {
  number: string; // notação FDI: 11-18, 21-28, 31-38, 41-48 (permanentes) ou 51-85 (decíduos)
  status: ToothStatus;
  faces?: string[]; // faces do dente afetadas, ex: ["mesial", "distal", "oclusal", "vestibular", "lingual"]
  notes?: string;
}

export interface IOdontogram {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  teeth: IToothRecord[];
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ToothRecordSchema = new Schema<IToothRecord>(
  {
    number: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "sadio",
        "cariado",
        "restaurado",
        "ausente",
        "extracao_indicada",
        "tratamento_endodontico",
        "coroa",
        "implante",
        "fraturado",
        "protese",
      ],
      default: "sadio",
    },
    faces: [{ type: String }],
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const OdontogramSchema = new Schema<IOdontogram>(
  {
    // "unique: true" garante que cada paciente tenha só um odontograma (nunca dois documentos)
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, unique: true },
    teeth: [ToothRecordSchema],
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Odontogram: Model<IOdontogram> =
  models.Odontogram || model<IOdontogram>("Odontogram", OdontogramSchema);
