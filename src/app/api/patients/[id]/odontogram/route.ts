import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Odontogram } from "@/models/Odontogram";
import { odontogramSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";
import { requirePermission } from "@/lib/permissions";

// Rota de API do ODONTOGRAMA de um paciente: ver (GET) e salvar alterações (PUT).
// Como cada paciente tem só um odontograma, o PUT usa "upsert" (cria se não existir,
// atualiza se já existir).
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const odontogram = await Odontogram.findOne({ patient: id }).lean();
  return NextResponse.json({ odontogram: odontogram ?? null });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  // Odontograma é ação clínica — recepção (staff) só acompanha, não registra.
  const forbidden = await requirePermission(session!.user.role, "odontogram");
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const parsed = odontogramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const odontogram = await Odontogram.findOneAndUpdate(
    { patient: id },
    { teeth: parsed.data.teeth, updatedBy: session!.user.id },
    { new: true, upsert: true }
  );

  return NextResponse.json({ odontogram });
}
