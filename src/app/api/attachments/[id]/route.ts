// Rota para EXCLUIR um anexo: remove tanto o registro (metadados) quanto
// o arquivo em si, guardado no GridFS.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBucket } from "@/lib/gridfs";
import { Attachment } from "@/models/Attachment";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();

  const attachment = await Attachment.findById(id);
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
  }

  const bucket = await getBucket();
  await bucket.delete(attachment.fileId);
  await Attachment.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}
