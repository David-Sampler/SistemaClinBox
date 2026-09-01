import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Budget } from "@/models/Budget";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod";

// Rota para atualizar o STATUS de um orçamento (pendente/aprovado/rejeitado).
type Params = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["pendente", "aprovado", "rejeitado"]),
});

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const budget = await Budget.findByIdAndUpdate(id, { status: parsed.data.status }, { new: true });
  if (!budget) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });

  return NextResponse.json({ budget });
}
