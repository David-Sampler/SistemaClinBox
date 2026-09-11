// Comparação simples de nomes pra flagar um cadastro de paciente
// provavelmente duplicado (ex: "MARIA LUIZA DA SILVA" cadastrada de novo
// como "MARIA LUIZA DA SILZA" por erro de digitação). Não é busca
// fonética nem nada sofisticado — só distância de edição (Levenshtein)
// sobre o nome normalizado, usada em src/app/api/patients/route.ts pra
// avisar antes de criar um segundo cadastro da mesma pessoa.
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "") // remove acentos (á -> a, ç -> c...)
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// "Parecido o bastante pra provavelmente ser a mesma pessoa digitada
// diferente": nomes idênticos depois de normalizar, um nome contido no
// outro (cadastro sem nome do meio, por exemplo), ou até 2 letras de
// diferença (cobre o erro de digitação típico) — nomes curtos (menos de
// 6 letras) ficam de fora da checagem por distância, pra não dar falso
// positivo entre nomes comuns curtos.
export function namesAreSimilar(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen < 6) return false;
  return levenshtein(na, nb) <= 2;
}
