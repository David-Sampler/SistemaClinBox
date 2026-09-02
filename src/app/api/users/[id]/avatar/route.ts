// Rota que devolve a FOTO DE PERFIL de um usuário (os bytes da imagem).
// Endereço: /api/users/ID/avatar — usado direto num <img src="...">.
// Se o usuário não tiver foto, devolve 404 (o componente no front usa
// isso pra cair de volta nas iniciais do nome).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readBlob } from "@/lib/blob";
import { User } from "@/models/User";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select("avatarBlobUrl avatarMimeType");
  if (!user?.avatarBlobUrl) {
    return NextResponse.json({ error: "Sem foto de perfil" }, { status: 404 });
  }

  // A URL do Blob muda toda vez que a foto é trocada (o upload apaga o
  // arquivo antigo e cria um novo, com um sufixo aleatório diferente) —
  // então ela serve perfeitamente como ETag: sem precisar cada tela
  // lembrar de "furar" o cache na unha (como o "?v=" que só o topo da
  // página fazia antes, deixando a barra lateral e a tela inicial
  // presas na foto antiga).
  const etag = `"${user.avatarBlobUrl}"`;
  if (_req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  const result = await readBlob(user.avatarBlobUrl);
  if (!result) {
    return NextResponse.json({ error: "Sem foto de perfil" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": user.avatarMimeType || "image/jpeg",
      // "no-cache" não significa "não guarda" — significa "guarda, mas
      // sempre confirma com o servidor antes de reusar" (via ETag). Isso
      // garante que uma foto nova aparece na hora em qualquer tela,
      // sem precisar de um parâmetro "?v=" manual em cada lugar.
      "Cache-Control": "private, no-cache",
      ETag: etag,
    },
  });
}
