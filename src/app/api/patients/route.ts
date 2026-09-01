// Rota de API para PACIENTES: listar (GET) e cadastrar (POST).
// Endereço: /api/patients
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { patientSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// GET /api/patients?q=busca -> lista pacientes ativos, com busca opcional por texto
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const q = req.nextUrl.searchParams.get("q");
  const filter = q
    ? { active: true, $text: { $search: q } }
    : { active: true };

  const patients = await Patient.find(filter).sort({ name: 1 }).limit(100).lean();
  return NextResponse.json({ patients });
}

// POST /api/patients -> cadastra um novo paciente
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const patient = await Patient.create({
    ...parsed.data,
    email: parsed.data.email || undefined,
    createdBy: session!.user.id,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
