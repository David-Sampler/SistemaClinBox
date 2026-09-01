// Layout que envolve TODAS as páginas internas do sistema (depois do login):
// dashboard, pacientes, agenda, financeiro, equipe.
// Roda no servidor: busca a sessão do usuário e monta a barra de navegação
// e a barra do topo (foto + nome de quem está logado).
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { UserMenu } from "@/components/user-menu";
import { PermissionsProvider } from "@/components/permissions-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Essa verificação é uma segunda camada de proteção (o middleware já cuida disso),
  // evitando erro caso a sessão não venha preenchida por algum motivo.
  if (!session?.user) {
    return null;
  }

  const userName = session.user.name ?? "Usuário";

  return (
    <PermissionsProvider>
      <div className="flex flex-col md:flex-row min-h-screen">
        <Nav userId={session.user.id} userName={userName} userRole={session.user.role} />
        <main className="flex-1 flex flex-col overflow-x-hidden">
          <UserMenu userId={session.user.id} userName={userName} userRole={session.user.role} />
          <div className="flex-1 p-4 md:p-8">{children}</div>
        </main>
      </div>
    </PermissionsProvider>
  );
}
