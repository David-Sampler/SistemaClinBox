// Tela de VENDAS: escolhe itens do catálogo (serviços e produtos),
// monta um carrinho, escolhe forma de pagamento e finaliza — tudo numa
// tela só, sem precisar entrar na ficha de um paciente primeiro.
// Layout em três áreas bem separadas: catálogo (com busca e filtros),
// carrinho fixo ao lado, e o histórico de vendas embaixo, numa tabela
// própria — em vez de tudo espremido numa coluna só.
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Ban, Minus, Plus, Search, ShoppingCart, Trash2, Stethoscope, Package } from "lucide-react";
import { PatientAvatar } from "@/components/patient-avatar";
import { colorFor } from "@/lib/palette";

type CatalogItem = {
  key: string; // "service:ID" ou "product:ID" — identifica de forma única no catálogo
  type: "service" | "product";
  ref: string;
  name: string;
  category?: string;
  // Sem preço fixo = undefined: alguns serviços (cirurgias mais
  // complexas, por exemplo) variam de valor a cada caso — o preço é
  // digitado na hora da venda em vez de vir pronto do catálogo.
  price?: number;
  stock?: number; // só produtos têm estoque
};

type CartLine = {
  key: string;
  type: "service" | "product";
  ref: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock?: number;
  needsPrice?: boolean; // true = veio do catálogo sem preço, precisa ser preenchido antes de finalizar
};

type Period = "hoje" | "semana" | "mes";

const PERIOD_LABELS: Record<Period, string> = { hoje: "Hoje", semana: "Esta semana", mes: "Este mês" };

// Calcula o início do período selecionado — usado tanto pro filtro do
// histórico quanto pros indicadores do painel (total pago, pendente...).
function periodStart(period: Period): Date {
  const now = new Date();
  if (period === "hoje") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "semana") {
    const start = new Date(now);
    const day = start.getDay(); // 0 = domingo
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type Sale = {
  _id: string;
  items: { name: string; quantity: number; subtotal: number }[];
  total: number;
  method: string;
  status: "pago" | "pendente" | "cancelada";
  createdAt: string;
  patient?: { name: string };
};

const NO_CATEGORY = "Outros";
const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const methodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  pix: "Pix",
  boleto: "Boleto",
  convenio: "Convênio",
};

const saleStatusStyles: Record<Sale["status"], string> = {
  pago: "bg-success-soft text-success",
  pendente: "bg-warning-soft text-warning",
  cancelada: "bg-neutral-soft text-ink-faint",
};
const saleStatusLabels: Record<Sale["status"], string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelada: "Cancelada",
};

export function VendaView({ patients }: { patients: { id: string; name: string }[] }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "service" | "product">("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState<Period>("mes");
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function loadCatalog() {
    setLoading(true);
    const [sRes, pRes] = await Promise.all([fetch("/api/services"), fetch("/api/products")]);
    const sData = await sRes.json();
    const pData = await pRes.json();

    const services: CatalogItem[] = (sData.services ?? []).map((s: { _id: string; name: string; category?: string; defaultPrice?: number }) => ({
      key: `service:${s._id}`,
      type: "service" as const,
      ref: s._id,
      name: s.name,
      category: s.category,
      price: s.defaultPrice,
    }));
    const products: CatalogItem[] = (pData.products ?? []).map((p: { _id: string; name: string; category?: string; price: number; stock: number }) => ({
      key: `product:${p._id}`,
      type: "product" as const,
      ref: p._id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
    }));

    setCatalog([...services, ...products]);
    setLoading(false);
  }

  async function loadSales() {
    setSalesLoading(true);
    const from = periodStart(period).toISOString();
    const res = await fetch(`/api/sales?from=${from}&limit=300`);
    const data = await res.json();
    setSales(data.sales ?? []);
    setSalesLoading(false);
  }

  // Cancela (estorna) uma venda já registrada — fica no histórico, mas
  // sai dos totais de "Recebido"/"A receber", e se tinha produto, a
  // rota devolve a quantidade pro estoque sozinha.
  async function handleCancelSale(id: string) {
    if (!confirm("Cancelar esta venda? O estoque de produtos vendidos nela é devolvido. Essa ação não pode ser desfeita.")) {
      return;
    }
    const res = await fetch(`/api/sales/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelada" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível cancelar a venda.");
      return;
    }
    loadSales();
    loadCatalog(); // reflete o estoque devolvido
  }

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.key === item.key);
      if (existing) {
        // produto: não deixa passar do estoque disponível
        if (item.type === "product" && existing.quantity >= (item.stock ?? Infinity)) return prev;
        return prev.map((l) => (l.key === item.key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key: item.key,
          type: item.type,
          ref: item.ref,
          name: item.name,
          unitPrice: item.price ?? 0,
          quantity: 1,
          maxStock: item.stock,
          needsPrice: item.price === undefined,
        },
      ];
    });
  }

  function updateUnitPrice(key: string, value: number) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, unitPrice: Math.max(0, value) } : l)));
  }

  function changeQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const next = l.quantity + delta;
          if (l.maxStock !== undefined && next > l.maxStock) return l;
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  // Categorias disponíveis dependem do tipo selecionado — evita mostrar
  // um filtro de categoria que não existe pra nenhum item visível.
  const categories = useMemo(() => {
    const byType = typeFilter ? catalog.filter((c) => c.type === typeFilter) : catalog;
    return Array.from(new Set(byType.map((c) => c.category || NO_CATEGORY))).sort();
  }, [catalog, typeFilter]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(q);
      const matchesType = !typeFilter || c.type === typeFilter;
      const matchesCategory = !category || (c.category || NO_CATEGORY) === category;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [catalog, search, typeFilter, category]);

  async function handleCheckout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError("Adicione ao menos um item ao carrinho.");
      return;
    }

    const missingPrice = cart.filter((l) => l.needsPrice && l.unitPrice <= 0);
    if (missingPrice.length > 0) {
      setError(`Defina o valor de: ${missingPrice.map((l) => l.name).join(", ")}.`);
      return;
    }

    const form = new FormData(e.currentTarget);
    const payload = {
      patient: form.get("patient") || undefined,
      method: form.get("method"),
      status: form.get("status"),
      items: cart.map((l) => ({
        type: l.type,
        ref: l.ref,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    };

    setSubmitting(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Não foi possível registrar a venda.");
      return;
    }

    setCart([]);
    (e.target as HTMLFormElement).reset();
    loadCatalog(); // recarrega pra refletir o novo estoque
    loadSales();
  }

  return (
    <div className="space-y-6">
      {/* Barra de busca e filtros do catálogo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serviço ou produto..."
            className="w-full rounded-lg border border-line bg-surface pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1">
          {(["", "service", "product"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTypeFilter(t);
                setCategory("");
              }}
              className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                typeFilter === t ? "bg-blue text-white" : "text-ink-muted hover:bg-surface-soft"
              }`}
            >
              {t === "" ? "Todos" : t === "service" ? "Serviços" : "Produtos"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategory("")}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              category === ""
                ? "bg-ink text-porcelain border-ink"
                : "bg-surface text-ink-muted border-line hover:border-blue/40"
            }`}
          >
            Todas categorias
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                category === c
                  ? "bg-ink text-porcelain border-ink"
                  : "bg-surface text-ink-muted border-line hover:border-blue/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Catálogo — grade de cartões clicáveis */}
        <div className="lg:col-span-3">
          <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-4 max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-xl" />
                ))}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-muted">
                Nada encontrado. Cadastre serviços e produtos em{" "}
                <span className="font-medium text-ink">Serviços</span>.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCatalog.map((item) => {
                  const outOfStock = item.type === "product" && (item.stock ?? 0) <= 0;
                  const { bg, text } = colorFor(item.category || item.name);
                  const Icon = item.type === "service" ? Stethoscope : Package;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(item)}
                      className="card-hover group text-left bg-surface border border-line rounded-xl p-3 flex flex-col gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} ${text}`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{item.name}</p>
                        {item.type === "product" && (
                          <p className={`text-[11px] mt-0.5 ${outOfStock ? "text-danger" : "text-ink-faint"}`}>
                            {outOfStock ? "Sem estoque" : `${item.stock} em estoque`}
                          </p>
                        )}
                      </div>
                      {item.price === undefined ? (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-warning-soft text-warning w-fit">
                          Definir na venda
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-ink tabular">{currency(item.price)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Carrinho e finalização */}
        <form
          onSubmit={handleCheckout}
          className="lg:col-span-2 bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-5 space-y-4 lg:sticky lg:top-4"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue" />
            <h2 className="font-semibold text-ink">Carrinho</h2>
            {cart.length > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-soft text-blue-strong">
                {cart.reduce((n, l) => n + l.quantity, 0)}
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-ink-muted py-4">Clique num item do catálogo pra adicionar aqui.</p>
          ) : (
            <ul className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cart.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-ink font-medium truncate">{l.name}</p>
                    {l.needsPrice ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-ink-faint text-xs">R$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.unitPrice || ""}
                          onChange={(e) => updateUnitPrice(l.key, Number(e.target.value))}
                          placeholder="0,00"
                          className={`w-20 rounded-md border px-1.5 py-0.5 text-xs tabular ${
                            l.unitPrice > 0 ? "border-line" : "border-warning bg-warning-soft"
                          }`}
                        />
                        <span className="text-ink-faint text-xs">cada</span>
                      </div>
                    ) : (
                      <p className="text-ink-faint text-xs tabular">{currency(l.unitPrice)} cada</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => changeQuantity(l.key, -1)}
                      className="w-6 h-6 rounded-md border border-line flex items-center justify-center text-ink-muted hover:bg-surface-soft"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center tabular">{l.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(l.key, 1)}
                      disabled={l.maxStock !== undefined && l.quantity >= l.maxStock}
                      className="w-6 h-6 rounded-md border border-line flex items-center justify-center text-ink-muted hover:bg-surface-soft disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="ml-1 text-ink-faint hover:text-danger"
                      aria-label="Remover item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-muted">Total</span>
            <span className="font-display text-xl font-semibold text-ink tabular">{currency(total)}</span>
          </div>

          <div className="border-t border-line pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Paciente (opcional)</label>
              <select name="patient" className="input" defaultValue="">
                <option value="">Venda avulsa (sem paciente)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-xs font-medium text-ink-muted mb-1">Status</label>
                <select name="status" className="input" defaultValue="pago">
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={submitting || cart.length === 0} className="w-full btn-primary">
            {submitting ? "Finalizando..." : "Finalizar venda"}
          </button>
        </form>
      </div>

      {/* Painel de vendas — separado do catálogo/carrinho, com filtro de
          período e indicadores de pago x pendente. */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-ink">Painel de vendas</h2>
          <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1">
            {(["hoje", "semana", "mes"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                  period === p ? "bg-blue text-white" : "text-ink-muted hover:bg-surface-soft"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <SalesStats sales={sales} loading={salesLoading} />

        <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
          <p className="px-5 py-4 border-b border-line text-sm font-semibold text-ink">
            Vendas — {PERIOD_LABELS[period].toLowerCase()}
          </p>
          {salesLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">Nenhuma venda no período selecionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-faint text-xs uppercase tracking-wide">
                    <th className="px-5 py-2 font-medium">Cliente</th>
                    <th className="px-5 py-2 font-medium">Itens</th>
                    <th className="px-5 py-2 font-medium">Pagamento</th>
                    <th className="px-5 py-2 font-medium">Data</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium text-right">Total</th>
                    <th className="px-5 py-2 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    const cancelled = s.status === "cancelada";
                    return (
                    <tr
                      key={s._id}
                      className={`border-t border-line-soft hover:bg-surface-soft transition-colors ${cancelled ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <PatientAvatar name={s.patient?.name ?? "Venda avulsa"} size={28} />
                          <span className={`text-ink whitespace-nowrap ${cancelled ? "line-through" : ""}`}>
                            {s.patient?.name ?? "Venda avulsa"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-muted max-w-[240px] truncate">
                        {s.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </td>
                      <td className="px-5 py-3 text-ink-muted whitespace-nowrap">
                        {methodLabels[s.method] ?? s.method}
                      </td>
                      <td className="px-5 py-3 text-ink-faint whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${saleStatusStyles[s.status]}`}>
                          {saleStatusLabels[s.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-ink tabular whitespace-nowrap">
                        {currency(s.total)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!cancelled && (
                          <button
                            onClick={() => handleCancelSale(s._id)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors"
                            aria-label="Cancelar venda"
                            title="Cancelar venda"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalesStats({ sales, loading }: { sales: Sale[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const paid = sales.filter((s) => s.status === "pago");
  const pending = sales.filter((s) => s.status === "pendente");
  // Vendas canceladas saem dos totais e da contagem — senão "ticket
  // médio" ficava artificialmente mais baixo (dividindo pelo total de
  // vendas incluindo as que foram estornadas e não somam nada).
  const active = sales.filter((s) => s.status !== "cancelada");
  const totalPaid = paid.reduce((sum, s) => sum + s.total, 0);
  const totalPending = pending.reduce((sum, s) => sum + s.total, 0);
  const ticket = active.length > 0 ? (totalPaid + totalPending) / active.length : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Recebido" value={currency(totalPaid)} detail={`${paid.length} venda${paid.length !== 1 ? "s" : ""}`} tone="success" />
      <StatCard
        label="A receber"
        value={currency(totalPending)}
        detail={`${pending.length} venda${pending.length !== 1 ? "s" : ""}`}
        tone={pending.length > 0 ? "warning" : "default"}
      />
      <StatCard label="Nº de vendas" value={String(active.length)} detail="no período" />
      <StatCard label="Ticket médio" value={currency(ticket)} detail="por venda" />
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-4">
      <p className="text-ink-faint text-xs uppercase tracking-wide">{label}</p>
      <p className={`font-display text-xl font-semibold tabular mt-1 ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-faint mt-0.5">{detail}</p>
    </div>
  );
}
