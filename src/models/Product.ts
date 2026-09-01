// Modelo de PRODUTO: itens físicos que a clínica vende (escova, kit de
// clareamento, enxaguante...), com controle de estoque — diferente de
// Service, que são procedimentos (não têm "quantidade em estoque").
import { Schema, model, models, Model, Types } from "mongoose";

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  price: number;
  stock: number;
  active: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    // Quantidade disponível — cai a cada venda (veja /api/sales) e
    // fica visível na tela de Vendas pra equipe saber o que já acabou.
    stock: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text" });

export const Product: Model<IProduct> = models.Product || model<IProduct>("Product", ProductSchema);
