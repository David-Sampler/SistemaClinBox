// Parte da configuração de autenticação que precisa ser "leve" o suficiente
// para rodar no Edge Runtime (usado pelo middleware.ts).
// Por isso NÃO importamos aqui nada que dependa de Node.js "pesado"
// (como bcrypt ou mongoose) — essas partes ficam só em src/auth.ts.
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  // A lista de providers fica vazia aqui de propósito: o provider de
  // Credentials (que usa bcrypt e MongoDB) é adicionado só em src/auth.ts.
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "dentist" | "staff";
      }
      return session;
    },
  },
};
