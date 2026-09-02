import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { userSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

// Rota de API da EQUIPE: listar usuários do sistema (GET, qualquer pessoa
// logada pode ver quem faz parte da equipe) e cadastrar um novo usuário
// (POST, só administradores podem fazer isso).
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  // "?includeInactive=true" também traz quem foi desativado — só o
  // administrador pode pedir isso, é o que alimenta a lista de "usuários
  // inativos" na tela de Equipe, usada pra reativar alguém.
  const includeInactive =
    req.nextUrl.searchParams.get("includeInactive") === "true" && session!.user.role === "admin";

  await connectDB();
  const filter = includeInactive ? {} : { active: true };
  const users = await User.find(filter).select("-passwordHash").sort({ name: 1 }).lean();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: parsed.data.role,
    cro: parsed.data.cro,
    phone: parsed.data.phone,
  });

  const { passwordHash: _omit, ...safeUser } = user.toObject();
  return NextResponse.json({ user: safeUser }, { status: 201 });
}
