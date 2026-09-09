// Busca nome + logo da clínica pra usar no cabeçalho dos documentos
// impressos (atestado, receita, orçamento). A logo vem como data URI
// (base64 embutido) já pronta pra um <img src="...">, porque essas
// páginas de impressão são Server Components que renderizam o papel
// direto — embutir evita uma segunda requisição autenticada só pra
// buscar a imagem.
import { getClinicSettings } from "@/models/ClinicSettings";
import { readBlobBuffer } from "./blob";

export async function getClinicBranding() {
  const settings = await getClinicSettings();

  let logoDataUri: string | null = null;
  if (settings.logoBlobUrl) {
    const buffer = await readBlobBuffer(settings.logoBlobUrl);
    if (buffer) {
      logoDataUri = `data:${settings.logoMimeType || "image/png"};base64,${buffer.toString("base64")}`;
    }
  }

  return { name: settings.name, logoDataUri };
}
