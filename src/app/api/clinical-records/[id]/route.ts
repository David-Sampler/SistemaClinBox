// Rotas de UM registro do prontuário: editar (PUT) e excluir (DELETE).
// Mesma permissão de criar um registro ("clinicalRecords") — é ação
// clínica, então em algumas clínicas só o dentista mexe, não a recepção.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClinicalRecord } from "@/models/ClinicalRecord";
import { clinicalRecordSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";
import { requirePermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = await requirePermission(session!.user.role, "clinicalRecords");
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = clinicalRecordSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const { date, ...rest } = parsed.data;
  const record = await ClinicalRecord.findByIdAndUpdate(
    id,
    { ...rest, ...(date ? { date: new Date(date) } : {}) },
    { new: true }
  ).populate("dentist", "name");

  if (!record) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ record });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = await requirePermission(session!.user.role, "clinicalRecords");
  if (forbidden) return forbidden;

  const { id } = await params;
  await connectDB();
  const record = await ClinicalRecord.findByIdAndDelete(id);
  if (!record) {
    return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
