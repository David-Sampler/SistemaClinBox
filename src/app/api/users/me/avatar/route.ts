// Rota para o usuário logado TROCAR a própria foto de perfil.
// Endereço: /api/users/me/avatar (POST envia uma nova foto).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { uploadBlob, deleteBlob } from "@/lib/blob";
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
  const userId = session!.user.id;

  // Se já existe uma foto antiga, apaga ela antes de guardar a nova —
  // senão o Blob ia acumular fotos velhas sem ninguém usar.
  const previous = await User.findById(userId).select("avatarBlobUrl");
  if (previous?.avatarBlobUrl) {
    await deleteBlob(previous.avatarBlobUrl);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await uploadBlob(`avatars/${userId}`, buffer, file.type);

  await User.findByIdAndUpdate(userId, {
    avatarBlobUrl: blob.url,
    avatarMimeType: file.type,
  });

  return NextResponse.json({ ok: true });
}
