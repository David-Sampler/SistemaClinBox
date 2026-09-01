// Middleware = código que roda ANTES de toda requisição chegar às páginas,
// dentro do Edge Runtime (um ambiente mais restrito que o Node.js normal).
// Aqui usamos para "trancar a porta": se o usuário não estiver logado,
// ele é redirecionado para /login antes de conseguir ver qualquer página do sistema.
//
// Importamos de "@/auth.config" (não de "@/auth") porque esse arquivo é
// livre de bibliotecas Node-only como bcrypt/mongoose, que quebrariam no Edge Runtime.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Páginas que qualquer pessoa (mesmo sem login) pode acessar
const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.some((path) => req.nextUrl.pathname.startsWith(path));
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  if (isPublic || isApiAuth) return NextResponse.next();

  // Se não há sessão (usuário não logado), manda para o login,
  // guardando a página que ele tentou acessar para voltar depois do login.
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
