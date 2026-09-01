// Mostra a FOTO DE PERFIL de um usuário — ou, se ele não tiver uma
// cadastrada (ou a imagem falhar ao carregar), cai de volta na
// "inicial" do nome dentro de um círculo colorido, como Slack/Gmail
// fazem. `tone` ajusta as cores do círculo pro fundo em que ele está
// (a barra lateral é escura, o topo da página é claro).
"use client";

import { useState } from "react";

export function UserAvatar({
  userId,
  name,
  size = 36,
  tone = "default",
  version,
  className = "",
}: {
  userId: string;
  name: string;
  size?: number;
  tone?: "default" | "sidebar";
  version?: number;
  className?: string;
}) {
  const src = `/api/users/${userId}/avatar${version ? `?v=${version}` : ""}`;
  // Guardamos QUAL src falhou (não só "falhou ou não") — assim, se o
  // src mudar depois (ex: acabou de enviar uma foto nova), o componente
  // tenta carregar de novo em vez de ficar preso nas iniciais para sempre.
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const fallbackClasses =
    tone === "sidebar" ? "bg-sidebar-hover text-sidebar-text" : "bg-blue-soft text-blue-strong";

  if (erroredSrc === src) {
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${fallbackClasses} ${className}`}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size }}
      className={`rounded-full object-cover shrink-0 ${className}`}
      onError={() => setErroredSrc(src)}
    />
  );
}
