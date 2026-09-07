// Rota PÚBLICA que efetivamente troca a senha, usando o código recebido
// por e-mail (ver forgot-password/route.ts). Confere o e-mail, o código
// (comparando o hash — nunca o código em si) e se ainda não expirou.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const email = parsed.data.email.toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");

  const user = await User.findOne({
    email,
    resetTokenHash: tokenHash,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Peça um novo em 'Esqueci minha senha'." },
      { status: 400 }
    );
  }

  user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  // O código só serve uma vez — some assim que a senha é trocada.
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  return NextResponse.json({ ok: true });
}
