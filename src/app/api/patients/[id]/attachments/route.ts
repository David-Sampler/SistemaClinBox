// Rota de API dos ANEXOS de um paciente: listar (GET) e enviar um novo
// arquivo (POST — radiografia, foto ou documento).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getBucket } from "@/lib/gridfs";
import { Attachment, AttachmentCategory } from "@/models/Attachment";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// Tipos de arquivo aceitos e tamanho máximo (15 MB) — evita que alguém
// suba um arquivo gigante ou de um tipo que o sistema não sabe exibir.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_SIZE = 15 * 1024 * 1024;
const CATEGORIES: AttachmentCategory[] = ["radiografia", "foto", "documento", "outro"];

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await connectDB();
  const attachments = await Attachment.find({ patient: id })
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ attachments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  // Upload de arquivo usa "multipart/form-data", não JSON — por isso
  // lemos com req.formData() em vez de req.json() como nas outras rotas.
  const formData = await req.formData();
  const file = formData.get("file");
  const category = formData.get("category");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione um arquivo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Envie imagem (JPG, PNG, WEBP, GIF) ou PDF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo maior que 15 MB" }, { status: 400 });
  }
  const safeCategory = CATEGORIES.includes(category as AttachmentCategory)
    ? (category as AttachmentCategory)
    : "outro";

  await connectDB();
  const bucket = await getBucket();

  // Guarda o conteúdo do arquivo no GridFS (fora do documento do Mongoose,
  // que só guarda os metadados) e espera a gravação terminar.
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadStream = bucket.openUploadStream(file.name, { metadata: { contentType: file.type } });
  // Erros de gravação chegam pelo evento "error" do stream, não por um
  // callback do end() — versões recentes do driver do MongoDB não
  // passam mais o erro como argumento do callback de conclusão.
  await new Promise<void>((resolve, reject) => {
    uploadStream.once("finish", () => resolve());
    uploadStream.once("error", reject);
    uploadStream.end(buffer);
  });

  const attachment = await Attachment.create({
    patient: id,
    fileId: uploadStream.id,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    category: safeCategory,
    uploadedBy: session!.user.id,
  });

  return NextResponse.json({ attachment }, { status: 201 });
}
