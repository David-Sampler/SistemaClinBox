import type { Metadata } from "next";
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
  title: "SISODONTO",
  description: "Sistema de gestão para clínicas odontológicas",
};

// Roda antes da página pintar na tela: lê o tema salvo no navegador e
// já aplica no <html>, para não "piscar" o tema errado por uma fração
// de segundo antes do React assumir (é por isso que não é um useEffect).
const themeInitScript = `
  try {
    var p = localStorage.getItem("sisodonto-palette");
    if (p === "clinic" || p === "green") document.documentElement.setAttribute("data-palette", p);
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
