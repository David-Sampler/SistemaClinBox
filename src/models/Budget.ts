// Modelo de ORÇAMENTO: proposta de tratamento com valores, que o paciente
// aprova ou rejeita antes de iniciar o tratamento. Um orçamento aprovado
// normalmente gera pagamentos (veja o modelo Payment).
import { Schema, model, models, Model, Types } from "mongoose";

export type BudgetStatus = "pendente" | "aprovado" | "rejeitado";

export interface IBudgetItem {
  description: string;
  tooth?: string;
  value: number;
}

export interface IBudget {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  dentist: Types.ObjectId;
  items: IBudgetItem[];
  total: number;
  status: BudgetStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema = new Schema<IBudgetItem>(
  {
    description: { type: String, required: true, trim: true },
    tooth: { type: String, trim: true },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BudgetSchema = new Schema<IBudget>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [BudgetItemSchema], required: true, validate: (v: IBudgetItem[]) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pendente", "aprovado", "rejeitado"], default: "pendente" },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Antes de salvar/validar, recalculamos o total automaticamente somando os itens.
// Isso evita que o total fique "desatualizado" em relação aos itens do orçamento.
// (Mongoose 9 não usa mais o callback "next" nos hooks — a função só precisa terminar.)
BudgetSchema.pre("validate", function () {
  if (this.items?.length) {
    this.total = this.items.reduce((sum, item) => sum + item.value, 0);
  }
});

BudgetSchema.index({ patient: 1, createdAt: -1 });

export const Budget: Model<IBudget> = models.Budget || model<IBudget>("Budget", BudgetSchema);
