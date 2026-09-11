// "Receita combinada": junta VENDA (checkout de produto/serviço, com ou
// sem paciente — modelo Sale) e COBRANÇA DE PACIENTE (parcela de
// orçamento ou cobrança avulsa lançada na ficha — modelo Payment) numa
// lista só, ordenada por data. Existe porque, pro dono da clínica, os
// dois são simplesmente "dinheiro que entrou" — só quem lançou é que
// escolheu uma tela ou outra (Vendas vs. ficha do paciente → Financeiro).
// Usado pela tela de Vendas (via /api/sales/combined) e pelo card
// "Últimas vendas" do painel inicial (chamado direto, já que o painel é
// server component).
import { Sale } from "@/models/Sale";
import { Payment } from "@/models/Payment";

export type RevenueEntry = {
  _id: string;
  kind: "sale" | "payment";
  patientId?: string;
  patientName?: string; // undefined só é possível em kind "sale" (venda avulsa/balcão)
  description: string;
  // Só vem preenchido pra "sale" — dá pro detalhe mostrar item a item em
  // vez de só a frase resumida de "description".
  items?: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  method: string;
  status: "pago" | "pendente" | "cancelada";
  total: number;
  createdAt: string;
};

// Payment tem 4 status (inclui "atrasado", que Sale não tem) — aqui vira
// "pendente" pra caber na mesma paleta de 3 status que a tela de Vendas
// já usa (ela mesma já ignora o "atrasado" nos totais de qualquer forma).
const PAYMENT_STATUS_MAP: Record<string, RevenueEntry["status"]> = {
  pago: "pago",
  pendente: "pendente",
  atrasado: "pendente",
  cancelado: "cancelada",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saleDescription(items: any[]): string {
  return items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paymentDescription(payment: any): string {
  if (payment.notes) return payment.notes;
  if (payment.installment?.total > 1) {
    return `Parcela ${payment.installment.number}/${payment.installment.total} do orçamento`;
  }
  return "Cobrança do orçamento";
}

export async function getCombinedRevenue({
  from,
  to,
  limit = 300,
}: {
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<RevenueEntry[]> {
  const dateFilter: Record<string, unknown> = {};
  if (from || to) {
    dateFilter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  // Busca até "limit" de CADA fonte (não do total combinado) — mesmo no
  // pior caso (as "limit" mais recentes vindo todas de uma fonte só), o
  // conjunto final depois do merge+corte nunca fica menor do que devia.
  const [sales, payments] = await Promise.all([
    Sale.find(dateFilter).populate("patient", "name").sort({ createdAt: -1 }).limit(limit).lean(),
    Payment.find(dateFilter).populate("patient", "name").sort({ createdAt: -1 }).limit(limit).lean(),
  ]);

  const saleEntries: RevenueEntry[] = sales.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patient = s.patient as any;
    return {
      _id: String(s._id),
      kind: "sale",
      patientId: patient?._id ? String(patient._id) : undefined,
      patientName: patient?.name,
      description: saleDescription(s.items),
      items: s.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.subtotal })),
      method: s.method,
      status: s.status === "cancelada" ? "cancelada" : s.status === "pendente" ? "pendente" : "pago",
      total: s.total,
      createdAt: (s.createdAt as Date).toISOString(),
    };
  });

  const paymentEntries: RevenueEntry[] = payments.map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patient = p.patient as any;
    return {
      _id: String(p._id),
      kind: "payment",
      patientId: patient?._id ? String(patient._id) : undefined,
      patientName: patient?.name,
      description: paymentDescription(p),
      method: p.method,
      status: PAYMENT_STATUS_MAP[p.status] ?? "pendente",
      total: p.amount,
      createdAt: (p.createdAt as Date).toISOString(),
    };
  });

  return [...saleEntries, ...paymentEntries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
