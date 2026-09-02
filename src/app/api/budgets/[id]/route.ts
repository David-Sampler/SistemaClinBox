import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Budget } from "@/models/Budget";
import { Payment } from "@/models/Payment";
import { budgetSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// Rota de UM orçamento específico: editar (PUT — status, ou os itens/
// dentista/observações, pra corrigir um orçamento lançado errado) e
// excluir (DELETE).
type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = budgetSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  // "findByIdAndUpdate" não passa pelo hook "pre('validate')" do modelo
  // (que recalcula o total a partir dos itens) — esse hook só roda em
  // .save(). Por isso busca o documento, aplica as mudanças e salva,
  // em vez de atualizar direto pela query.
  const budget = await Budget.findById(id);
  if (!budget) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  if (parsed.data.dentist) budget.dentist = new Types.ObjectId(parsed.data.dentist);
  if (parsed.data.items) budget.items = parsed.data.items;
  if (parsed.data.status) budget.status = parsed.data.status;
  if (parsed.data.notes !== undefined) budget.notes = parsed.data.notes;

  await budget.save();

  return NextResponse.json({ budget });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();

  // Não deixa apagar um orçamento que ainda tem pagamento vinculado —
  // sem essa checagem, o pagamento ficaria "órfão" (referenciando um
  // orçamento que não existe mais) e perderia a descrição do serviço na tela.
  const linkedPayments = await Payment.countDocuments({ budget: id });
  if (linkedPayments > 0) {
    return NextResponse.json(
      {
        error: `Este orçamento tem ${linkedPayments} pagamento${linkedPayments > 1 ? "s" : ""} vinculado${linkedPayments > 1 ? "s" : ""} — exclua ou desvincule antes de apagar o orçamento.`,
      },
      { status: 409 }
    );
  }

  const budget = await Budget.findByIdAndDelete(id);
  if (!budget) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
