import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Budget } from "@/models/Budget";
import { budgetSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// Rota de API dos ORÇAMENTOS de um paciente: listar (GET) e criar um novo (POST).
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const budgets = await Budget.find({ patient: id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ budgets });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const total = parsed.data.items.reduce((sum, item) => sum + item.value, 0);
  const budget = await Budget.create({
    ...parsed.data,
    total,
    patient: id,
    createdBy: session!.user.id,
  });

  return NextResponse.json({ budget }, { status: 201 });
}
