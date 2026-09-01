// Rota que devolve o CONTEÚDO de um anexo (os bytes do arquivo em si),
// para exibir a imagem ou abrir o PDF no navegador.
// Endereço: /api/attachments/ID/file — usado direto num <img src="..."> ou <a href="...">.
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { connectDB } from "@/lib/db";
import { getBucket } from "@/lib/gridfs";
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

  const bucket = await getBucket();
  const downloadStream = bucket.openDownloadStream(attachment.fileId);

  // Converte o stream do Node (usado pelo driver do MongoDB) para o
  // formato de stream que o Next.js espera numa resposta HTTP.
  const webStream = Readable.toWeb(downloadStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
