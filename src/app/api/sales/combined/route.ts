// Rota de leitura da RECEITA COMBINADA: vendas (checkout, tela Vendas) +
// cobranças de paciente (parcela de orçamento ou avulsa, ficha do
// paciente → Financeiro), numa lista só. Só leitura — criar venda
// continua em /api/sales, criar cobrança continua em
// /api/patients/[id]/payments; esta rota existe só pra alimentar a
// tela de Vendas e o card "Últimas vendas" do painel inicial, que agora
// mostram os dois juntos (ver src/lib/revenue.ts pro porquê).
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { getCombinedRevenue } from "@/lib/revenue";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  await connectDB();
  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const entries = await getCombinedRevenue({
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit,
  });

  return NextResponse.json({ entries });
}
