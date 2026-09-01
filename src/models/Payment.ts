// Modelo de PAGAMENTO: controla o financeiro do paciente — cada parcela
// (ou pagamento à vista) fica registrada aqui, com vencimento e status.
// "budget" é OPCIONAL de propósito: um pagamento pode estar vinculado a
// um orçamento formal (várias etapas de tratamento) OU ser uma cobrança
// avulsa — um serviço prestado na hora, fora do orçamento — caso em que
// "notes" carrega a descrição do que foi cobrado.
import { Schema, model, models, Model, Types } from "mongoose";

export type PaymentMethod = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "boleto" | "convenio";
export type PaymentStatus = "pendente" | "pago" | "atrasado" | "cancelado";

export interface IPayment {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  budget?: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  installment: { number: number; total: number };
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    budget: { type: Schema.Types.ObjectId, ref: "Budget" },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["dinheiro", "cartao_credito", "cartao_debito", "pix", "boleto", "convenio"],
      required: true,
    },
    installment: {
      number: { type: Number, default: 1 },
      total: { type: Number, default: 1 },
    },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    status: { type: String, enum: ["pendente", "pago", "atrasado", "cancelado"], default: "pendente" },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ patient: 1, dueDate: -1 });
PaymentSchema.index({ status: 1, dueDate: 1 });

export const Payment: Model<IPayment> = models.Payment || model<IPayment>("Payment", PaymentSchema);
