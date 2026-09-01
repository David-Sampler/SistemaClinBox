// Botão/ícone que abre uma conversa no WhatsApp com o número informado.
// Usado em toda tela que mostra um telefone de contato (paciente,
// contato de emergência, membro da equipe) — assim quem está atendendo
// não precisa copiar o número, é só clicar no ícone verde.
"use client";

import { MessageCircle } from "lucide-react";

// Monta o link "wa.me": o WhatsApp exige o número em formato internacional,
// só dígitos (sem espaço, parênteses ou traço) e com o código do país na
// frente. Aqui assumimos Brasil (55) quando o número não já vier com ele.
function toWhatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // já tem código do país (13 dígitos: 55 + DDD + 9 dígitos) — usa como está
  const withCountryCode = digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

export function WhatsAppLink({
  phone,
  size = 16,
  className = "",
}: {
  phone?: string | null;
  size?: number;
  className?: string;
}) {
  if (!phone) return null;
  const href = toWhatsAppHref(phone);
  if (!href) return null;

  // É um <button>, não um <a>, de propósito: em várias telas esse ícone
  // fica dentro de outro link clicável (a linha do paciente na lista, por
  // exemplo) — um <a> dentro de outro <a> é HTML inválido e quebra a
  // hidratação do React. window.open faz o mesmo efeito sem esse problema.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
      title={`Chamar no WhatsApp: ${phone}`}
      aria-label={`Chamar ${phone} no WhatsApp`}
      className={`inline-flex items-center justify-center rounded-full bg-success-soft text-success hover:bg-success hover:text-white transition-colors shrink-0 ${className}`}
      style={{ width: size + 12, height: size + 12 }}
    >
      <MessageCircle size={size} strokeWidth={2} />
    </button>
  );
}
