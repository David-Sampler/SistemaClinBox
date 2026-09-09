// FINANCEIRO do paciente: orçamentos (propostas de tratamento) e
// pagamentos/parcelas ligados a esse paciente específico.
"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, FileSpreadsheet, Pencil, Plus, Printer, StickyNote, Trash2, X } from "lucide-react";
import { Modal } from "@/components/modal";

type BudgetItem = { description: string; tooth?: string; value: number };
type Budget = {
  _id: string;
  dentist: string;
  items: BudgetItem[];
  total: number;
  status: "pendente" | "aprovado" | "rejeitado";
  notes?: string;
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

// Editor de itens do orçamento — compartilhado entre o formulário de
// "novo orçamento" e o modal de edição, pra não duplicar essa lista de
// campos (descrição + dente + valor) em dois lugares diferentes.
function BudgetItemsEditor({ items, onChange }: { items: BudgetItem[]; onChange: (items: BudgetItem[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[1fr_88px_128px_28px] gap-2 px-0.5">
        <label className="text-xs font-medium text-ink-muted">Procedimento</label>
        <label className="text-xs font-medium text-ink-muted">Dente</label>
        <label className="text-xs font-medium text-ink-muted">Valor</label>
        <span />
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_88px_1fr_28px] sm:grid-cols-[1fr_88px_128px_28px] gap-2">
          <input
            placeholder="Ex: Canal"
            value={item.description}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], description: e.target.value };
              onChange(next);
            }}
            className="input"
          />
          <input
            placeholder="26"
            value={item.tooth ?? ""}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], tooth: e.target.value };
              onChange(next);
            }}
            className="input"
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
              onChange(next);
            }}
            className="input tabular"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            disabled={items.length === 1}
            className="w-7 h-9 flex items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger disabled:opacity-30 transition-colors"
            aria-label="Remover item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { description: "", value: 0 }])}
        className="flex items-center gap-1 text-sm text-blue hover:underline"
      >
        <Plus size={14} /> Adicionar item
      </button>
    </div>
  );
}

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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);

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

  async function handleDeletePayment(id: string) {
    if (!confirm("Excluir este pagamento? Essa ação não pode ser desfeita.")) return;
    setFinanceError(null);
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setFinanceError("Não foi possível excluir o pagamento.");
      return;
    }
    loadAll();
  }

  async function handleDeleteBudget(id: string) {
    if (!confirm("Excluir este orçamento? Essa ação não pode ser desfeita.")) return;
    setFinanceError(null);
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFinanceError(typeof data.error === "string" ? data.error : "Não foi possível excluir o orçamento.");
      return;
    }
    loadAll();
  }

  if (loading) return <p className="text-sm text-ink-muted py-4">Carregando...</p>;

  return (
    <div className="space-y-8">
      {financeError && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
          {financeError}
        </p>
      )}
      {/* ORÇAMENTOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <FileSpreadsheet size={17} className="text-ink-faint" />
            Orçamentos
          </h3>
          <button
            onClick={() => setShowBudgetForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue hover:underline"
          >
            {showBudgetForm ? <X size={14} /> : <Plus size={14} />}
            {showBudgetForm ? "Cancelar" : "Novo orçamento"}
          </button>
        </div>

        {showBudgetForm && (
          <form onSubmit={handleBudgetSubmit} className="bg-surface-soft border border-line rounded-xl p-5 sm:p-6 space-y-5">
            <div className="max-w-sm">
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

            <BudgetItemsEditor items={items} onChange={setItems} />

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Observações (opcional)</label>
              <input name="notes" className="input" placeholder="Ex: tratamento em duas sessões, orçamento válido por 30 dias" />
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <p className="text-ink-muted">
                Total{" "}
                <span className="font-display text-xl font-semibold text-ink tabular ml-1.5">
                  {currency(items.reduce((s, i) => s + (i.value || 0), 0))}
                </span>
              </p>
              <button type="submit" className="btn-primary">
                Salvar orçamento
              </button>
            </div>
          </form>
        )}

        {budgets.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum orçamento cadastrado.</p>
        ) : (
          <ul className="space-y-4">
            {budgets.map((b) => {
              const s = {
                pendente: { bar: "bg-ink-faint", ring: "ring-line" },
                aprovado: { bar: "bg-success", ring: "ring-success/30" },
                rejeitado: { bar: "bg-danger", ring: "ring-danger/30" },
              }[b.status];
              const created = new Date(b.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const dentistName = dentists.find((d) => d.id === b.dentist)?.name;
              return (
                <li
                  key={b._id}
                  className={`card-hover group relative overflow-hidden rounded-2xl bg-surface ring-1 ${s.ring}`}
                >
                  {/* barra de status na lateral */}
                  <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden />

                  {/* cabeçalho */}
                  <div className="flex items-start justify-between gap-3 border-b border-line-soft bg-surface-soft px-5 pt-4 pb-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                        Valor total
                      </p>
                      <p className="font-display text-[1.7rem] font-semibold tracking-tight text-ink tabular leading-none mt-1">
                        {currency(b.total)}
                      </p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-faint">
                        {dentistName && (
                          <>
                            <span className="text-ink-muted">{dentistName}</span>
                            <span aria-hidden>·</span>
                          </>
                        )}
                        <span>{created}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {b.items.length} {b.items.length === 1 ? "procedimento" : "procedimentos"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <BudgetStatusSelect status={b.status} onChange={(st) => handleBudgetStatus(b._id, st)} />
                      <a
                        href={`/orcamentos/${b._id}/imprimir`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-faint hover:bg-surface-soft hover:text-blue transition-colors"
                        aria-label="Imprimir ou baixar PDF do orçamento"
                        title="Imprimir / baixar PDF"
                      >
                        <Printer size={15} />
                      </a>
                      <button
                        onClick={() => setEditingBudget(b)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-faint hover:bg-surface-soft hover:text-blue transition-colors"
                        aria-label="Editar orçamento"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(b._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors"
                        aria-label="Excluir orçamento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* itens */}
                  <ul className="px-2.5 py-2">
                    {b.items.map((i, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-soft"
                      >
                        <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] font-bold text-ink-faint tabular ring-1 ring-line-soft">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-ink-muted">
                          {i.description}
                          {i.tooth && (
                            <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-soft px-1 text-[10px] font-bold text-blue-strong align-middle">
                              {i.tooth}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 pt-px text-ink tabular font-semibold">{currency(i.value)}</span>
                      </li>
                    ))}
                  </ul>

                  {b.notes && (
                    <div className="mx-5 mb-5 mt-1 rounded-xl border border-line-soft bg-surface-soft px-4 py-3">
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                        <StickyNote size={13} className="shrink-0" />
                        Observações
                      </p>
                      <p className="text-sm text-ink-muted leading-relaxed">{b.notes}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* PAGAMENTOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <CreditCard size={17} className="text-ink-faint" />
            Pagamentos
          </h3>
          <button
            onClick={() => setShowPaymentForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue hover:underline"
          >
            {showPaymentForm ? <X size={14} /> : <Plus size={14} />}
            {showPaymentForm ? "Cancelar" : "Novo pagamento"}
          </button>
        </div>

        {showPaymentForm && (
          <form onSubmit={handlePaymentSubmit} className="bg-surface-soft border border-line rounded-xl p-5 sm:p-6 space-y-4">
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
          <ul className="divide-y divide-line-soft border border-line rounded-xl overflow-hidden bg-surface">
            {payments.map((p) => {
              const budgetRef = typeof p.budget === "object" ? p.budget : undefined;
              const serviceLabel = budgetRef ? itemsSummary(budgetRef.items) : p.notes;
              return (
              <li key={p._id} className="flex items-center justify-between px-5 py-4 text-sm gap-3">
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
                <div className="flex items-center gap-1.5 shrink-0">
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
                  <button
                    onClick={() => setEditingPayment(p)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:bg-surface-soft hover:text-blue transition-colors"
                    aria-label="Editar pagamento"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeletePayment(p._id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors"
                    aria-label="Excluir pagamento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {editingBudget && (
        <EditBudgetModal
          budget={editingBudget}
          dentists={dentists}
          onClose={() => setEditingBudget(null)}
          onSaved={() => {
            setEditingBudget(null);
            loadAll();
          }}
        />
      )}

      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSaved={() => {
            setEditingPayment(null);
            loadAll();
          }}
        />
      )}
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
  const cfg: Record<Budget["status"], { wrap: string; dot: string }> = {
    pendente: { wrap: "bg-neutral-soft text-ink-muted ring-line", dot: "bg-ink-faint" },
    aprovado: { wrap: "bg-success-soft text-success ring-success/30", dot: "bg-success" },
    rejeitado: { wrap: "bg-danger-soft text-danger ring-danger/30", dot: "bg-danger" },
  };
  const chevron =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23808a99' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";
  return (
    <span className={`relative inline-flex items-center rounded-full ring-1 ${cfg[status].wrap}`}>
      <span
        className={`pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full ${cfg[status].dot}`}
        aria-hidden
      />
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as Budget["status"])}
        className="appearance-none bg-transparent bg-no-repeat text-xs font-semibold rounded-full pl-6 pr-6 py-1 border-0 cursor-pointer focus:outline-none"
        style={{ backgroundImage: chevron, backgroundPosition: "right 0.5rem center" }}
      >
        <option value="pendente">Pendente</option>
        <option value="aprovado">Aprovado</option>
        <option value="rejeitado">Rejeitado</option>
      </select>
    </span>
  );
}

// Edição de um orçamento já lançado — mesmo editor de itens do formulário
// de "novo orçamento", só que com estado próprio (não pode reaproveitar o
// "items" da tela principal, que é só pro formulário de criação) e já
// preenchido com os dados atuais.
function EditBudgetModal({
  budget,
  dentists,
  onClose,
  onSaved,
}: {
  budget: Budget;
  dentists: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<BudgetItem[]>(budget.items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      dentist: form.get("dentist"),
      items: items.filter((i) => i.description && i.value > 0),
      notes: form.get("notes") || undefined,
    };

    const res = await fetch(`/api/budgets/${budget._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Não foi possível salvar as alterações.");
      return;
    }

    onSaved();
  }

  return (
    <Modal title="Editar orçamento" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-w-sm">
          <label className="block text-xs font-medium text-ink-muted mb-1">Dentista responsável</label>
          <select name="dentist" required defaultValue={budget.dentist} className="input">
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <BudgetItemsEditor items={items} onChange={setItems} />

        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Observações</label>
          <input name="notes" defaultValue={budget.notes} className="input" />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="text-ink-muted">
            Total{" "}
            <span className="font-display text-xl font-semibold text-ink tabular ml-1.5">
              {currency(items.reduce((s, i) => s + (i.value || 0), 0))}
            </span>
          </p>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

// Edição de um pagamento já lançado — corrige valor/forma/vencimento/
// descrição de um lançamento errado, sem mexer no status (isso continua
// sendo feito pelo botão "Marcar como pago" na lista).
function EditPaymentModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: Payment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      amount: Number(form.get("amount")),
      method: form.get("method"),
      dueDate: form.get("dueDate"),
      notes: form.get("notes") || undefined,
    };

    const res = await fetch(`/api/payments/${payment._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Não foi possível salvar as alterações.");
      return;
    }

    onSaved();
  }

  return (
    <Modal title="Editar pagamento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Descrição do serviço{" "}
            <span className="text-ink-faint font-normal">(só aparece se não for vinculado a um orçamento)</span>
          </label>
          <input name="notes" defaultValue={payment.notes} className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Valor</label>
            <input
              name="amount"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={payment.amount}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Forma de pagamento</label>
            <select name="method" required defaultValue={payment.method} className="input">
              {Object.entries(methodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Vencimento</label>
            <input
              name="dueDate"
              type="date"
              required
              defaultValue={payment.dueDate?.slice(0, 10)}
              className="input"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </Modal>
  );
}
