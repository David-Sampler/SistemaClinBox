// Mesma ideia do icons/192/route.tsx, só que no tamanho maior (512x512)
// que o manifest.json também pede — usado em telas de alta resolução e
// como ícone "maskable" (o Android pode recortar em outros formatos).
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
            fontSize: 256,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          C
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
