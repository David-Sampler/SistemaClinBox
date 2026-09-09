// Acesso ao VERCEL BLOB: onde ficam os arquivos enviados (radiografias,
// fotos de anexo do paciente, fotos de perfil). Substitui o GridFS do
// MongoDB (guardar arquivo binário dentro do próprio banco funcionava,
// mas cada leitura custava idas e vindas extras ao Atlas — o Blob serve
// os arquivos por CDN, mais rápido, e deixa o banco só com os metadados).
//
// A store é PRIVADA (configurada assim na Vercel): ninguém abre a URL
// do arquivo direto sem o token de acesso — o arquivo só é servido
// através das nossas próprias rotas de API, que já exigem login (igual
// funcionava com o GridFS). Isso importa porque são dados de paciente.
//
// O token "BLOB_READ_WRITE_TOKEN" (variável de ambiente, configurada na
// Vercel e no .env.local) autentica tudo automaticamente — as funções
// abaixo não precisam recebê-lo.
import { put, get, del } from "@vercel/blob";

// Envia um arquivo novo. "pathname" é tipo um "nome de arquivo com
// pastas" (ex: "avatars/ID_DO_USUARIO") — o Blob adiciona um sufixo
// aleatório sozinho (addRandomSuffix) pra nunca sobrescrever por engano
// e pra cada envio gerar uma URL nova (o que já serve de "cache-buster"
// automático quando alguém troca a foto).
export async function uploadBlob(pathname: string, buffer: Buffer, contentType: string) {
  return put(pathname, buffer, {
    access: "private",
    addRandomSuffix: true,
    contentType,
  });
}

// Busca o conteúdo (stream) + metadados de um arquivo já salvo, pelo URL
// guardado no banco. Devolve null se o arquivo não existir mais.
export async function readBlob(url: string) {
  return get(url, { access: "private" });
}

// Apaga um arquivo. Não reclama se ele já não existir (mesmo
// comportamento que o .catch(() => {}) usado com o GridFS antes).
export async function deleteBlob(url: string) {
  await del(url).catch(() => {});
}

// Lê um arquivo inteiro pra um Buffer (em vez do stream que readBlob
// devolve) — usado quando precisamos EMBUTIR o arquivo direto no HTML
// (ex: a logo da clínica como base64 numa página de impressão), e não
// só repassar os bytes numa resposta de API.
export async function readBlobBuffer(url: string) {
  const result = await readBlob(url);
  if (!result) return null;

  if (!result.stream) return null;

  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}
