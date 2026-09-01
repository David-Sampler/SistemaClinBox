// Rota de API do CATÁLOGO DE PRODUTOS: listar (GET, qualquer pessoa
// logada) e cadastrar um novo produto (POST, só admin/dentista).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { productSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const products = await Product.find({ active: true }).sort({ category: 1, name: 1 }).lean();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin", "dentist"]);
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const product = await Product.create({ ...parsed.data, createdBy: session!.user.id });

  return NextResponse.json({ product }, { status: 201 });
}
