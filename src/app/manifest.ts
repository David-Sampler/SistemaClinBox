// Arquivo especial do Next.js: gera o manifest.json/manifest.webmanifest
// que faz o navegador oferecer "Instalar app" (Android/Chrome/desktop) —
// isso é o que transforma o ClinBox num PWA (Progressive Web App): um
// ícone na tela inicial que abre em tela cheia, sem barra de endereço,
// mesmo continuando a ser o mesmo site por baixo (sem instalação de
// verdade em loja de aplicativo).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClinBox — Gestão para clínicas odontológicas",
    short_name: "ClinBox",
    description: "Sistema de gestão para clínicas odontológicas: agenda, pacientes, prontuário e financeiro.",
    start_url: "/",
    // "standalone" tira a barra de endereço do navegador quando aberto
    // pelo ícone instalado — fica com cara de aplicativo de verdade.
    display: "standalone",
    // Mesmo navy fixo usado no painel de marca do login e na tela de
    // abertura (ver .login-brand-panel/.splash-screen em globals.css) —
    // é a cor que aparece atrás enquanto o app carrega, instalado.
    background_color: "#00203f",
    theme_color: "#00203f",
    lang: "pt-BR",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
