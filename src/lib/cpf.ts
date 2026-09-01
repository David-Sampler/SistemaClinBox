// Validação e formatação de CPF (Cadastro de Pessoa Física) — documento
// brasileiro usado no cadastro do paciente. A validação segue o algoritmo
// oficial dos dois dígitos verificadores, não só a contagem de caracteres,
// então CPFs "inventados" (números aleatórios ou repetidos, tipo
// 111.111.111-11) são rejeitados mesmo tendo o formato certo.
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  // todos os dígitos iguais (000.000.000-00, 111.111.111-11...) passam na
  // conta do dígito verificador mas nunca são CPFs reais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  // Cada dígito verificador é a soma ponderada dos dígitos anteriores,
  // com peso decrescente, tirado o resto da divisão por 11.
  function checkDigit(base: number[]): number {
    let sum = 0;
    let weight = base.length + 1;
    for (const d of base) {
      sum += d * weight;
      weight--;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  }

  const d1 = checkDigit(digits.slice(0, 9));
  const d2 = checkDigit(digits.slice(0, 10));
  return d1 === digits[9] && d2 === digits[10];
}

// Formata enquanto o usuário digita: 000.000.000-00
export function formatCPF(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
