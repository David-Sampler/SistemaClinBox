// FINANCEIRO do paciente: orçamentos (propostas de tratamento) e
// pagamentos/parcelas ligados a esse paciente específico.
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type BudgetItem = { description: string; tooth?: string; value: number };
type Budget = {
  _id: string;
  items: BudgetItem[];
  total: number;
  status: "pendente" | "aprovado" | "rejeitado";
  createdAt: string;
};
type Payment = {
  _id: string;
  amount: number;
  method: string;
  dueDate: string;
  paidDate?: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  budget?: { _id: string; items: BudgetItem[]; status: string } | string;
  notes?: string;
};

// Resumo dos itens de um orçamento numa linha só, pra usar como
// "descrição do serviço" em pagamentos vinculados a ele — sem isso, um
// pagamento vinculado a orçamento aparecia sem dizer a que serviço
// se refere (só cobrança avulsa tinha "notes" preenchido).
function itemsSummary(items: BudgetItem[]) {
  return items.map((i) => (i.tooth ? `${i.description} (dente ${i.tooth})` : i.description)).join(", ");
}

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const methodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  pix: "Pix",
  boleto: "Boleto",
  convenio: "Convênio",
};

export function PatientFinance({
  patientId,
  dentists,
}: {
  patientId: string;
  dentists: { id: string; name: string }[];
}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BudgetItem[]>([{ description: "", value: 0 }]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadAll() {
    setLoading(true);
    const [bRes, pRes] = await Promise.all([
      fetch(`/api/patients/${patientId}/budgets`),
      fetch(`/api/patients/${patientId}/payments`),
    ]);
    const bData = await bRes.json();
    const pData = await pRes.json();
    setBudgets(bData.budgets ?? []);
    setPayments(pData.payments ?? []);
    setLoading(false);
  }

  async function handleBudgetSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      dentist: form.get("dentist"),
      items: items.filter((i) => i.description && i.value > 0),
      notes: form.get("notes") || undefined,
    };

    const res = await fetch(`/api/patients/${patientId}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setItems([{ description: "", value: 0 }]);
      setShowBudgetForm(false);
      loadAll();
    }
  }

  async function handleBudgetStatus(id: string, status: Budget["status"]) {
    await fetch(`/api/budgets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      amount: Number(form.get("amount")),
      method: form.get("method"),
      dueDate: form.get("dueDate"),
      budget: form.get("budget") || undefined,
      notes: form.get("notes") || undefined,
    };

    const res = await fetch(`/api/patients/${patientId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setShowPaymentForm(false);
      loadAll();
    }
  }

  async function markAsPaid(id: string) {
    await fetch(`/api/payments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pago", paidDate: new Date().toISOString() }),
    });
    loadAll();
  }

  if (loading) return <p className="text-sm text-ink-muted py-4">Carregando...</p>;

  return (
    <div className="space-y-8">
      {/* ORÇAMENTOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Orçamentos</h3>
          <button
            onClick={() => setShowBudgetForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue hover:underline"
          >
            <Plus size={14} /> Novo orçamento
          </button>
        </div>

        {showBudgetForm && (
          <form onSubmit={handleBudgetSubmit} className="bg-surface-soft border border-line rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Dentista responsável</label>
              <select name="dentist" required className="input">
                <option value="">Selecione...</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-ink-muted">Itens do orçamento</label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    placeholder="Descrição (ex: Canal - dente 26)"
                    value={item.description}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setItems(next);
                    }}
                    className="flex-1 input"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Valor"
                    value={item.value || ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], value: Number(e.target.value) };
                      setItems(next);
                    }}
                    className="w-32 rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-ink-faint hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems([...items, { description: "", value: 0 }])}
                className="text-xs text-blue hover:underline"
              >
                + adicionar item
              </button>
            </div>

            <p className="text-sm font-medium text-ink">
              Total: {currency(items.reduce((s, i) => s + (i.value || 0), 0))}
            </p>

            <button
              type="submit"
              className="btn-primary"
            >
              Salvar orçamento
            </button>
          </form>
        )}

        {budgets.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum orçamento cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {budgets.map((b) => (
              <li key={b._id} className="border border-line rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{currency(b.total)}</p>
                  <BudgetStatusSelect status={b.status} onChange={(s) => handleBudgetStatus(b._id, s)} />
                </div>
                <ul className="text-sm text-ink-muted mt-2 space-y-0.5">
                  {b.items.map((i, idx) => (
                    <li key={idx}>
                      {i.description} {i.tooth ? `(dente ${i.tooth})` : ""} — {currency(i.value)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PAGAMENTOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Pagamentos</h3>
          <button
            onClick={() => setShowPaymentForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue hover:underline"
          >
            <Plus size={14} /> Novo pagamento
          </button>
        </div>

        {showPaymentForm && (
          <form onSubmit={handlePaymentSubmit} className="bg-surface-soft border border-line rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Orçamento vinculado</label>
              <select name="budget" className="input" defaultValue="">
                <option value="">Nenhum — cobrança avulsa (fora do orçamento)</option>
                {budgets.map((b) => (
                  <option key={b._id} value={b._id}>
                    {currency(b.total)} · {b.status === "aprovado" ? "aprovado" : b.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">
                Descrição do serviço {" "}
                <span className="text-ink-faint font-normal">(obrigatório se for cobrança avulsa)</span>
              </label>
              <input
                name="notes"
                className="input"
                placeholder="Ex: Restauração de urgência realizada na consulta"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Valor</label>
                <input name="amount" type="number" min={0} step="0.01" required className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Forma de pagamento</label>
                <select name="method" required className="input">
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Vencimento</label>
                <input name="dueDate" type="date" required className="input" />
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
            >
              Salvar pagamento
            </button>
          </form>
        )}

        {payments.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum pagamento cadastrado.</p>
        ) : (
          <ul className="divide-y divide-line-soft border border-line rounded-lg">
            {payments.map((p) => {
              const budgetRef = typeof p.budget === "object" ? p.budget : undefined;
              const serviceLabel = budgetRef ? itemsSummary(budgetRef.items) : p.notes;
              return (
              <li key={p._id} className="flex items-center justify-between px-4 py-3 text-sm gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{currency(p.amount)}</p>
                    {!budgetRef && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-brass-soft text-brass">
                        Avulso
                      </span>
                    )}
                  </div>
                  {serviceLabel && <p className="text-ink-muted">{serviceLabel}</p>}
                  <p className="text-ink-faint text-xs">
                    {methodLabels[p.method] ?? p.method} · vence {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {p.status === "pago" ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-soft text-success">
                    Pago
                  </span>
                ) : (
                  <button
                    onClick={() => markAsPaid(p._id)}
                    className="text-xs font-medium px-2 py-1 rounded-full bg-warning-soft text-warning hover:opacity-80"
                  >
                    Marcar como pago
                  </button>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function BudgetStatusSelect({
  status,
  onChange,
}: {
  status: Budget["status"];
  onChange: (s: Budget["status"]) => void;
}) {
  const styles: Record<Budget["status"], string> = {
    pendente: "bg-neutral-soft text-ink",
    aprovado: "bg-success-soft text-success",
    rejeitado: "bg-danger-soft text-danger",
  };
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as Budget["status"])}
      className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${styles[status]}`}
    >
      <option value="pendente">Pendente</option>
      <option value="aprovado">Aprovado</option>
      <option value="rejeitado">Rejeitado</option>
    </select>
  );
}
