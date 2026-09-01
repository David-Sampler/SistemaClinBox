// Modelo de PERMISSÕES POR PAPEL: em vez de travar no código quem pode
// fazer o quê, o administrador decide isso pela tela (Equipe →
// Permissões). Cada papel (dentista/recepção) tem um documento aqui com
// as ações liberadas ou não.
//
// "admin" NUNCA aparece aqui de propósito — administrador sempre tem
// acesso total, fixo no código (src/lib/permissions.ts). Isso evita a
// clínica se trancar pra fora do próprio sistema (ex: um admin
// desmarcando sem querer a permissão de... administrar permissões).
import { Schema, model, models, Model } from "mongoose";

export type ConfigurableRole = "dentist" | "staff";

export interface IRolePermissions {
  clinicalRecords: boolean; // registrar procedimento no prontuário
  odontogram: boolean; // registrar situação de dente no odontograma
  clinicDocuments: boolean; // emitir/excluir atestado, laudo, receita, comparecimento
  catalog: boolean; // criar/editar/desativar serviços e produtos
  deletePatients: boolean; // desativar cadastro de paciente
}

export interface IRolePermission {
  _id: string;
  role: ConfigurableRole;
  permissions: IRolePermissions;
  updatedAt: Date;
}

// Valores padrão = exatamente o comportamento que o sistema já tinha
// antes de isso virar configurável (dentista com acesso clínico
// completo, recepção sem) — trocar pra esse recurso não muda nada até
// o admin de fato mexer numa permissão.
export const DEFAULT_PERMISSIONS: Record<ConfigurableRole, IRolePermissions> = {
  dentist: {
    clinicalRecords: true,
    odontogram: true,
    clinicDocuments: true,
    catalog: true,
    deletePatients: true,
  },
  staff: {
    clinicalRecords: false,
    odontogram: false,
    clinicDocuments: false,
    catalog: false,
    deletePatients: false,
  },
};

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    role: { type: String, enum: ["dentist", "staff"], required: true, unique: true },
    permissions: {
      clinicalRecords: { type: Boolean, default: false },
      odontogram: { type: Boolean, default: false },
      clinicDocuments: { type: Boolean, default: false },
      catalog: { type: Boolean, default: false },
      deletePatients: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const RolePermission: Model<IRolePermission> =
  models.RolePermission || model<IRolePermission>("RolePermission", RolePermissionSchema);
