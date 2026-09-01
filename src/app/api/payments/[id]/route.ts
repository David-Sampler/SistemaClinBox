import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod";

// Rota para atualizar o STATUS de um pagamento (ex: marcar como "pago").
type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).optional(),
  paidDate: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const update: Record<string, unknown> = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.paidDate) update.paidDate = new Date(parsed.data.paidDate);

  const payment = await Payment.findByIdAndUpdate(id, update, { new: true });
  if (!payment) return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });

  return NextResponse.json({ payment });
}
