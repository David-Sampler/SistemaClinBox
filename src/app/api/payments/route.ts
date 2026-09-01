// Rota para listar pagamentos de TODOS os pacientes (usada na tela de
// visão geral do financeiro). A rota /api/patients/[id]/payments já existe
// para listar só os pagamentos de UM paciente específico.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const status = req.nextUrl.searchParams.get("status");
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .populate("patient", "name phone")
    .populate("budget", "items status")
    .sort({ dueDate: 1 })
    .limit(200)
    .lean();

  return NextResponse.json({ payments });
}
