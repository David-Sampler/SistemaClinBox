import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { paymentSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// Rota de API dos PAGAMENTOS de um paciente: listar (GET) e lançar um novo (POST).
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const payments = await Payment.find({ patient: id })
    .populate("budget", "items status")
    .sort({ dueDate: -1 })
    .lean();
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const payment = await Payment.create({
    ...parsed.data,
    dueDate: new Date(parsed.data.dueDate),
    paidDate: parsed.data.paidDate ? new Date(parsed.data.paidDate) : undefined,
    patient: id,
    createdBy: session!.user.id,
  });

  return NextResponse.json({ payment }, { status: 201 });
}
