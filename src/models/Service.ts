// Modelo de SERVIÇO: o catálogo de procedimentos que a clínica oferece
// (ex: "Limpeza", "Restauração", "Canal"), cada um com um preço padrão.
// Usado como atalho ao montar orçamentos e cobranças avulsas — em vez
// de digitar descrição e valor toda vez, a equipe escolhe da lista.
import { Schema, model, models, Model, Types } from "mongoose";

export interface IService {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  // Sem "required": alguns procedimentos (ex: cirurgias mais complexas)
  // não têm valor fixo — variam caso a caso. Fica em branco no catálogo
  // e o valor é digitado na hora da venda (veja src/components/venda-view.tsx).
  defaultPrice?: number;
  active: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    // Categoria é livre (não um enum fixo) — cada clínica organiza do
    // seu jeito: "Preventivo", "Restaurador", "Cirúrgico", "Estético"...
    category: { type: String, trim: true },
    defaultPrice: { type: Number, min: 0 },
    // "active: false" desativa um serviço sem apagar (orçamentos e
    // pagamentos antigos que o referenciam continuam intactos).
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ name: "text" });

export const Service: Model<IService> = models.Service || model<IService>("Service", ServiceSchema);
