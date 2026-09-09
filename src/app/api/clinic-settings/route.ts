// Configurações da clínica (nome exibido no papel timbrado). Qualquer
// usuário logado pode LER (os documentos impressos precisam disso), só
// admin pode EDITAR — é dado da clínica como um todo, não de paciente.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClinicSettings, getClinicSettings } from "@/models/ClinicSettings";
import { clinicSettingsSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const settings = await getClinicSettings();

  return NextResponse.json({
    settings: {
      name: settings.name,
      hasLogo: !!settings.logoBlobUrl,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => ({}));
  const parsed = clinicSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const settings = await getClinicSettings();
  settings.name = parsed.data.name;
  settings.updatedBy = session!.user.id as any;
  await settings.save();

  return NextResponse.json({ settings: { name: settings.name, hasLogo: !!settings.logoBlobUrl } });
}
