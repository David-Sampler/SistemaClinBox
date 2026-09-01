// Funções auxiliares usadas em TODAS as rotas de API para checar login e permissão,
// evitando repetir essa lógica em cada arquivo de rota.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Garante que existe um usuário logado. Se não houver, já devolve a resposta
// de erro 401 pronta para a rota simplesmente retornar.
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  return { session, error: null };
}

// Garante que o papel (role) do usuário logado está na lista de papéis permitidos
// para aquela ação (ex: só admin pode cadastrar usuário).
export function requireRole(role: string | undefined, allowed: string[]) {
  if (!role || !allowed.includes(role)) {
    return NextResponse.json({ error: "Sem permissão para esta ação" }, { status: 403 });
  }
  return null;
}
