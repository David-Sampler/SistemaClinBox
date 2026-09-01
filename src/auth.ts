// Configuração central de AUTENTICAÇÃO (login) do sistema, usando a biblioteca NextAuth.
// Aqui definimos COMO um usuário faz login (e-mail + senha) e O QUE fica
// disponível na "sessão" dele depois de logado (id e role/papel).
//
// Este arquivo usa bcrypt e mongoose (bibliotecas "pesadas" de Node.js), então
// só pode ser importado em lugares que rodam em ambiente Node normal —
// rotas de API e páginas do servidor. O middleware.ts (que roda no Edge
// Runtime) usa a versão "leve" em src/auth.config.ts.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // "Credentials" = login tradicional por e-mail e senha (não usa Google/Facebook etc)
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // Função chamada a cada tentativa de login. Se retornar null, o login falha.
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        await connectDB();
        // só permite login de usuário ativo (active: true)
        const user = await User.findOne({ email: email.toLowerCase(), active: true });
        if (!user) return null;

        // Compara a senha digitada com o hash guardado no banco
        // (nunca comparamos a senha "crua", só o hash — bcrypt cuida disso)
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Esses dados ficam disponíveis para os callbacks abaixo (jwt/session)
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  // callbacks (jwt/session) e pages já vêm de authConfig (veja src/auth.config.ts)
});
