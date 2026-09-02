// Ícone da aba do navegador (favicon), gerado por código em vez de um
// arquivo de imagem — reaproveita exatamente as mesmas cores da
// "caixinha C" usada no login e na tela de abertura (ver .login-logo-badge
// em globals.css), então não precisa manter dois lugares em sincronia.
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(155deg, #1f6fb0, #00203f)",
          color: "#fff",
          fontSize: 20,
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
