// Validação e formatação de telefone brasileiro (sempre com DDD).
// Aceita fixo (10 dígitos: DDD + 8) e celular (11 dígitos: DDD + 9),
// pra funcionar tanto pro telefone da clínica quanto pro celular usado
// no WhatsApp (veja src/components/whatsapp-link.tsx).
import { onlyDigits } from "./cpf";

export function isValidPhone(raw: string): boolean {
  const d = onlyDigits(raw);
  return d.length === 10 || d.length === 11;
}

// Formata enquanto o usuário digita: (00) 00000-0000 ou (00) 0000-0000
export function formatPhone(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{0,2})/, "($1");
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  // número de 9 dígitos (celular) parte no 5º dígito, de 8 (fixo) no 4º
  const splitAt = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt, splitAt + 4)}`;
}
