// Componente "ponte" entre o NextAuth e o restante do app no lado do navegador.
// Precisa ser client component porque SessionProvider usa Context/hooks do React.
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
