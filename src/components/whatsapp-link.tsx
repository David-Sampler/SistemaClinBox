// Botão/ícone que abre uma conversa no WhatsApp com o número informado.
// Usado em toda tela que mostra um telefone de contato (paciente,
// contato de emergência, membro da equipe) — assim quem está atendendo
// não precisa copiar o número, é só clicar no ícone verde.
"use client";

import { MessageCircle } from "lucide-react";

// Monta o link "wa.me": o WhatsApp exige o número em formato internacional,
// só dígitos (sem espaço, parênteses ou traço) e com o código do país na
// frente. Aqui assumimos Brasil (55) quando o número não já vier com ele.
// "message" é opcional: sem ela, só abre a conversa (comportamento de
// sempre); com ela, o texto já vem digitado no campo — a pessoa ainda
// vê e confirma antes de mandar (o WhatsApp nunca envia sozinho por um
// link "wa.me", só preenche), por isso serve bem pra um lembrete
// manual (não é a automação da API oficial, que ainda não está pronta).
function toWhatsAppHref(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // já tem código do país (13 dígitos: 55 + DDD + 9 dígitos) — usa como está
  const withCountryCode = digits.length > 11 ? digits : `55${digits}`;
  const base = `https://wa.me/${withCountryCode}`;
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
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-success-soft text-success hover:bg-success hover:text-white transition-colors ${className}`}
      >
        <MessageCircle size={15} strokeWidth={2} />
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
      className={`inline-flex items-center justify-center rounded-full bg-success-soft text-success hover:bg-success hover:text-white transition-colors shrink-0 ${className}`}
      style={{ width: size + 12, height: size + 12 }}
    >
      <MessageCircle size={size} strokeWidth={2} />
    </button>
  );
}
