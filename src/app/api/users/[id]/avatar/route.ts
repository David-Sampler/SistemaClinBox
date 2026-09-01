// Rota que devolve a FOTO DE PERFIL de um usuário (os bytes da imagem).
// Endereço: /api/users/ID/avatar — usado direto num <img src="...">.
// Se o usuário não tiver foto, devolve 404 (o componente no front usa
// isso pra cair de volta nas iniciais do nome).
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { connectDB } from "@/lib/db";
import { getBucket } from "@/lib/gridfs";
import { User } from "@/models/User";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select("avatarFileId avatarMimeType");
  if (!user?.avatarFileId) {
    return NextResponse.json({ error: "Sem foto de perfil" }, { status: 404 });
  }

  const bucket = await getBucket("avatars");
  const downloadStream = bucket.openDownloadStream(user.avatarFileId);
  const webStream = Readable.toWeb(downloadStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": user.avatarMimeType || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
