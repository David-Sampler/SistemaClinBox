// Ícone de 192x192 usado pelo manifest.json (app/manifest.ts) — é o que
// aparece quando o Android/Chrome oferece "Instalar app" e no ícone da
// tela inicial. Fica numa pasta própria (não usa a convenção especial
// "icon.tsx" do Next) porque o manifest precisa de mais de um tamanho,
// e a convenção especial só gera um por arquivo.
import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Preenchimento generoso ao redor do "C": em ícones "maskable" o
          // sistema operacional pode recortar em círculo/quadrado
          // arredondado — sem essa margem, as pontas da letra cortariam.
          padding: "13%",
          background: "linear-gradient(155deg, #1f6fb0, #00203f)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 96,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          C
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
