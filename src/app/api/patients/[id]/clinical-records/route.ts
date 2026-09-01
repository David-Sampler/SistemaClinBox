import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClinicalRecord } from "@/models/ClinicalRecord";
import { clinicalRecordSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

// Rota de API do PRONTUÁRIO (histórico de procedimentos) de um paciente:
// listar (GET) e adicionar um novo registro (POST).
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const records = await ClinicalRecord.find({ patient: id })
    .populate("dentist", "name")
    .sort({ date: -1 })
    .lean();

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  // Prontuário é ação clínica — recepção (staff) só acompanha, não registra.
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const parsed = clinicalRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const record = await ClinicalRecord.create({
    ...parsed.data,
    date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    patient: id,
    createdBy: session!.user.id,
  });

  return NextResponse.json({ record }, { status: 201 });
}
