// Rota de UMA venda específica: cancelar (PUT). Uma venda cancelada NÃO
// é apagada — fica no histórico marcada como "cancelada" (é um estorno,
// não um "nunca existiu"), e se tinha produto, devolve a quantidade pro
// estoque (senão o produto ficava "vendido" pra sempre mesmo sem ter saído).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { requireSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status !== "cancelada") {
    return NextResponse.json({ error: "Essa rota só cancela vendas (status 'cancelada')" }, { status: 400 });
  }

  await connectDB();
  const sale = await Sale.findById(id);
  if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
  if (sale.status === "cancelada") {
    return NextResponse.json({ error: "Esta venda já está cancelada" }, { status: 409 });
  }

  // Devolve pro estoque cada produto vendido nessa venda.
  const productItems = sale.items.filter((i) => i.type === "product" && i.ref);
  for (const item of productItems) {
    await Product.findByIdAndUpdate(item.ref, { $inc: { stock: item.quantity } });
  }

  sale.status = "cancelada";
  await sale.save();

  return NextResponse.json({ sale });
}
