// Rota de API de UM usuário específico da equipe: editar dados/papel
// (PUT) e desativar (DELETE — como em pacientes, "excluir" aqui só
// esconde o usuário, nunca apaga: preserva o histórico do que ele
// cadastrou/atendeu). As duas ações são só para administradores.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { userUpdateSchema } from "@/lib/validators";
import { requireSession, requireRole } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();

  // Se está trocando o e-mail, confere que outro usuário já não usa ele.
  if (parsed.data.email) {
    const existing = await User.findOne({ email: parsed.data.email.toLowerCase(), _id: { $ne: id } });
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 });
    }
  }

  // Ninguém tira o próprio acesso de administrador por engano — evita a
  // clínica ficar sem nenhum admin ativo no sistema.
  if (id === session!.user.id && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "Você não pode remover seu próprio papel de administrador" }, { status: 400 });
  }

  const user = await User.findByIdAndUpdate(
    id,
    { ...parsed.data, email: parsed.data.email?.toLowerCase() },
    { new: true }
  ).select("-passwordHash");

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;

  if (id === session!.user.id) {
    return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
