import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Appointment } from "@/models/Appointment";
import { appointmentSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// Rota de API da AGENDA: listar consultas com filtros (GET) e criar uma
// nova consulta (POST), com verificação de conflito de horário do dentista.
export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const dentist = req.nextUrl.searchParams.get("dentist");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  // "limit=1" é usado pra achar só a PRÓXIMA consulta de um dentista
  // (clicar no nome dele na agenda pula direto pra essa data) — sem
  // precisar trazer a lista inteira só pra pegar a primeira.
  const limit = req.nextUrl.searchParams.get("limit");

  const filter: Record<string, unknown> = {};
  if (dentist) filter.dentist = dentist;
  if (from || to) {
    filter.start = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  let query = Appointment.find(filter)
    .populate("patient", "name phone")
    .populate("dentist", "name")
    .sort({ start: 1 });
  if (limit) query = query.limit(Number(limit));

  const appointments = await query.lean();

  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  const start = new Date(parsed.data.start);
  const end = new Date(parsed.data.end);
  if (end <= start) {
    return NextResponse.json(
      { error: "Horário final deve ser depois do horário inicial" },
      { status: 400 }
    );
  }

  // Verifica se o dentista já tem outra consulta que "esbarra" nesse horário
  // (evita marcar dois pacientes ao mesmo tempo com o mesmo dentista).
  const conflict = await Appointment.findOne({
    dentist: parsed.data.dentist,
    status: { $nin: ["cancelado", "falta"] },
    start: { $lt: end },
    end: { $gt: start },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Este dentista já possui um agendamento nesse horário" },
      { status: 409 }
    );
  }

  const appointment = await Appointment.create({
    ...parsed.data,
    start,
    end,
    createdBy: session!.user.id,
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
