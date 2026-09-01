// Modelo de VENDA: o registro de um "checkout" — um ou mais serviços
// e/ou produtos vendidos de uma vez, com forma de pagamento e total.
// Cada item guarda uma "fotografia" do nome e preço no momento da
// venda (não muda se o catálogo mudar depois — histórico fica intacto).
import { Schema, model, models, Model, Types } from "mongoose";
import type { PaymentMethod } from "./Payment";

export type SaleItemType = "service" | "product";
export type SaleStatus = "pago" | "pendente";

export interface ISaleItem {
  type: SaleItemType;
  ref?: Types.ObjectId; // aponta pro Service ou Product original, se veio do catálogo
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ISale {
  _id: Types.ObjectId;
  patient?: Types.ObjectId; // venda pode ser de um paciente cadastrado, ou avulsa (balcão)
  items: ISaleItem[];
  total: number;
  method: PaymentMethod;
  status: SaleStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    type: { type: String, enum: ["service", "product"], required: true },
    ref: { type: Schema.Types.ObjectId },
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient" },
    items: { type: [SaleItemSchema], required: true, validate: (v: ISaleItem[]) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["dinheiro", "cartao_credito", "cartao_debito", "pix", "boleto", "convenio"],
      required: true,
    },
    status: { type: String, enum: ["pago", "pendente"], default: "pago" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SaleSchema.index({ createdAt: -1 });

export const Sale: Model<ISale> = models.Sale || model<ISale>("Sale", SaleSchema);
