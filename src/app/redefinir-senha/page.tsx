// Página PÚBLICA que efetiva a troca de senha — chegou aqui pelo link
// do e-mail (?email=...&token=...). Não exige login (ver src/proxy.ts).
"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível redefinir a senha.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  // Sem e-mail/código na URL, o link foi aberto errado — evita mostrar
  // um formulário que nunca vai funcionar.
  if (!email || !token) {
    return (
      <>
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Link inválido</h1>
        <p className="text-sm text-ink-muted mb-6">
          Esse link de redefinição de senha está incompleto. Peça um novo em &quot;Esqueci minha senha&quot;.
        </p>
        <Link href="/esqueci-senha" className="btn-primary w-full">
          Pedir novo link
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <div className="w-10 h-10 rounded-full bg-success-soft text-success flex items-center justify-center mb-3">
          <CheckCircle2 size={20} />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Senha redefinida!</h1>
        <p className="text-sm text-ink-muted">Levando você pro login...</p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Escolha uma senha nova</h1>
      <p className="text-sm text-ink-muted mb-5">Pra {email}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
            Senha nova
          </label>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition-colors"
            />
          </div>
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-ink mb-1.5">
            Confirmar senha nova
          </label>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition-colors"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3.5 py-2.5">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="w-full btn-primary">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : (
            "Redefinir senha"
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-porcelain px-6">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold text-blue-strong">ClinBox</span>
        </div>
        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-6">
          {/* Suspense é necessário porque useSearchParams precisa de um "limite" de carregamento no Next.js. */}
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
