// A clínica sempre opera no horário de Brasília (UTC-3) — e o Brasil não
// tem mais horário de verão desde 2019, então esse deslocamento é fixo
// o ano inteiro, sem precisar de biblioteca de fuso horário.
//
// Por quê isso existe: o servidor (Vercel) roda em UTC, não no fuso do
// Brasil. Qualquer cálculo de "hoje"/"que horas são" feito com
// `new Date()` direto no servidor (ex: painel inicial) fica errado
// dependendo da hora do dia — a noite, o servidor já acha que virou o
// dia seguinte (em UTC), então "consultas de hoje" fica olhando pro dia
// errado. A variável de ambiente TZ resolveria isso globalmente, mas a
// Vercel bloqueia esse nome (reservado) — por isso o cálculo manual aqui.
const BRAZIL_OFFSET_HOURS = 3;

// Desloca o instante pro "horário de parede" de Brasília, mas mantendo
// como métodos UTC — assim dá pra usar getUTCHours()/getUTCFullYear()
// etc. pra ler a hora/data de Brasília sem depender do fuso configurado
// no processo Node.
function toBrazilWallClock(reference: Date): Date {
  return new Date(reference.getTime() - BRAZIL_OFFSET_HOURS * 60 * 60 * 1000);
}

// Hora do dia em Brasília (0-23) — usado pro "Bom dia/Boa tarde/Boa noite".
export function brazilHour(reference: Date = new Date()): number {
  return toBrazilWallClock(reference).getUTCHours();
}

// Início e fim do dia de HOJE em Brasília, já como instantes (Date)
// prontos pra usar direto num filtro do Mongo ($gte/$lte) — sem
// precisar de mais nenhuma conversão na hora de montar a query.
export function brazilDayBounds(reference: Date = new Date()): { startOfDay: Date; endOfDay: Date } {
  const wallClock = toBrazilWallClock(reference);
  const y = wallClock.getUTCFullYear();
  const m = wallClock.getUTCMonth();
  const d = wallClock.getUTCDate();
  const startOfDay = new Date(Date.UTC(y, m, d, BRAZIL_OFFSET_HOURS, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m, d + 1, BRAZIL_OFFSET_HOURS, 0, 0, 0) - 1);
  return { startOfDay, endOfDay };
}

// Primeiro dia do mês atual em Brasília, à meia-noite — usado pra somar
// "recebido este mês" contando o mês certo mesmo perto da virada.
export function brazilMonthStart(reference: Date = new Date()): Date {
  const wallClock = toBrazilWallClock(reference);
  const y = wallClock.getUTCFullYear();
  const m = wallClock.getUTCMonth();
  return new Date(Date.UTC(y, m, 1, BRAZIL_OFFSET_HOURS, 0, 0, 0));
}

// "Agora" em Brasília — só que codificado nos campos UTC do Date (do
// mesmo jeito que brazilDayBounds/brazilMonthStart). IMPORTANTE: quem
// usar isso tem que ler com getUTCFullYear()/getUTCMonth()/getUTCDate()
// etc. (nunca os getters locais, tipo getMonth() sem "UTC") — senão o
// fuso do PROCESSO (que varia entre sua máquina e o servidor) entra de
// novo na conta e desfaz a correção. Usado quando o cálculo (ex:
// comparar mês/dia de aniversário) precisa só da data de calendário
// certa, não de um instante exato pra query.
export function brazilNow(reference: Date = new Date()): Date {
  const wallClock = toBrazilWallClock(reference);
  return new Date(
    Date.UTC(
      wallClock.getUTCFullYear(),
      wallClock.getUTCMonth(),
      wallClock.getUTCDate(),
      wallClock.getUTCHours(),
      wallClock.getUTCMinutes(),
      wallClock.getUTCSeconds()
    )
  );
}
