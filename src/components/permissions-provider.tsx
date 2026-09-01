// Contexto de PERMISSÕES: busca a configuração atual (dentista/recepção)
// uma vez só, quando o painel carrega, e deixa qualquer tela consultar
// via usePermission(chave) — sem cada componente ter que buscar sozinho.
// admin sempre true, sem nem olhar a configuração (mesma regra do lado
// do servidor, em src/lib/permissions.ts).
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type PermissionKey = "clinicalRecords" | "odontogram" | "clinicDocuments" | "catalog" | "deletePatients";

type RolePermissions = Record<PermissionKey, boolean>;
type PermissionsMap = { dentist: RolePermissions; staff: RolePermissions };

const DEFAULTS: PermissionsMap = {
  dentist: { clinicalRecords: true, odontogram: true, clinicDocuments: true, catalog: true, deletePatients: true },
  staff: { clinicalRecords: false, odontogram: false, clinicDocuments: false, catalog: false, deletePatients: false },
};

const PermissionsContext = createContext<{ permissions: PermissionsMap; loading: boolean; reload: () => void }>({
  permissions: DEFAULTS,
  loading: true,
  reload: () => {},
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/permissions");
    if (res.ok) {
      const data = await res.json();
      setPermissions(data.permissions);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, reload: load }}>{children}</PermissionsContext.Provider>
  );
}

// Hook principal: devolve se o usuário LOGADO pode fazer determinada
// ação. admin sempre true; enquanto a configuração ainda está
// carregando, devolve false por segurança (esconde a ação até saber
// com certeza, em vez de mostrar e esconder de novo — evita "piscar").
export function usePermission(key: PermissionKey): boolean {
  const { data: session } = useSession();
  const { permissions, loading } = useContext(PermissionsContext);

  const role = session?.user?.role;
  if (role === "admin") return true;
  if (loading) return false;
  if (role !== "dentist" && role !== "staff") return false;
  return permissions[role][key];
}

// Pra tela de administração das próprias permissões (Equipe →
// Permissões), que precisa ver/editar os dois papéis de uma vez.
export function useAllPermissions() {
  const { permissions, loading, reload } = useContext(PermissionsContext);
  return { permissions, loading, reload };
}
