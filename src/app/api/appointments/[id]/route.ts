import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Appointment } from "@/models/Appointment";
import { appointmentSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

// Rota de API de UMA consulta específica: editar (PUT, usado para trocar
// status ou reagendar) e cancelar (DELETE — apenas marca status "cancelado").
type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = appointmentSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.start) update.start = new Date(parsed.data.start);
  if (parsed.data.end) update.end = new Date(parsed.data.end);

  const appointment = await Appointment.findByIdAndUpdate(id, update, { new: true });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  return NextResponse.json({ appointment });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const appointment = await Appointment.findByIdAndUpdate(id, { status: "cancelado" }, { new: true });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
