// Página PÚBLICA "Esqueci minha senha" — pede o e-mail e manda um link
// de redefinição (ver src/app/api/auth/forgot-password/route.ts). Não
// exige login (liberada no middleware, ver src/proxy.ts).
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Sempre mostra a mesma mensagem de sucesso ao final, exista ou não
    // esse e-mail — a rota já faz essa mesma escolha do lado do servidor,
    // aqui só reflete isso na tela.
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-porcelain px-6">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-blue-strong">ClinBox</span>
        </div>

        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-6">
          {sent ? (
            <>
              <h1 className="font-display text-xl font-semibold text-ink mb-1">Verifique seu e-mail</h1>
              <p className="text-sm text-ink-muted mb-6">
                Se <strong>{email}</strong> estiver cadastrado, você vai receber um link pra escolher uma
                senha nova em alguns minutos. Não esqueça de olhar o spam.
              </p>
              <Link href="/login" className="btn-secondary w-full justify-center">
                <ArrowLeft size={15} /> Voltar pro login
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-ink mb-1">Esqueceu a senha?</h1>
              <p className="text-sm text-ink-muted mb-5">
                Digite seu e-mail — mandamos um link pra você escolher uma senha nova.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                    />
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@clinica.com"
                      className="w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition-colors"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-primary">
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    "Enviar link"
                  )}
                </button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar pro login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
