// Página de visão GERAL do financeiro: pagamentos e orçamentos de todos
// os pacientes, mais uma central de avisos com o que precisa de atenção
// (orçamento esperando aprovação, orçamento aprovado sem cobrança
// lançada, pagamento atrasado ou vencendo em breve) — sem isso, essas
// pendências só apareciam escondidas dentro da ficha de cada paciente.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle, Clock, Eye, EyeOff, FileDown, FileWarning, Trash2, Wallet } from "lucide-react";
import { Modal } from "@/components/modal";
import { PatientAvatar } from "@/components/patient-avatar";

type Payment = {
  _id: string;
  amount: number;
  method: string;
  dueDate: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  flow?: "entrada" | "saida";
  patient?: { _id: string; name: string };
  budget?: { _id: string; items: { description: string; tooth?: string; value: number }[]; status: string } | string;
  notes?: string;
};

type Budget = {
  _id: string;
  items: { description: string; tooth?: string; value: number }[];
  total: number;
  status: "pendente" | "aprovado" | "rejeitado";
  createdAt: string;
  patient?: { _id: string; name: string };
  dentist?: { _id: string; name: string };
};

type ExpenseEntry = {
  _id: string;
  description: string;
  total: number;
  flow: "entrada" | "saida";
  createdAt: string;
};

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (value: string | Date) => new Date(value).toLocaleDateString("pt-BR");
const displayAmount = (value: number, visible: boolean) => (visible ? currency(value) : "R$ ••••");

const startOfWeek = (date = new Date()) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfWeek = (date = new Date()) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const toISODate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

const statusStyles: Record<string, string> = {
  pendente: "bg-neutral-soft text-ink-muted",
  pago: "bg-success-soft text-success",
  atrasado: "bg-danger-soft text-danger",
  cancelado: "bg-neutral-soft text-ink-faint",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const budgetStatusStyles: Record<Budget["status"], string> = {
  pendente: "bg-neutral-soft text-ink-muted",
  aprovado: "bg-success-soft text-success",
  rejeitado: "bg-danger-soft text-danger",
};

const budgetStatusLabels: Record<Budget["status"], string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

function matchesPeriod(date: string | Date, option: "dia" | "semana" | "mes" | "todos") {
  if (option === "todos") return true;

  const target = new Date(date);
  const now = new Date();

  if (option === "dia") {
    return target.toDateString() === now.toDateString();
  }

  if (option === "semana") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - 6);
    return target >= start && target <= now;
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return target >= start && target <= now;
}

// Resumo dos itens de um orçamento numa linha só, pra usar como
// "descrição do serviço" em pagamentos vinculados a ele.
function itemsSummary(items: { description: string; tooth?: string }[]) {
  return items.map((i) => (i.tooth ? `${i.description} (dente ${i.tooth})` : i.description)).join(", ");
}

export default function FinanceiroPage() {
  // Excluir orçamento apaga de vez — só admin (mesma trava do backend,
  // ver DELETE em src/app/api/budgets/[id]/route.ts). Útil aqui
  // especialmente pra registro órfão (paciente/dentista que não existe
  // mais), que não tem como ser excluído pela ficha do paciente porque
  // essa ficha nem existe mais.
  const isAdmin = useSession().data?.user?.role === "admin";
  const [tab, setTab] = useState<"pagamentos" | "orcamentos" | "despesas">("pagamentos");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"dia" | "semana" | "mes" | "todos">("semana");
  const [detailEntry, setDetailEntry] = useState<null | {
    id: string;
    patientName: string;
    description: string;
    amount: number;
    dueDate: string;
    status: Payment["status"] | "pago" | "pendente" | "cancelado";
    flow?: "entrada" | "saida";
    method?: string;
    isSale?: boolean;
  }>(null);
  const [exportStart, setExportStart] = useState(toISODate(startOfWeek()));
  const [exportEnd, setExportEnd] = useState(toISODate(endOfWeek()));
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState(true);

  async function loadAll() {
    setLoading(true);
    const paymentsUrl = statusFilter ? `/api/payments?status=${statusFilter}` : "/api/payments";
    const [pRes, bRes, sRes] = await Promise.all([
      fetch(paymentsUrl),
      fetch("/api/budgets"),
      fetch("/api/sales/combined?limit=1000"),
    ]);
    const pData = await pRes.json();
    const bData = await bRes.json();
    const sData = await sRes.json();
    // Descarta pagamento/orçamento cujo paciente não existe mais (o
    // populate do back-end devolve "patient: null" nesse caso) — sem
    // isso, o link virava "/pacientes/undefined" e caía numa página
    // fora do ar. Normalmente não acontece (excluir paciente só
    // desativa, nunca apaga — ver DELETE em /api/patients/[id]), mas
    // dado antigo lançado direto no banco pode ficar órfão assim.
    const incomingSales = ((sData.entries ?? []) as Array<{
      kind?: string;
      flow?: "entrada" | "saida";
      description?: string;
      total?: number;
      createdAt?: string;
      patientName?: string;
      status?: "pago" | "pendente" | "cancelada";
    }>)
      .filter((entry) => entry.kind === "sale" && entry.flow !== "saida")
      .map((entry) => ({
        _id: `sale:${String(entry.createdAt ?? Math.random())}`,
        amount: Number(entry.total ?? 0),
        method: "entrada",
        flow: "entrada",
        dueDate: entry.createdAt ?? new Date().toISOString(),
        status: entry.status === "pendente" ? "pendente" : "pago",
        patient: { _id: "sale-avulsa", name: entry.patientName ?? "Venda avulsa" },
        notes: entry.description ?? "Venda avulsa",
      } satisfies Payment));

    setPayments([
      ...(pData.payments ?? []).filter((p: Payment) => p.patient),
      ...incomingSales,
    ]);
    setBudgets((bData.budgets ?? []).filter((b: Budget) => b.patient));
    const expenseRows = ((sData.entries ?? []) as Array<{ kind?: string; flow?: "entrada" | "saida"; description?: string; total?: number; createdAt?: string }>)
      .filter((entry) => entry.kind === "sale" && entry.flow === "saida")
      .map((entry) => ({
        _id: String(entry.createdAt ?? Math.random()),
        description: entry.description ?? "Saída da clínica",
        total: Number(entry.total ?? 0),
        flow: entry.flow ?? "saida",
        createdAt: entry.createdAt ?? new Date().toISOString(),
      } satisfies ExpenseEntry)) as ExpenseEntry[];
    setExpenses(expenseRows);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    void loadAll();
  }, [statusFilter]);

  async function handleDeleteBudget(id: string) {
    if (!confirm("Excluir este orçamento? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Não foi possível excluir o orçamento.");
      return;
    }
    setBudgets((prev) => prev.filter((b) => b._id !== id));
  }

  // "atrasado" é calculado aqui: pagamento pendente cujo vencimento já passou.
  const enriched = payments.map((p) => {
    const overdue = p.status === "pendente" && new Date(p.dueDate) < new Date();
    return { ...p, displayStatus: overdue ? "atrasado" : p.status };
  });

  const filteredByPeriod = enriched.filter((p) => matchesPeriod(p.dueDate, periodFilter));
  const sortedPayments = [...filteredByPeriod].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );
  const filteredExpenses = expenses.filter((entry) => matchesPeriod(entry.createdAt, periodFilter));
  const sortedExpenses = [...filteredExpenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPayments = sortedPayments.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const exportRows = sortedPayments.filter((p) => {
    const d = new Date(p.dueDate);
    const from = exportStart ? new Date(`${exportStart}T00:00:00`) : null;
    const to = exportEnd ? new Date(`${exportEnd}T23:59:59`) : null;
    return (!from || d >= from) && (!to || d <= to);
  });

  const totalPendente = filteredByPeriod
    .filter((p) => p.displayStatus === "pendente" || p.displayStatus === "atrasado")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDespesas = sortedExpenses.reduce((sum, entry) => sum + entry.total, 0);

  // Central de avisos: tudo que precisa de uma ação da recepção/dentista,
  // reunido num só lugar em vez de escondido em cada ficha de paciente.
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const budgetIdsWithPayment = new Set(
    payments.map((p) => (typeof p.budget === "string" ? p.budget : p.budget?._id)).filter(Boolean)
  );

  const awaitingApproval = budgets.filter((b) => b.status === "pendente");
  const approvedNoCharge = budgets.filter((b) => b.status === "aprovado" && !budgetIdsWithPayment.has(b._id));
  const overduePayments = enriched.filter((p) => p.displayStatus === "atrasado");
  const dueSoonPayments = enriched.filter(
    (p) => p.status === "pendente" && new Date(p.dueDate) >= now && new Date(p.dueDate) <= in7Days
  );

  const alertCount = awaitingApproval.length + overduePayments.length + dueSoonPayments.length + awaitingApproval.length + approvedNoCharge.length;

  function handleExportPdf() {
    const rows = exportRows.length > 0 ? exportRows : sortedPayments;
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("O navegador bloqueou a abertura da janela de impressão. Permita pop-ups e tente novamente.");
      return;
    }

    const rowsHtml = rows
      .map(
        (p) => `
          <tr>
            <td>${p.patient?.name ?? "Paciente"}</td>
            <td>${p.notes ?? "—"}</td>
            <td>${formatDate(p.dueDate)}</td>
            <td>${statusLabels[p.displayStatus] ?? statusLabels[p.status]}</td>
            <td>${currency(p.amount)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório financeiro</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1a2532; margin: 32px; }
            h1 { font-size: 24px; margin: 0 0 12px; }
            .meta { font-size: 12px; color: #5f6f80; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e0e6ee; padding: 10px 8px; text-align: left; font-size: 12px; }
            th { background: #f0f4f9; }
            .total { margin-top: 18px; font-weight: 700; font-size: 14px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Relatório financeiro</h1>
          <div class="meta">Período: ${formatDate(exportStart)} até ${formatDate(exportEnd)} </div>
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || "<tr><td colspan='5'>Nenhum registro no período.</td></tr>"}</tbody>
          </table>
          <div class="total">Total: ${currency(rows.reduce((sum, p) => sum + p.amount, 0))}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }

  return (
    <div className="space-y-4 rounded-[24px] border border-[#f1eee9] bg-[#f8f7f5] p-3 md:p-4">
      <div className="flex items-end justify-between gap-3 border-b border-[#eee8e3] pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">Resumo</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Financeiro</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={showValues ? "Ocultar valores" : "Exibir valores"}
            title={showValues ? "Ocultar valores" : "Exibir valores"}
            onClick={() => setShowValues((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ece7e2] bg-white text-ink-muted transition-colors hover:border-[#dfeafc] hover:text-[#1f3f6d]"
          >
            {showValues ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <span className="rounded-full border border-[#ece7e2] bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Clínica
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[#ebeaf0] bg-white p-4 shadow-[0_6px_14px_rgba(15,23,42,0.02)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">Total a receber</p>
          <p className="mt-3 text-3xl font-semibold text-ink tabular">{displayAmount(totalPendente, showValues)}</p>
        </div>
        <div className="rounded-[18px] border border-[#ebf0ea] bg-white p-4 shadow-[0_6px_14px_rgba(15,23,42,0.02)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">Orçamentos em espera</p>
          <p className="mt-3 text-3xl font-semibold text-ink tabular">
            {displayAmount(awaitingApproval.reduce((s, b) => s + b.total, 0), showValues)}
          </p>
        </div>
      </div>

      {!loading && alertCount > 0 && (
        <FinanceAlerts
          awaitingApproval={awaitingApproval}
          approvedNoCharge={approvedNoCharge}
          overduePayments={overduePayments}
          dueSoonPayments={dueSoonPayments}
          showValues={showValues}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <div className="inline-flex items-center gap-1 rounded-[18px] border border-[#ece7e2] bg-[#f5f2ef] p-1">
          {(["pagamentos", "orcamentos", "despesas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-10 min-w-[128px] rounded-[12px] px-4 text-[0.92rem] font-medium tracking-[-0.01em] transition-all ${
                tab === t
                  ? "bg-white text-[#23487a] shadow-[0_4px_8px_rgba(15,23,42,0.04)] ring-1 ring-[#dfeafc]"
                  : "text-[#5e6978] hover:bg-white/60"
              }`}
            >
              {t === "pagamentos" ? "Pagamentos" : t === "orcamentos" ? "Orçamentos" : "Despesas"}
            </button>
          ))}
        </div>
      </div>

      {detailEntry && (
        <FinanceDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} showValues={showValues} />
      )}

      {tab === "despesas" ? (
        <div className="rounded-[18px] border border-[#efeae6] bg-[linear-gradient(180deg,#ffffff_0%,#faf8f7_100%)] shadow-[0_8px_16px_rgba(15,23,42,0.02)]">
          <div className="flex items-center justify-between border-b border-line bg-surface-soft/50 px-5 py-3 text-[11px] text-ink-faint">
            <span>Despesas da clínica</span>
            <span>{displayAmount(totalDespesas, showValues)}</span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-12" />
              ))}
            </div>
          ) : sortedExpenses.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Wallet size={28} className="mx-auto text-ink-faint mb-2" />
              <p className="text-sm text-ink-muted">Nenhuma despesa encontrada.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {sortedExpenses.map((expense, i) => (
                <li
                  key={`${expense._id}-${i}`}
                  className="fade-up flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition-all hover:bg-[rgba(58,125,214,0.02)]"
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-ink">{expense.description}</p>
                      <span className={`inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${expense.flow === "saida" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
                        {expense.flow === "saida" ? "Saída" : "Entrada"}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-faint">{new Date(expense.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-danger tabular">- {displayAmount(expense.total, showValues)}</p>
                    <span className="mt-1 inline-flex rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">Despesa</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : tab === "pagamentos" ? (
        <>
          <div className="rounded-[18px] border border-[#efeae6] bg-white p-3 shadow-[0_4px_10px_rgba(15,23,42,0.012)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Período</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Status</span>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(["dia", "semana", "mes", "todos"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setPeriodFilter(period);
                    setCurrentPage(1);
                  }}
                  className={`rounded-[10px] border px-3 py-2 text-sm font-medium transition-all ${
                    periodFilter === period ? "border-[#dfeafc] bg-[#f4f8ff] text-[#1f3f6d]" : "border-[#eef1f4] bg-[#fafbfc] text-ink-muted hover:bg-[#f3f6f9]"
                  }`}
                >
                  {period === "dia" ? "Hoje" : period === "semana" ? "Semana" : period === "mes" ? "Mês" : "Todos"}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {["", "pendente", "pago", "cancelado"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setCurrentPage(1);
                  }}
                  className={`rounded-[10px] border px-3 py-2 text-sm font-medium transition-all ${
                    statusFilter === s ? "border-[#dfeafc] bg-[#f4f8ff] text-[#1f3f6d]" : "border-[#eef1f4] bg-[#fafbfc] text-ink-muted hover:bg-[#f3f6f9]"
                  }`}
                >
                  {s === "" ? "Todos" : statusLabels[s]}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#f2efeb] pt-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8b94a1]">Data</span>

                <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[#8b94a1]">
                  <span>De</span>
                  <input
                    type="date"
                    value={exportStart}
                    onChange={(e) => setExportStart(e.target.value)}
                    className="h-8 w-[128px] rounded-[9px] border border-[#edf1f5] bg-white px-2 text-[0.72rem] font-medium text-ink outline-none transition-colors focus:border-[#cfe0ff] focus:ring-2 focus:ring-[#edf4ff]"
                  />
                </div>

                <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[#8b94a1]">
                  <span>Até</span>
                  <input
                    type="date"
                    value={exportEnd}
                    onChange={(e) => setExportEnd(e.target.value)}
                    className="h-8 w-[128px] rounded-[9px] border border-[#edf1f5] bg-white px-2 text-[0.72rem] font-medium text-ink outline-none transition-colors focus:border-[#cfe0ff] focus:ring-2 focus:ring-[#edf4ff]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  aria-label="Exportar relatório em PDF"
                  title="Exportar relatório em PDF"
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[#e7ecf4] bg-white text-[#1f3f6d] transition-all hover:bg-[#f4f8ff]"
                >
                  <FileDown size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#efeae6] bg-white">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-12" />
                ))}
              </div>
            ) : sortedPayments.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Wallet size={28} className="mx-auto text-ink-faint mb-2" />
                <p className="text-sm text-ink-muted">Nenhum pagamento encontrado.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[#f0ece8] bg-[#faf8f7] px-5 py-3 text-[11px] text-ink-faint">
                  <span>
                    Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, sortedPayments.length)}–
                    {Math.min(safeCurrentPage * pageSize, sortedPayments.length)} de {sortedPayments.length}
                  </span>
                  <span>Ordenado por mais recente</span>
                </div>

                <ul className="space-y-2.5 p-3">
                  {paginatedPayments.map((p, i) => {
                    const budgetRef = typeof p.budget === "object" ? p.budget : undefined;
                    const serviceLabel = budgetRef ? itemsSummary(budgetRef.items) : p.notes;
                    return (
                      <li
                        key={p._id}
                        onClick={() =>
                          setDetailEntry({
                            id: p._id,
                            patientName: p.patient?.name ?? "Paciente",
                            description: serviceLabel ?? p.notes ?? "Movimento financeiro",
                            amount: p.amount,
                            dueDate: p.dueDate,
                            status: p.displayStatus,
                            flow: p.flow,
                            method: p.method,
                            isSale: Boolean(p.flow),
                          })
                        }
                        className="fade-up cursor-pointer rounded-[14px] border border-[#f0ece8] bg-[#fff] p-3 transition-all hover:border-[#dfeafc] hover:bg-[#fbfdff]"
                        style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <PatientAvatar name={p.patient?.name ?? "?"} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/pacientes/${p.patient?._id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate text-[0.98rem] font-semibold tracking-[-0.02em] text-ink hover:underline"
                              >
                                {p.patient?.name ?? "Paciente"}
                              </Link>
                              {!budgetRef && (
                                <span className="shrink-0 rounded-full bg-[#f8e7d8] px-1.5 py-0.5 text-[9px] font-medium text-[#b4742d]">
                                  Avulso
                                </span>
                              )}
                              {p.flow && (
                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${p.flow === "saida" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
                                  {p.flow === "saida" ? "Saída" : "Entrada"}
                                </span>
                              )}
                            </div>
                            {serviceLabel && <p className="mt-0.5 truncate text-xs text-ink-muted">{serviceLabel}</p>}
                            <p className="mt-0.5 text-[10px] text-ink-faint">Vencimento: {new Date(p.dueDate).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.04em] text-ink tabular">{displayAmount(p.amount, showValues)}</p>
                            <span className={`mt-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusStyles[p.displayStatus]}`}>
                              {statusLabels[p.displayStatus]}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-soft/30 px-5 py-3">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage === 1}
                      className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-ink-muted tabular">
                      {safeCurrentPage}/{totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-[18px] border border-[#efeae6] bg-[linear-gradient(180deg,#ffffff_0%,#faf8f7_100%)] shadow-[0_8px_16px_rgba(15,23,42,0.02)]">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16" />
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileWarning size={28} className="mx-auto text-ink-faint mb-2" />
              <p className="text-sm text-ink-muted">Nenhum orçamento cadastrado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {budgets.map((b, i) => (
                <li
                  key={b._id}
                  className="fade-up px-5 py-3.5 flex items-center gap-3 text-sm hover:bg-surface-soft transition-colors"
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                >
                  <PatientAvatar name={b.patient?.name ?? "?"} size={32} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/pacientes/${b.patient?._id}?tab=financeiro`} className="font-medium text-ink hover:underline truncate">
                      {b.patient?.name ?? "Paciente"}
                    </Link>
                    <p className="text-ink-muted truncate">{itemsSummary(b.items)}</p>
                    <p className="text-ink-faint text-xs">
                      {b.dentist?.name ?? "—"} · {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-ink tabular">{displayAmount(b.total, showValues)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${budgetStatusStyles[b.status]}`}>
                      {budgetStatusLabels[b.status]}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteBudget(b._id)}
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors"
                      aria-label="Excluir orçamento (somente admin)"
                      title="Excluir — somente admin"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FinanceDetailModal({
  entry,
  onClose,
  showValues,
}: {
  entry: {
    id: string;
    patientName: string;
    description: string;
    amount: number;
    dueDate: string;
    status: Payment["status"] | "pago" | "pendente" | "cancelado";
    flow?: "entrada" | "saida";
    method?: string;
    isSale?: boolean;
  };
  onClose: () => void;
  showValues: boolean;
}) {
  return (
    <Modal title={entry.patientName} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${entry.flow === "saida" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
            {entry.flow === "saida" ? "Saída" : "Entrada"}
          </span>
          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[entry.status] ?? "bg-neutral-soft text-ink-muted"}`}>
            {statusLabels[entry.status] ?? entry.status}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Descrição</p>
            <p className="mt-1 text-ink">{entry.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Valor</p>
              <p className="mt-1 text-lg font-semibold text-ink tabular">{displayAmount(entry.amount, showValues)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Vencimento</p>
              <p className="mt-1 text-ink">{new Date(entry.dueDate).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {entry.method && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Forma</p>
              <p className="mt-1 text-ink">{entry.method}</p>
            </div>
          )}
        </div>

        {entry.isSale && (
          <button
            type="button"
            onClick={() => onClose()}
            className="w-full rounded-xl bg-blue text-white px-3 py-2 text-sm font-medium transition-colors hover:brightness-95"
          >
            Fechar detalhe
          </button>
        )}
      </div>
    </Modal>
  );
}

function FinanceAlerts({
  awaitingApproval,
  approvedNoCharge,
  overduePayments,
  dueSoonPayments,
  showValues,
}: {
  awaitingApproval: Budget[];
  approvedNoCharge: Budget[];
  overduePayments: (Payment & { displayStatus: string })[];
  dueSoonPayments: (Payment & { displayStatus: string })[];
  showValues: boolean;
}) {
  const rows: {
    key: string;
    tone: "danger" | "warning" | "info";
    icon: React.ElementType;
    text: string;
    href: string;
  }[] = [
    ...overduePayments.map((p) => ({
      key: `overdue-${p._id}`,
      tone: "danger" as const,
      icon: AlertTriangle,
      text: `Pagamento de ${displayAmount(p.amount, showValues)} de ${p.patient?.name ?? "paciente"} está atrasado`,
      href: `/pacientes/${p.patient?._id}?tab=financeiro`,
    })),
    ...awaitingApproval.map((b) => ({
      key: `awaiting-${b._id}`,
      tone: "warning" as const,
      icon: FileWarning,
      text: `Orçamento de ${displayAmount(b.total, showValues)} de ${b.patient?.name ?? "paciente"} aguardando envio/aprovação`,
      href: `/pacientes/${b.patient?._id}?tab=financeiro`,
    })),
    ...approvedNoCharge.map((b) => ({
      key: `approved-${b._id}`,
      tone: "warning" as const,
      icon: Wallet,
      text: `Orçamento aprovado de ${b.patient?.name ?? "paciente"} ainda sem cobrança lançada`,
      href: `/pacientes/${b.patient?._id}?tab=financeiro`,
    })),
    ...dueSoonPayments.map((p) => ({
      key: `soon-${p._id}`,
      tone: "info" as const,
      icon: Clock,
      text: `Pagamento de ${displayAmount(p.amount, showValues)} de ${p.patient?.name ?? "paciente"} vence em breve`,
      href: `/pacientes/${p.patient?._id}?tab=financeiro`,
    })),
  ];

  const toneStyles: Record<string, string> = {
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    info: "bg-blue-soft text-blue-strong",
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#efe5d8] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] shadow-[0_7px_14px_rgba(168,106,12,0.03)]">
      <div className="flex items-center gap-2 border-b border-line bg-surface-soft/40 px-5 py-3">
        <AlertTriangle size={15} className="text-warning" />
        <h2 className="text-sm font-semibold text-ink">Central de avisos</h2>
        <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">{rows.length}</span>
      </div>
      <ul className="max-h-72 divide-y divide-line-soft overflow-y-auto">
        {rows.map((row) => (
          <li key={row.key}>
            <Link href={row.href} className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-surface-soft/50">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneStyles[row.tone]}`}>
                <row.icon size={14} />
              </span>
              <span className="min-w-0 flex-1 truncate text-ink">{row.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
