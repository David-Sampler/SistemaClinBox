// Permissões CONFIGURÁVEIS por papel — o que antes era fixo no código
// (requireRole com uma lista de papéis "chumbada") agora o administrador
// decide pela tela (Equipe → Permissões). Usado junto com requireRole:
// requireRole ainda cuida do que é sempre fixo (equipe = admin apenas,
// por segurança); requirePermission cuida do que o admin pode ajustar.
import { NextResponse } from "next/server";
import { connectDB } from "./db";
import { RolePermission, DEFAULT_PERMISSIONS, ConfigurableRole, IRolePermissions } from "@/models/RolePermission";

export type PermissionKey = keyof IRolePermissions;

// admin sempre tem acesso total, fixo no código — nunca fica atrás de
// uma configuração que alguém possa desmarcar sem querer.
export async function hasPermission(role: string | undefined, key: PermissionKey): Promise<boolean> {
  if (role === "admin") return true;
  if (role !== "dentist" && role !== "staff") return false;

  await connectDB();
  const doc = await RolePermission.findOne({ role }).lean();
  if (!doc) return DEFAULT_PERMISSIONS[role as ConfigurableRole][key];
  return doc.permissions[key];
}

// Mesmo padrão de requireRole: devolve uma resposta 403 pronta pra rota
// só dar "return", ou null quando pode seguir em frente.
export async function requirePermission(role: string | undefined, key: PermissionKey) {
  const ok = await hasPermission(role, key);
  if (!ok) {
    return NextResponse.json({ error: "Sem permissão para esta ação" }, { status: 403 });
  }
  return null;
}
