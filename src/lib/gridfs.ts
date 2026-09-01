// Acesso ao GridFS: o "sistema de arquivos" embutido no MongoDB, usado
// para guardar os arquivos enviados (radiografias, fotos, documentos,
// fotos de perfil) sem precisar de um serviço externo de armazenamento
// (S3, etc). O GridFS quebra o arquivo em pedaços e guarda numa coleção
// separada do banco — por isso não usamos um "Schema" do Mongoose para
// ele, usamos a API nativa do driver do MongoDB (GridFSBucket).
// "GridFSBucket" vem do driver do MongoDB embutido dentro do próprio
// Mongoose (mongoose.mongo), não do pacote "mongodb" separado — o
// Mongoose empacota sua própria cópia do driver, e misturar as duas
// (driver avulso + driver do Mongoose) faz o TypeScript enxergar dois
// tipos "Db" incompatíveis entre si, mesmo sendo estruturalmente iguais.
import mongoose from "mongoose";
import { connectDB } from "./db";

// Cada tipo de arquivo fica no seu próprio "balde" (bucket), pra não
// misturar radiografias de pacientes com fotos de perfil de usuários.
export async function getBucket(bucketName: "attachments" | "avatars" = "attachments") {
  const mongooseInstance = await connectDB();
  const db = mongooseInstance.connection.db;
  if (!db) throw new Error("Conexão com o banco não está pronta");
  return new mongoose.mongo.GridFSBucket(db, { bucketName });
}
