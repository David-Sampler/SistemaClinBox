import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { patientSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

// Rota de API para UM paciente específico: ver (GET), editar (PUT) e
// "excluir" (DELETE — na verdade só marca como inativo, não apaga do banco).
// Endereço: /api/patients/ID_DO_PACIENTE
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const patient = await Patient.findById(id).lean();
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });

  return NextResponse.json({ patient });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const patient = await Patient.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });

  return NextResponse.json({ patient });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  await connectDB();
  const patient = await Patient.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
