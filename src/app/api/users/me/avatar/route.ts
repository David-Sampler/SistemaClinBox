// Rota para o usuário logado TROCAR a própria foto de perfil.
// Endereço: /api/users/me/avatar (POST envia uma nova foto).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBucket } from "@/lib/gridfs";
import { User } from "@/models/User";
import { requireSession } from "@/lib/api-auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB é de sobra pra uma foto de perfil

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Envie uma imagem JPG, PNG, WEBP ou GIF" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagem maior que 4 MB" }, { status: 400 });
  }

  await connectDB();
  const bucket = await getBucket("avatars");
  const userId = session!.user.id;

  // Se já existe uma foto antiga, apaga ela antes de guardar a nova —
  // senão o GridFS ia acumular fotos velhas sem ninguém usar.
  const previous = await User.findById(userId).select("avatarFileId");
  if (previous?.avatarFileId) {
    await bucket.delete(previous.avatarFileId).catch(() => {
      // se o arquivo antigo já não existir por algum motivo, tudo bem, seguimos
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadStream = bucket.openUploadStream(`avatar-${userId}`, { metadata: { contentType: file.type } });
  // Erros de gravação chegam pelo evento "error" do stream, não por um
  // callback do end() — versões recentes do driver do MongoDB não
  // passam mais o erro como argumento do callback de conclusão.
  await new Promise<void>((resolve, reject) => {
    uploadStream.once("finish", () => resolve());
    uploadStream.once("error", reject);
    uploadStream.end(buffer);
  });

  await User.findByIdAndUpdate(userId, {
    avatarFileId: uploadStream.id,
    avatarMimeType: file.type,
  });

  return NextResponse.json({ ok: true });
}
