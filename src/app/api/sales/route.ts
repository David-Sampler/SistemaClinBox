// Rota de API de VENDAS: listar o histórico (GET) e registrar uma nova
// venda (POST) — o "checkout" da tela de Vendas. Ao vender um produto,
// a rota já dá baixa no estoque automaticamente.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { saleSchema } from "@/lib/validators";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);

  // "from"/"to" alimentam o filtro de período (hoje/semana/mês) do
  // painel de vendas — sem eles, devolve simplesmente as mais recentes.
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const filter: Record<string, unknown> = {};
  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  }

  const sales = await Sale.find(filter)
    .populate("patient", "name")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Confere de novo aqui (não só na tela) que nenhum item está com valor
  // zerado — a validação do formulário evita isso na maioria dos casos,
  // mas a API precisa recusar por conta própria também, sem depender só
  // do que o navegador mandou.
  const zeroPrice = parsed.data.items.filter((i) => i.unitPrice <= 0);
  if (zeroPrice.length > 0) {
    return NextResponse.json(
      { error: `Defina o valor de: ${zeroPrice.map((i) => i.name).join(", ")}.` },
      { status: 400 }
    );
  }

  await connectDB();

  // Antes de criar a venda, confere se tem estoque suficiente de cada
  // produto — evita vender mais do que a clínica tem guardado.
  const productItems = parsed.data.items.filter((i) => i.type === "product" && i.ref);
  for (const item of productItems) {
    const product = await Product.findById(item.ref);
    if (!product) {
      return NextResponse.json({ error: `Produto "${item.name}" não encontrado` }, { status: 400 });
    }
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Estoque insuficiente de "${product.name}" (disponível: ${product.stock})` },
        { status: 400 }
      );
    }
  }

  // Passou na conferência — agora dá baixa de fato no estoque de cada produto.
  for (const item of productItems) {
    await Product.findByIdAndUpdate(item.ref, { $inc: { stock: -item.quantity } });
  }

  const items = parsed.data.items.map((i) => ({ ...i, subtotal: i.unitPrice * i.quantity }));
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  const sale = await Sale.create({
    patient: parsed.data.patient,
    items,
    total,
    method: parsed.data.method,
    status: parsed.data.status ?? "pago",
    createdBy: session!.user.id,
  });

  return NextResponse.json({ sale }, { status: 201 });
}
