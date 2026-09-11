// Rota de API para PACIENTES: listar (GET) e cadastrar (POST).
// Endereço: /api/patients
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Patient } from "@/models/Patient";
import { patientSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";
import { onlyDigits } from "@/lib/cpf";
import { namesAreSimilar } from "@/lib/similarity";

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

  // Aviso de possível duplicata ANTES de criar — pega tanto CPF igual
  // (mesma pessoa, sem dúvida) quanto nome parecido (provável erro de
  // digitação num cadastro novo, tipo "SILVA" virar "SILZA"). Não
  // bloqueia: quem está cadastrando vê o aviso e confirma ("cadastrar
  // mesmo assim", com confirmDuplicate:true) se for coincidência mesmo
  // (dois pacientes reais com nomes parecidos existem).
  if (!body.confirmDuplicate) {
    const cpfDigits = parsed.data.cpf ? onlyDigits(parsed.data.cpf) : "";
    const candidates = await Patient.find({ active: true }).select("name cpf phone").lean();

    const cpfMatch = cpfDigits
      ? candidates.find((p) => p.cpf && onlyDigits(p.cpf) === cpfDigits)
      : undefined;
    const nameMatch = !cpfMatch
      ? candidates.find((p) => namesAreSimilar(p.name, parsed.data.name))
      : undefined;
    const match = cpfMatch ?? nameMatch;

    if (match) {
      return NextResponse.json(
        {
          duplicate: {
            kind: cpfMatch ? "cpf" : "name",
            patient: { id: String(match._id), name: match.name, phone: match.phone },
          },
          error: cpfMatch
            ? `Já existe um paciente ativo com esse CPF: ${match.name}.`
            : `Já existe um paciente cadastrado com nome parecido: ${match.name}.`,
        },
        { status: 409 }
      );
    }
  }

  const patient = await Patient.create({
    ...parsed.data,
    email: parsed.data.email || undefined,
    createdBy: session!.user.id,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
