// Rota de API das PERMISSÕES POR PAPEL: ver a configuração atual (GET —
// qualquer pessoa logada, porque cada tela usa isso pra saber o que
// mostrar/esconder pro papel de quem está vendo) e alterar (PUT — só
// administrador). "admin" nunca aparece aqui: sempre acesso total.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RolePermission, DEFAULT_PERMISSIONS, ConfigurableRole } from "@/models/RolePermission";
import { requireSession, requireRole } from "@/lib/api-auth";
import { z } from "zod";

const permissionsSchema = z.object({
  role: z.enum(["dentist", "staff"]),
  permissions: z.object({
    clinicalRecords: z.boolean(),
    odontogram: z.boolean(),
    clinicDocuments: z.boolean(),
    catalog: z.boolean(),
    deletePatients: z.boolean(),
  }),
});

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const docs = await RolePermission.find({}).lean();

  // Preenche com o padrão qualquer papel que ainda não foi configurado
  // (ex: primeira vez que a clínica abre essa tela) — assim a resposta
  // sempre tem os dois papéis, nunca "undefined".
  const byRole = Object.fromEntries(docs.map((d) => [d.role, d.permissions])) as Record<
    ConfigurableRole,
    (typeof DEFAULT_PERMISSIONS)[ConfigurableRole]
  >;
  const result = {
    dentist: byRole.dentist ?? DEFAULT_PERMISSIONS.dentist,
    staff: byRole.staff ?? DEFAULT_PERMISSIONS.staff,
  };

  return NextResponse.json({ permissions: result });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;
  // Só administrador decide o que os outros papéis podem fazer.
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = permissionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const doc = await RolePermission.findOneAndUpdate(
    { role: parsed.data.role },
    { permissions: parsed.data.permissions },
    { new: true, upsert: true }
  );

  return NextResponse.json({ permission: doc });
}
