// Rota para listar ORÇAMENTOS de TODOS os pacientes (usada na visão geral
// do financeiro). A rota /api/patients/[id]/budgets já existe para listar
// só os orçamentos de UM paciente específico.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Budget } from "@/models/Budget";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const status = req.nextUrl.searchParams.get("status");
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const budgets = await Budget.find(filter)
    .populate("patient", "name phone")
    .populate("dentist", "name")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ budgets });
}
