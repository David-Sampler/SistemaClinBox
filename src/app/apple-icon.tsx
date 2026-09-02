// Ícone usado pelo iOS quando o paciente/equipe adiciona o ClinBox à tela
// de início do iPhone/iPad ("apple-touch-icon") — o iOS não usa o
// manifest.json pra isso, precisa desse arquivo específico. Mesmo desenho
// do favicon (icon.tsx), só que maior e sem cantos arredondados (o
// próprio iOS aplica o arredondado dele na hora de mostrar o ícone).
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #1f6fb0, #00203f)",
          color: "#fff",
          fontSize: 108,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
