// Webhook do WhatsApp Cloud API (Meta) — é o endereço que o Meta chama
// pra falar com o ClinBox, em duas situações diferentes:
//
// 1. VERIFICAÇÃO (GET): quando você cola essa URL no painel do Meta e
//    clica em "Verificar e salvar", o Meta manda um GET com um "desafio"
//    (hub.challenge) e o token secreto que você digitou lá (hub.verify_token).
//    Se o token bater com o nosso (WHATSAPP_VERIFY_TOKEN), devolvemos o
//    challenge de volta e o Meta considera a URL confirmada.
//
// 2. EVENTOS (POST): depois de verificado, toda mensagem recebida (um
//    paciente respondendo) ou atualização de status (entregue/lida/falhou)
//    chega aqui como POST. Por enquanto só registramos no log — a lógica
//    de responder automaticamente ou marcar status de agendamento vem
//    numa próxima etapa, depois que o número de produção estiver ativo.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // Precisa devolver o challenge como texto puro, sem aspas/JSON.
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Token de verificação inválido", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Confere a assinatura da requisição (garante que quem chamou foi
  // realmente o Meta, e não alguém tentando forjar um evento) — só roda
  // se o segredo do app já estiver configurado, pra não travar antes disso.
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256")?.replace("sha256=", "");
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (!signature || signature !== expected) {
      return new NextResponse("Assinatura inválida", { status: 401 });
    }
  }

  const body = JSON.parse(rawBody || "{}");
  // TODO: quando o número de produção estiver ativo, tratar aqui:
  // - body.entry[].changes[].value.messages (mensagem recebida de um paciente)
  // - body.entry[].changes[].value.statuses (confirmação de entrega/leitura)
  console.log("Webhook WhatsApp recebido:", JSON.stringify(body));

  // O Meta espera sempre um 200 rápido — se não responder, ele reenvia o
  // mesmo evento várias vezes.
  return NextResponse.json({ received: true });
}
