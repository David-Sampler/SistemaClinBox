// Rota de API de UM documento clínico específico: ver com todos os dados
// já populados (usado na tela de impressão) e excluir.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClinicDocument } from "@/models/ClinicDocument";
import { requireSession, requireRole } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const document = await ClinicDocument.findById(id)
    .populate("patient", "name cpf birthDate")
    .populate("dentist", "name cro")
    .lean();

  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  return NextResponse.json({ document });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  await connectDB();
  const document = await ClinicDocument.findByIdAndDelete(id);
  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
