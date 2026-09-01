// Página de CATÁLOGO: serviços (procedimentos) e produtos que a
// clínica vende, com preço de cada um — e estoque, no caso dos
// produtos. Serve de base para orçamentos, cobranças e a tela de Vendas.
// Visual em grade de cartões (como um catálogo), com busca e filtro
// por categoria — pensado pra achar um item rápido no meio da correria.
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Pencil, Plus, Search, Stethoscope, Package, Trash2, Boxes } from "lucide-react";
import { colorFor } from "@/lib/palette";
import { Modal } from "@/components/modal";

type Service = {
  _id: string;
  name: string;
  category?: string;
  defaultPrice?: number;
};

type Product = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
};

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NO_CATEGORY = "Outros";

export default function CatalogoPage() {
  const [tab, setTab] = useState<"servicos" | "produtos">("servicos");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Serviços e produtos</h1>
        <p className="text-ink-muted">Catálogo de procedimentos e itens que a clínica vende</p>
      </div>

      <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1 w-fit">
        {(["servicos", "produtos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 h-8 text-sm font-medium rounded-md transition-colors ${
              tab === t ? "bg-blue text-white" : "text-ink-muted hover:bg-surface-soft"
            }`}
          >
            {t === "servicos" ? "Serviços" : "Produtos"}
          </button>
        ))}
      </div>

      {tab === "servicos" ? <ServicosTab /> : <ProdutosTab />}
    </div>
  );
}

// Barra de busca + filtro por categoria, reaproveitada pelas duas abas.
function CatalogToolbar({
  search,
  onSearch,
  categories,
  activeCategory,
  onCategory,
  action,
}: {
  search: string;
  onSearch: (v: string) => void;
  categories: string[];
  activeCategory: string;
  onCategory: (c: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full rounded-lg border border-line bg-surface pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onCategory("")}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            activeCategory === ""
              ? "bg-blue text-white border-blue"
              : "bg-surface text-ink-muted border-line hover:border-blue/40"
          }`}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onCategory(c)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activeCategory === c
                ? "bg-blue text-white border-blue"
                : "bg-surface text-ink-muted border-line hover:border-blue/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function ServicosTab() {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);

  const canManage = session?.user?.role === "admin" || session?.user?.role === "dentist";

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data.services ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const rawPrice = form.get("defaultPrice");
    const payload = {
      name: form.get("name"),
      category: form.get("category") || undefined,
      defaultPrice: rawPrice ? Number(rawPrice) : undefined,
    };

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Não foi possível salvar o serviço.");
      return;
    }

    (e.target as HTMLFormElement).reset();
    setShowForm(false);
    loadServices();
  }

  async function handleDeactivate(id: string) {
    setServices((prev) => prev.filter((s) => s._id !== id));
    await fetch(`/api/services/${id}`, { method: "DELETE" });
  }

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category || NO_CATEGORY))).sort(),
    [services]
  );

  const filtered = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !category || (s.category || NO_CATEGORY) === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <CatalogToolbar
        search={search}
        onSearch={setSearch}
        categories={categories}
        activeCategory={category}
        onCategory={setCategory}
        action={
          canManage && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
              <Plus size={16} /> Novo serviço
            </button>
          )
        }
      />

      {showForm && canManage && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-soft border border-line rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Nome do serviço</label>
            <input name="name" required className="input" placeholder="Ex: Restauração em resina" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Categoria (opcional)</label>
            <input name="category" className="input" placeholder="Ex: Restaurador" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">
              Preço padrão <span className="text-ink-faint font-normal">(opcional)</span>
            </label>
            <input
              name="defaultPrice"
              type="number"
              min={0}
              step="0.01"
              placeholder="Deixe em branco p/ definir na venda"
              className="input"
            />
          </div>

          {error && <p className="sm:col-span-3 text-sm text-danger">{error}</p>}

          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              Salvar serviço
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyCatalog icon={Stethoscope} text="Nenhum serviço cadastrado ainda." />
      ) : filtered.length === 0 ? (
        <EmptyCatalog icon={Search} text="Nada encontrado com esses filtros." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((s, i) => (
            <CatalogCard
              key={s._id}
              index={i}
              name={s.name}
              category={s.category}
              price={s.defaultPrice}
              icon={Stethoscope}
              canManage={canManage}
              onEdit={() => setEditing(s)}
              onDeactivate={() => handleDeactivate(s._id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditServiceModal service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadServices(); }} />
      )}
    </div>
  );
}

function EditServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: Service;
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
    const rawPrice = form.get("defaultPrice");
    const payload = {
      name: form.get("name"),
      category: form.get("category") || undefined,
      defaultPrice: rawPrice ? Number(rawPrice) : undefined,
    };

    const res = await fetch(`/api/services/${service._id}`, {
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
    <Modal title="Editar serviço" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Nome do serviço</label>
          <input name="name" required defaultValue={service.name} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Categoria</label>
          <input name="category" defaultValue={service.category} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Preço padrão <span className="text-ink-faint font-normal">(opcional)</span>
          </label>
          <input
            name="defaultPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={service.defaultPrice}
            placeholder="Deixe em branco p/ definir na venda"
            className="input"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </Modal>
  );
}

function ProdutosTab() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

  const canManage = session?.user?.role === "admin" || session?.user?.role === "dentist";

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      category: form.get("category") || undefined,
      price: Number(form.get("price")),
      stock: Number(form.get("stock") || 0),
    };

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Não foi possível salvar o produto.");
      return;
    }

    (e.target as HTMLFormElement).reset();
    setShowForm(false);
    loadProducts();
  }

  async function handleDeactivate(id: string) {
    setProducts((prev) => prev.filter((p) => p._id !== id));
    await fetch(`/api/products/${id}`, { method: "DELETE" });
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category || NO_CATEGORY))).sort(),
    [products]
  );

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !category || (p.category || NO_CATEGORY) === category;
    return matchesSearch && matchesCategory;
  });

  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  return (
    <div className="space-y-4">
      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniStat label="Produtos cadastrados" value={String(products.length)} />
          <MiniStat label="Valor total em estoque" value={currency(totalStockValue)} />
          <MiniStat
            label="Estoque baixo (≤5)"
            value={String(lowStockCount)}
            tone={lowStockCount > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <CatalogToolbar
        search={search}
        onSearch={setSearch}
        categories={categories}
        activeCategory={category}
        onCategory={setCategory}
        action={
          canManage && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
              <Plus size={16} /> Novo produto
            </button>
          )
        }
      />

      {showForm && canManage && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-soft border border-line rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Nome do produto</label>
            <input name="name" required className="input" placeholder="Ex: Escova macia" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Categoria (opcional)</label>
            <input name="category" className="input" placeholder="Ex: Higiene" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Preço</label>
            <input name="price" type="number" min={0} step="0.01" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Estoque inicial</label>
            <input name="stock" type="number" min={0} step="1" defaultValue={0} className="input" />
          </div>

          {error && <p className="sm:col-span-4 text-sm text-danger">{error}</p>}

          <div className="sm:col-span-4">
            <button type="submit" className="btn-primary">
              Salvar produto
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyCatalog icon={Package} text="Nenhum produto cadastrado ainda." />
      ) : filtered.length === 0 ? (
        <EmptyCatalog icon={Search} text="Nada encontrado com esses filtros." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p, i) => (
            <CatalogCard
              key={p._id}
              index={i}
              name={p.name}
              category={p.category}
              price={p.price}
              stock={p.stock}
              icon={Package}
              canManage={canManage}
              onEdit={() => setEditing(p)}
              onDeactivate={() => handleDeactivate(p._id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditProductModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadProducts(); }} />
      )}
    </div>
  );
}

function EditProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
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
      name: form.get("name"),
      category: form.get("category") || undefined,
      price: Number(form.get("price")),
      stock: Number(form.get("stock") || 0),
    };

    const res = await fetch(`/api/products/${product._id}`, {
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
    <Modal title="Editar produto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Nome do produto</label>
          <input name="name" required defaultValue={product.name} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Categoria</label>
          <input name="category" defaultValue={product.category} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Preço</label>
            <input name="price" type="number" min={0} step="0.01" required defaultValue={product.price} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Estoque</label>
            <input name="stock" type="number" min={0} step="1" required defaultValue={product.stock} className="input" />
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

// Cartão de um item do catálogo (serviço ou produto) — o coração do
// novo visual: ícone colorido por categoria, nome, preço e, quando é
// produto, um selo de estoque.
function CatalogCard({
  name,
  category,
  price,
  stock,
  icon: Icon,
  canManage,
  onEdit,
  onDeactivate,
  index,
}: {
  name: string;
  category?: string;
  price?: number;
  stock?: number;
  icon: React.ElementType;
  canManage: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  index: number;
}) {
  const { bg, text } = colorFor(category || name);
  const stockTone =
    stock === undefined
      ? null
      : stock === 0
        ? "bg-danger-soft text-danger"
        : stock <= 5
          ? "bg-warning-soft text-warning"
          : "bg-neutral-soft text-ink-faint";

  return (
    <div
      className="card-hover fade-up group relative bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-4 flex flex-col gap-3"
      style={{ animationDelay: `${Math.min(index, 11) * 25}ms` }}
    >
      {canManage && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-ink-faint hover:text-blue" aria-label="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={onDeactivate} className="text-ink-faint hover:text-danger" aria-label="Desativar">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} ${text}`}>
        <Icon size={17} />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-ink leading-snug">{name}</p>
        {category && <p className="text-xs text-ink-faint mt-0.5">{category}</p>}
      </div>

      <div className="flex items-center justify-between">
        {price === undefined ? (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-warning-soft text-warning">A combinar</span>
        ) : (
          <span className="font-display text-base font-semibold text-ink tabular">{currency(price)}</span>
        )}
        {stockTone && (
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${stockTone}`}>{stock} un.</span>
        )}
      </div>
    </div>
  );
}

function EmptyCatalog({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] px-5 py-14 text-center">
      <Icon size={28} className="mx-auto text-ink-faint mb-2" />
      <p className="text-sm text-ink-muted">{text}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] p-4 flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          tone === "warning" ? "bg-warning-soft text-warning" : "bg-blue-soft text-blue"
        }`}
      >
        <Boxes size={17} />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-ink tabular leading-tight">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
