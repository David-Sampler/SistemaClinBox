// Rota de API dos DOCUMENTOS emitidos pela clínica para um paciente
// (atestado, laudo, declaração de comparecimento, receita): listar (GET)
// e emitir um novo (POST).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClinicDocument } from "@/models/ClinicDocument";
import { clinicDocumentSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const documents = await ClinicDocument.find({ patient: id })
    .populate("dentist", "name cro")
    .sort({ issuedAt: -1 })
    .lean();

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  // Atestado/laudo/receita/comparecimento são documentos que levam a
  // assinatura de um profissional — recepção (staff) não emite.
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const parsed = clinicDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // A receita usa a lista "items"; os outros três tipos usam texto
  // corrido em "content" — sem pelo menos um dos dois, o documento sairia
  // em branco na impressão, então recusamos aqui.
  const { type, content, items } = parsed.data;
  if (type === "receita" && (!items || items.length === 0)) {
    return NextResponse.json({ error: "Adicione ao menos um medicamento à receita" }, { status: 400 });
  }
  if (type !== "receita" && !content?.trim()) {
    return NextResponse.json({ error: "O texto do documento não pode ficar vazio" }, { status: 400 });
  }

  await connectDB();
  const document = await ClinicDocument.create({
    ...parsed.data,
    patient: id,
    visitDate: parsed.data.visitDate ? new Date(parsed.data.visitDate) : undefined,
    issuedAt: new Date(),
    createdBy: session!.user.id,
  });

  return NextResponse.json({ document }, { status: 201 });
}
