// Rota que devolve o CONTEÚDO de um anexo (os bytes do arquivo em si),
// para exibir a imagem ou abrir o PDF no navegador.
// Endereço: /api/attachments/ID/file — usado direto num <img src="..."> ou <a href="...">.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readBlob } from "@/lib/blob";
import { Attachment } from "@/models/Attachment";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();

  const attachment = await Attachment.findById(id);
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
  }

  const result = await readBlob(attachment.blobUrl);
  if (!result) {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
