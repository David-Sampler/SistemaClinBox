// Botão "Desativar paciente" — a rota de API já existia (DELETE
// /api/patients/[id], que só marca active:false, nunca apaga de
// verdade), mas não tinha nenhum jeito de chamar ela pela tela. Só
// admin/dentista veem o botão, igual à regra já aplicada na própria API.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { usePermission } from "@/components/permissions-provider";

export function DeactivatePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // O admin decide em Equipe → Permissões se a recepção (staff) pode
  // desativar cadastro de paciente.
  const canManage = usePermission("deletePatients");
  if (!canManage) return null;

  async function handleDeactivate() {
    if (
      !confirm(
        `Desativar ${patientName}? O histórico (prontuário, financeiro, documentos) é mantido, mas o paciente some das listas.`
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      alert("Não foi possível desativar o paciente.");
      return;
    }

    router.push("/pacientes");
    router.refresh();
  }

  return (
    <button onClick={handleDeactivate} disabled={loading} className="btn-secondary hover:!bg-danger-soft hover:!text-danger">
      <UserX size={15} /> {loading ? "Desativando..." : "Desativar paciente"}
    </button>
  );
}
