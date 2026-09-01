// Barra de navegação lateral, visível em todas as páginas depois do login.
// Estreita e só com ícones (como softwares clínicos de consultório) — o
// nome de cada seção aparece como dica ao passar o mouse, para não gastar
// espaço horizontal que a tela de trabalho (odontograma, tabelas) precisa.
// Sua cor é fixa por tema (não muda com claro/escuro do sistema
// operacional) — no tema "Azul-saúde" ela é escura, no tema "Clínica
// moderna" ela é clara; ver ThemeToggle e src/app/globals.css.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Users, CalendarDays, Wallet, ShoppingCart, Stethoscope, UserCog, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";

const links = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/servicos", label: "Serviços", icon: Stethoscope },
  { href: "/equipe", label: "Equipe", icon: UserCog },
];

export function Nav({
  userId,
  userName,
  userRole,
}: {
  userId: string;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    dentist: "Dentista",
    staff: "Recepção",
  };

  return (
    // md:pb-16 (bem mais que o padding de cima) é de propósito: em modo
    // de desenvolvimento, o indicador do próprio Next.js fica fixo no
    // canto inferior esquerdo da tela e cobria o botão "Sair" quando ele
    // ficava colado no rodapé — esse respiro extra evita a sobreposição.
    <aside className="print:hidden w-full md:w-[76px] shrink-0 bg-sidebar flex md:flex-col items-center md:h-screen md:sticky md:top-0 py-3 md:pt-5 md:pb-16">
      <Link href="/" className="shrink-0">
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-sidebar-active-text flex items-center justify-center font-display font-semibold">
          C
        </span>
      </Link>

      <nav className="flex-1 flex md:flex-col items-center gap-1 mx-4 md:mx-0 md:mt-8 overflow-x-auto">
        {links.map(({ href, label, icon: Icon }) => {
          // marca o link ativo comparando com a rota atual
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <NavItem key={href} href={href} label={label} active={active}>
              <Icon size={19} strokeWidth={2} />
            </NavItem>
          );
        })}
      </nav>

      <div className="flex md:flex-col items-center gap-1 shrink-0">
        <div className="group relative mb-2 md:mb-1">
          <UserAvatar userId={userId} name={userName} size={36} tone="sidebar" />
          <Tooltip>
            {userName} · {roleLabel[userRole] ?? userRole}
          </Tooltip>
        </div>

        <ThemeToggle />

        {/* Separador antes de Sair — deixa claro que é uma ação diferente
            das outras (não é mais uma seção do sistema, é sair dele) */}
        <div className="h-6 w-px md:h-px md:w-8 bg-sidebar-line mx-1 md:mx-0 md:my-1" />

        <NavItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          label="Sair"
          danger
        >
          <LogOut size={18} />
        </NavItem>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  active,
  danger,
  onClick,
  children,
}: {
  href?: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className = `group relative w-11 h-11 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
    active
      ? "bg-sidebar-active text-sidebar-active-text"
      : danger
        ? "text-sidebar-text-muted hover:bg-danger-soft hover:text-danger"
        : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text"
  }`;

  const content = (
    <>
      {children}
      <Tooltip>{label}</Tooltip>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className} aria-label={label}>
      {content}
    </button>
  );
}

// Dica que aparece ao passar o mouse sobre um ícone da barra lateral,
// já que os rótulos de texto não ficam visíveis o tempo todo.
function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-porcelain opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 z-50 hidden md:block">
      {children}
    </span>
  );
}
