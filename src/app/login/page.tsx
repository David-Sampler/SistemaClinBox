// Página de LOGIN. É a única página pública do sistema (veja src/middleware.ts).
// Como precisa de interação (formulário, estado de erro/loading), é um "client component".
"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

// Frases que revezam no painel de marca do login — todas em torno do
// mesmo tema (saúde bucal e o dia a dia da clínica), pra dar vida à
// tela sem fugir do que o sistema realmente é.
const TAGLINES = [
  "Cada consulta, cada dente, cada real — num só lugar.",
  "Prevenção é o melhor tratamento — e o mais barato.",
  "Saúde bucal é saúde geral. Cuide de perto.",
  "Menos papelada, mais tempo pra cuidar de quem importa.",
  "Um sorriso bem cuidado começa num consultório bem organizado.",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Se o usuário tentou acessar uma página protegida sem estar logado,
  // o middleware guarda essa URL em "callbackUrl" para voltar pra lá depois do login.
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Troca a frase do painel de marca a cada 9 segundos — devagar o
  // suficiente pra dar tempo de ler antes de trocar.
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // signIn com redirect:false deixa a gente tratar o erro na própria tela,
    // em vez de o NextAuth redirecionar automaticamente.
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-porcelain">
      {/* Painel de marca — some em telas pequenas */}
      <div className="login-brand-panel hidden md:flex flex-col justify-between text-sidebar-text p-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-soft/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-20 bottom-10 w-80 h-80 rounded-full bg-brass/15 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute right-1/4 bottom-1/3 w-64 h-64 rounded-full bg-success/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5 fade-up">
          <span className="login-logo-badge w-9 h-9 rounded-md text-white flex items-center justify-center font-display font-semibold">
            C
          </span>
          <span className="font-display text-xl font-semibold text-sidebar-heading">ClinBox</span>
        </div>

        <div className="relative space-y-4 max-w-sm fade-up" style={{ animationDelay: "80ms" }}>
          {/* min-height evita que o texto "pule" ao trocar de frase */}
          <p
            key={taglineIndex}
            className="fade-slow font-display text-3xl leading-snug text-sidebar-heading text-balance min-h-[5.5rem]"
          >
            {TAGLINES[taglineIndex]}
          </p>
          <p className="text-sidebar-text-muted text-[0.95rem] leading-relaxed">
            Prontuário, odontograma, agenda e financeiro da clínica, acessíveis
            para toda a equipe, com o histórico do paciente sempre à mão.
          </p>
        </div>

        <p className="relative text-xs text-sidebar-text-muted">
          Sistema de gestão odontológica
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center px-6 py-16 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full bg-blue-soft/40 blur-3xl pointer-events-none"
        />
        <div className="relative w-full max-w-sm fade-up">
          <div className="mb-8 md:hidden text-center">
            <span className="font-display text-2xl font-semibold text-blue-strong">
              ClinBox
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Entrar</h1>
          <p className="text-ink-muted text-sm mb-8">Acesse o painel da sua clínica</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  className="w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition-colors"
                  placeholder="voce@clinica.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  className="w-full rounded-lg border border-line bg-surface pl-10 pr-10 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <p className="text-xs text-ink-faint mt-1.5">
                Esqueceu a senha? Peça para um administrador redefinir em Equipe.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="anim-shake text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3.5 py-2.5"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Suspense é necessário porque useSearchParams precisa de um "limite" de carregamento no Next.js.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
