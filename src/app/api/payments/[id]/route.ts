import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { paymentSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// Rota de UM pagamento específico: editar (PUT — usado tanto para marcar
// como "pago" quanto para corrigir valor/data/forma de pagamento errados)
// e excluir (DELETE — lançamento removido de vez, sem soft-delete: não
// faz sentido manter na tela um pagamento que nunca deveria ter existido).
type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  // Reaproveita o mesmo schema usado para CRIAR um pagamento, só que com
  // tudo opcional — o formulário de edição manda só o que faz sentido
  // editar (valor/forma/vencimento/descrição), mas "marcar como pago"
  // (status + paidDate) continua passando pela mesma rota.
  const parsed = paymentSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate) update.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.paidDate) update.paidDate = new Date(parsed.data.paidDate);

  const payment = await Payment.findByIdAndUpdate(id, update, { new: true });
  if (!payment) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });

  return NextResponse.json({ payment });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const payment = await Payment.findByIdAndDelete(id);
  if (!payment) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
