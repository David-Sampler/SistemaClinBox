// Botão/ícone que abre uma conversa no WhatsApp com o número informado.
// Usado em toda tela que mostra um telefone de contato (paciente,
// contato de emergência, membro da equipe) — assim quem está atendendo
// não precisa copiar o número, é só clicar no ícone verde.
"use client";

import { toWhatsAppNumber } from "@/lib/phone";

// Glifo oficial do WhatsApp (balão + telefone), num único path — usado no
// lugar de um ícone genérico de "mensagem" pra deixar claro qual app abre.
function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.926 11.926 0 005.71 1.447h.006c6.585 0 11.946-5.36 11.949-11.945a11.9 11.9 0 00-3.495-8.421" />
    </svg>
  );
}

// Monta o link "wa.me": o WhatsApp exige o número em formato internacional,
// só dígitos (sem espaço, parênteses ou traço) e com o código do país na
// frente — a normalização vive em toWhatsAppNumber() (src/lib/phone.ts),
// compartilhada com o envio pela API oficial.
// "message" é opcional: sem ela, só abre a conversa (comportamento de
// sempre); com ela, o texto já vem digitado no campo — a pessoa ainda
// vê e confirma antes de mandar (o WhatsApp nunca envia sozinho por um
// link "wa.me", só preenche), por isso serve bem pra um lembrete
// manual (não é a automação da API oficial).
function toWhatsAppHref(phone: string, message?: string) {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function WhatsAppLink({
  phone,
  size = 16,
  className = "",
  message,
  label,
}: {
  phone?: string | null;
  size?: number;
  className?: string;
  // Texto pré-preenchido (ex: lembrete de consulta, parabéns de
  // aniversário) — a pessoa que está mandando ainda revisa antes de
  // enviar, só poupa de digitar do zero.
  message?: string;
  // Quando informado, vira um botão com texto (ex: "Enviar lembrete")
  // em vez do ícone circular padrão usado ao lado de um telefone.
  label?: string;
}) {
  if (!phone) return null;
  const href = toWhatsAppHref(phone, message);
  if (!href) return null;

  // É um <button>, não um <a>, de propósito: em várias telas esse ícone
  // fica dentro de outro link clicável (a linha do paciente na lista, por
  // exemplo) — um <a> dentro de outro <a> é HTML inválido e quebra a
  // hidratação do React. window.open faz o mesmo efeito sem esse problema.
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  if (label) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-success px-3.5 py-2 text-sm font-semibold text-white shadow-[0_1px_2px_color-mix(in_srgb,var(--success)_45%,transparent),0_1px_1px_color-mix(in_srgb,black_6%,transparent)] transition-all hover:-translate-y-px hover:brightness-105 hover:shadow-[0_6px_16px_-4px_color-mix(in_srgb,var(--success)_50%,transparent)] active:translate-y-0 active:brightness-95 ${className}`}
      >
        <WhatsAppGlyph size={16} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Chamar no WhatsApp: ${phone}`}
      aria-label={`Chamar ${phone} no WhatsApp`}
      className={`inline-flex items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-success/20 shadow-sm transition-all hover:-translate-y-px hover:bg-success hover:text-white hover:shadow-md active:translate-y-0 shrink-0 ${className}`}
      style={{ width: size + 14, height: size + 14 }}
    >
      <WhatsAppGlyph size={size} />
    </button>
  );
}
