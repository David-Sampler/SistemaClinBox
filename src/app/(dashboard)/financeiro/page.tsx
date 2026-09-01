// Página de visão GERAL do financeiro: pagamentos e orçamentos de todos
// os pacientes, mais uma central de avisos com o que precisa de atenção
// (orçamento esperando aprovação, orçamento aprovado sem cobrança
// lançada, pagamento atrasado ou vencendo em breve) — sem isso, essas
// pendências só apareciam escondidas dentro da ficha de cada paciente.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, FileWarning, Wallet } from "lucide-react";
import { PatientAvatar } from "@/components/patient-avatar";

type Payment = {
  _id: string;
  amount: number;
  method: string;
  dueDate: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
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

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

// Resumo dos itens de um orçamento numa linha só, pra usar como
// "descrição do serviço" em pagamentos vinculados a ele.
function itemsSummary(items: { description: string; tooth?: string }[]) {
  return items.map((i) => (i.tooth ? `${i.description} (dente ${i.tooth})` : i.description)).join(", ");
}

export default function FinanceiroPage() {
  const [tab, setTab] = useState<"pagamentos" | "orcamentos">("pagamentos");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function loadAll() {
    setLoading(true);
    const paymentsUrl = statusFilter ? `/api/payments?status=${statusFilter}` : "/api/payments";
    const [pRes, bRes] = await Promise.all([fetch(paymentsUrl), fetch("/api/budgets")]);
    const pData = await pRes.json();
    const bData = await bRes.json();
    setPayments(pData.payments ?? []);
    setBudgets(bData.budgets ?? []);
    setLoading(false);
  }

  // "atrasado" é calculado aqui: pagamento pendente cujo vencimento já passou.
  const enriched = payments.map((p) => {
    const overdue = p.status === "pendente" && new Date(p.dueDate) < new Date();
    return { ...p, displayStatus: overdue ? "atrasado" : p.status };
  });

  const totalPendente = enriched
    .filter((p) => p.displayStatus === "pendente" || p.displayStatus === "atrasado")
    .reduce((sum, p) => sum + p.amount, 0);

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

  const alertCount = awaitingApproval.length + approvedNoCharge.length + overduePayments.length + dueSoonPayments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Financeiro</h1>
        <p className="text-ink-muted">Pagamentos e orçamentos de todos os pacientes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-5">
          <p className="text-ink-faint text-xs uppercase tracking-wide">Total a receber</p>
          <p className="text-2xl font-semibold text-ink tabular">{currency(totalPendente)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-5">
          <p className="text-ink-faint text-xs uppercase tracking-wide">Em orçamentos aguardando aprovação</p>
          <p className="text-2xl font-semibold text-ink tabular">
            {currency(awaitingApproval.reduce((s, b) => s + b.total, 0))}
          </p>
        </div>
      </div>

      {!loading && alertCount > 0 && (
        <FinanceAlerts
          awaitingApproval={awaitingApproval}
          approvedNoCharge={approvedNoCharge}
          overduePayments={overduePayments}
          dueSoonPayments={dueSoonPayments}
        />
      )}

      <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1 w-fit">
        {(["pagamentos", "orcamentos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 h-9 text-sm font-medium rounded-md transition-colors ${
              tab === t ? "bg-blue text-white" : "text-ink-muted hover:bg-surface-soft"
            }`}
          >
            {t === "pagamentos" ? "Pagamentos" : "Orçamentos"}
          </button>
        ))}
      </div>

      {tab === "pagamentos" ? (
        <>
          <div className="flex gap-2">
            {["", "pendente", "pago", "cancelado"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-sm px-3 py-1.5 rounded-lg border ${
                  statusFilter === s ? "bg-blue text-white border-blue" : "bg-surface text-ink-muted border-line"
                }`}
              >
                {s === "" ? "Todos" : statusLabels[s]}
              </button>
            ))}
          </div>

          <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-12" />
                ))}
              </div>
            ) : enriched.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Wallet size={28} className="mx-auto text-ink-faint mb-2" />
                <p className="text-sm text-ink-muted">Nenhum pagamento encontrado.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line-soft">
                {enriched.map((p, i) => {
                  const budgetRef = typeof p.budget === "object" ? p.budget : undefined;
                  const serviceLabel = budgetRef ? itemsSummary(budgetRef.items) : p.notes;
                  return (
                    <li
                      key={p._id}
                      className="fade-up px-5 py-3 flex items-center gap-3 text-sm hover:bg-surface-soft transition-colors"
                      style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                    >
                      <PatientAvatar name={p.patient?.name ?? "?"} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/pacientes/${p.patient?._id}`} className="font-medium text-ink hover:underline truncate">
                            {p.patient?.name ?? "Paciente"}
                          </Link>
                          {!budgetRef && (
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-brass-soft text-brass shrink-0">
                              Avulso
                            </span>
                          )}
                        </div>
                        {serviceLabel && <p className="text-ink-muted truncate">{serviceLabel}</p>}
                        <p className="text-ink-faint text-xs">Vencimento: {new Date(p.dueDate).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-medium text-ink tabular">{currency(p.amount)}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[p.displayStatus]}`}>
                          {statusLabels[p.displayStatus]}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
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
                    <p className="font-medium text-ink tabular">{currency(b.total)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${budgetStatusStyles[b.status]}`}>
                      {budgetStatusLabels[b.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FinanceAlerts({
  awaitingApproval,
  approvedNoCharge,
  overduePayments,
  dueSoonPayments,
}: {
  awaitingApproval: Budget[];
  approvedNoCharge: Budget[];
  overduePayments: (Payment & { displayStatus: string })[];
  dueSoonPayments: (Payment & { displayStatus: string })[];
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
      text: `Pagamento de ${currency(p.amount)} de ${p.patient?.name ?? "paciente"} está atrasado`,
      href: `/pacientes/${p.patient?._id}?tab=financeiro`,
    })),
    ...awaitingApproval.map((b) => ({
      key: `awaiting-${b._id}`,
      tone: "warning" as const,
      icon: FileWarning,
      text: `Orçamento de ${currency(b.total)} de ${b.patient?.name ?? "paciente"} aguardando envio/aprovação`,
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
      text: `Pagamento de ${currency(p.amount)} de ${p.patient?.name ?? "paciente"} vence em breve`,
      href: `/pacientes/${p.patient?._id}?tab=financeiro`,
    })),
  ];

  const toneStyles: Record<string, string> = {
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    info: "bg-blue-soft text-blue-strong",
  };

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
      <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
        <AlertTriangle size={15} className="text-warning" />
        <h2 className="text-sm font-semibold text-ink">Central de avisos</h2>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-warning-soft text-warning">{rows.length}</span>
      </div>
      <ul className="divide-y divide-line-soft max-h-72 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.key}>
            <Link href={row.href} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-surface-soft transition-colors">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${toneStyles[row.tone]}`}>
                <row.icon size={14} />
              </span>
              <span className="text-ink flex-1 min-w-0 truncate">{row.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
