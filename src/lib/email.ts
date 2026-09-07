// Envio de e-mail transacional (hoje só usado pra "esqueci minha senha")
// via Resend — um serviço só pra mandar e-mail, sem mexer no sistema de
// login do ClinBox. Chama a API REST deles direto com "fetch" (em vez de
// instalar o pacote deles) porque é só uma chamada, não vale a pena
// adicionar mais uma dependência pro projeto todo.
const RESEND_API_URL = "https://api.resend.com/emails";
// Precisa ser um endereço @sistemaclinbox.com.br com o domínio verificado
// no Resend — enquanto isso não estiver configurado, o envio falha (ver
// tratamento de erro em forgot-password/route.ts, que nunca deixa isso
// vazar pra tela do usuário).
const FROM_ADDRESS = "ClinBox <naoresponda@sistemaclinbox.com.br>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada — e-mail não enviado");
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend recusou o envio (${res.status}): ${body}`);
  }
}

// Template do e-mail de recuperação de senha — simples, sem depender de
// nenhuma biblioteca de template, só uma string HTML com o navy da marca.
export function resetPasswordEmailHtml(resetUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(155deg, #1f6fb0, #00203f); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 16px;">C</div>
        <span style="font-size: 18px; font-weight: 600; color: #00203f;">ClinBox</span>
      </div>
      <h1 style="font-size: 18px; color: #1a1a1a;">Redefinir sua senha</h1>
      <p style="font-size: 14px; color: #444; line-height: 1.5;">
        Recebemos um pedido pra redefinir a senha da sua conta no ClinBox. Clique no botão abaixo pra escolher uma senha nova — esse link vale por 1 hora.
      </p>
      <p style="margin: 28px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(155deg, #1f6fb0, #00203f); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
          Redefinir senha
        </a>
      </p>
      <p style="font-size: 12px; color: #888; line-height: 1.5;">
        Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.
      </p>
    </div>
  `;
}
