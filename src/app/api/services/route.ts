// Rota de API do CATÁLOGO DE SERVIÇOS: listar (GET, qualquer pessoa
// logada) e cadastrar um novo serviço (POST, só admin/dentista — quem
// define preço de procedimento).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Service } from "@/models/Service";
import { serviceSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const services = await Service.find({ active: true }).sort({ category: 1, name: 1 }).lean();
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = await requirePermission(session!.user.role, "catalog");
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const service = await Service.create({ ...parsed.data, createdBy: session!.user.id });

  return NextResponse.json({ service }, { status: 201 });
}
