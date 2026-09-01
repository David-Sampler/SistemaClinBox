// Rota de API de UM produto específico: editar (PUT — inclui ajustar
// estoque manualmente) e desativar (DELETE). Só admin/dentista.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { productSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";
import { requirePermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = await requirePermission(session!.user.role, "catalog");
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const product = await Product.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = await requirePermission(session!.user.role, "catalog");
  if (forbidden) return forbidden;

  const { id } = await params;
  await connectDB();
  const product = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
