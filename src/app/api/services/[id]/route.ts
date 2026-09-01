// Rota de API de UM serviço específico: editar (PUT) e desativar
// (DELETE — só marca como inativo, não apaga, pra não quebrar
// orçamentos/pagamentos antigos que o referenciam). Ambas só para
// admin/dentista.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Service } from "@/models/Service";
import { serviceSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const parsed = serviceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const service = await Service.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  return NextResponse.json({ service });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  await connectDB();
  const service = await Service.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
