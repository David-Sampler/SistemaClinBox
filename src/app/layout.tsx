import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import "./globals.css";

// Fonte única do sistema: a mesma família (Geist) usada por painéis
// modernos conhecidos — limpa, neutra e muito legível em telas de trabalho.
// Os títulos usam peso mais forte da própria fonte, sem trocar de família.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClinBox",
  description: "Sistema de gestão para clínicas odontológicas",
  // "appleWebApp" é o que faz o iOS tratar o ClinBox como um app de
  // verdade quando alguém usa "Adicionar à Tela de Início" no Safari:
  // some a barra do navegador e usa o ícone de apple-icon.tsx. O iOS não
  // lê o manifest.json pra isso, só esses metadados específicos.
  appleWebApp: {
    title: "ClinBox",
    statusBarStyle: "black-translucent",
  },
};

// Cor da barra do navegador/status bar quando o sistema é aberto — mesmo
// navy fixo do painel de marca do login e da tela de abertura, pra ficar
// consistente também quando instalado como app (ver manifest.ts).
export const viewport: Viewport = {
  themeColor: "#00203f",
};

// Roda antes da página pintar na tela: lê o tema salvo no navegador e
// já aplica no <html>, para não "piscar" o tema errado por uma fração
// de segundo antes do React assumir (é por isso que não é um useEffect).
const themeInitScript = `
  try {
    const p = localStorage.getItem("clinbox-palette");
    const tokens = {
      saude: {
        '--porcelain': '#0a151c',
        '--page-bg-top': '#16262f',
        '--page-bg-bottom': '#0a141a',
        '--surface': '#162936',
        '--surface-soft': '#1c313f',
        '--ink': '#eef3f6',
        '--ink-muted': '#9db0bb',
        '--ink-faint': '#677b86',
        '--line': '#25404f',
      },
      clinic: {
        '--porcelain': '#f3f1fb',
        '--page-bg-top': '#ffffff',
        '--page-bg-bottom': '#f1eefa',
        '--surface': '#ffffff',
        '--surface-soft': '#f4f1fb',
        '--ink': '#221c3b',
        '--ink-muted': '#8886a1',
        '--ink-faint': '#b7b4c9',
        '--line': '#ebe7f7',
      },
      green: {
        '--porcelain': '#0b0b0d',
        '--page-bg-top': '#121214',
        '--page-bg-bottom': '#0b0b0d',
        '--surface': '#19191c',
        '--surface-soft': '#222226',
        '--ink': '#f5f5f3',
        '--ink-muted': '#a8a8ae',
        '--ink-faint': '#6e6e74',
        '--line': '#2c2c31',
      },
    };
    const active = p && tokens[p] ? p : 'saude';
    const root = document.documentElement;
    const body = document.body;
    Object.entries(tokens[active]).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
    if (active === 'saude') {
      root.removeAttribute('data-palette');
      body.style.background = 'linear-gradient(180deg, #16262f 0%, #0a141a 100%)';
      body.style.backgroundColor = '#0a141a';
      body.style.color = tokens.saude['--ink'];
    } else {
      root.setAttribute('data-palette', active);
      body.style.background = 'linear-gradient(180deg, ' + tokens[active]['--page-bg-top'] + ' 0%, ' + tokens[active]['--page-bg-bottom'] + ' 100%)';
      body.style.backgroundColor = tokens[active]['--porcelain'];
      body.style.color = tokens[active]['--ink'];
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} h-full antialiased`}
      // O script de tema (abaixo) muda o atributo data-palette no <html>
      // antes do React hidratar — isso é esperado, então avisamos o
      // React pra não tratar como um erro de hidratação.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-porcelain text-ink">
        {/* "beforeInteractive" garante que isso rode antes da página
            pintar — é a forma que o Next.js recomenda para esse tipo
            de script (evitar flash de tema errado). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {/* Tela de abertura: puro CSS (ver .splash-screen em globals.css),
            some sozinha depois de um instante — não precisa de JS nem
            de estado React, então nunca atrasa a página de verdade. */}
        <div className="splash-screen" aria-hidden="true">
          <div className="splash-screen-logo">
            <span className="login-logo-badge w-12 h-12 rounded-xl text-white flex items-center justify-center font-display font-semibold text-xl">
              C
            </span>
            <span className="font-display text-2xl font-semibold text-white">ClinBox</span>
          </div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
