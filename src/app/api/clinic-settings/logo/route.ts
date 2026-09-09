// Logo da clínica: servir (GET, qualquer usuário logado — os documentos
// impressos precisam exibir), enviar uma nova (POST) e remover (DELETE)
// — as duas últimas só admin, mesma regra de src/app/api/clinic-settings/route.ts.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { uploadBlob, deleteBlob, readBlob } from "@/lib/blob";
import { getClinicSettings } from "@/models/ClinicSettings";
import { requireSession, requireRole } from "@/lib/api-auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const settings = await getClinicSettings();
  if (!settings.logoBlobUrl) {
    return NextResponse.json({ error: "Sem logo cadastrada" }, { status: 404 });
  }

  const etag = `"${settings.logoBlobUrl}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  const result = await readBlob(settings.logoBlobUrl);
  if (!result) {
    return NextResponse.json({ error: "Sem logo cadastrada" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": settings.logoMimeType || "image/png",
      "Cache-Control": "private, no-cache",
      ETag: etag,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Envie uma imagem JPG, PNG, WEBP ou SVG" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagem maior que 4 MB" }, { status: 400 });
  }

  await connectDB();
  const settings = await getClinicSettings();

  if (settings.logoBlobUrl) {
    await deleteBlob(settings.logoBlobUrl);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await uploadBlob(`clinic-settings/logo`, buffer, file.type);

  settings.logoBlobUrl = blob.url;
  settings.logoMimeType = file.type;
  settings.updatedBy = session!.user.id as any;
  await settings.save();

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["admin"]);
  if (forbidden) return forbidden;

  await connectDB();
  const settings = await getClinicSettings();
  if (settings.logoBlobUrl) {
    await deleteBlob(settings.logoBlobUrl);
  }
  settings.logoBlobUrl = undefined;
  settings.logoMimeType = undefined;
  await settings.save();

  return NextResponse.json({ ok: true });
}
