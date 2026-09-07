// Rota PÚBLICA (não exige login — está sob /api/auth, liberado no
// middleware) que recebe um e-mail e, se existir um usuário com ele,
// manda um link de redefinição de senha. Sempre responde a mesma
// mensagem de sucesso, exista ou não esse e-mail cadastrado — assim
// ninguém descobre "quem tem conta no sistema" só tentando e-mails.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { forgotPasswordSchema } from "@/lib/validators";
import { sendEmail, resetPasswordEmailHtml } from "@/lib/email";

const GENERIC_RESPONSE = {
  ok: true,
  message: "Se esse e-mail estiver cadastrado, enviamos um link de redefinição de senha.",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const email = parsed.data.email.toLowerCase();
  const user = await User.findOne({ email, active: true });

  // Não existe esse e-mail (ou está desativado) — responde igual, sem
  // avisar que não encontrou nada.
  if (!user) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Gera um código aleatório (o que vai no link) e guarda só o HASH dele
  // no banco — mesmo raciocínio de nunca guardar senha em texto puro.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetTokenHash = tokenHash;
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await user.save();

  const resetUrl = `${req.nextUrl.origin}/redefinir-senha?email=${encodeURIComponent(email)}&token=${rawToken}`;

  try {
    await sendEmail({
      to: email,
      subject: "Redefinir sua senha — ClinBox",
      html: resetPasswordEmailHtml(resetUrl),
    });
  } catch (err) {
    // Erro de envio (ex: Resend ainda não configurado) fica só no log do
    // servidor — a resposta pro navegador continua genérica, por segurança
    // e porque um erro técnico aqui não é "culpa" de quem pediu o link.
    console.error("Falha ao enviar e-mail de redefinição de senha:", err);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
