// Modelo (tabela/coleção) de USUÁRIOS do sistema: quem consegue fazer login.
// Como o sistema é usado por várias pessoas (dentistas, recepção, administração),
// cada usuário tem um "papel" (role) que define o que ele pode ou não fazer.
import { Schema, model, models, Model, Types } from "mongoose";

// Papéis possíveis de um usuário:
// - admin: acesso total (cadastra usuários, vê tudo)
// - dentist: dentista, atende pacientes, mexe em prontuário/agenda
// - staff: recepção/secretaria, cuida de agenda e cadastro de pacientes
export type UserRole = "admin" | "dentist" | "staff";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  cro?: string; // registro no Conselho Regional de Odontologia, se dentista
  phone?: string;
  avatarBlobUrl?: string; // foto de perfil, guardada no Vercel Blob (veja src/lib/blob.ts)
  avatarMimeType?: string; // ex: "image/jpeg" — necessário pra servir a foto com o Content-Type certo
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    // email é único: não pode haver dois usuários com o mesmo e-mail (usado para login)
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // NUNCA guardamos a senha em texto puro, só o "hash" (senha criptografada) — veja src/auth.ts
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "dentist", "staff"], required: true, default: "staff" },
    cro: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatarBlobUrl: { type: String },
    avatarMimeType: { type: String },
    // "active: false" é usado para desativar um usuário sem apagar o histórico dele do banco
    active: { type: Boolean, default: true },
  },
  { timestamps: true } // cria automaticamente os campos createdAt e updatedAt
);

// Esse padrão "models.User || model(...)" evita erro do tipo
// "Cannot overwrite model once compiled" quando o Next.js recarrega o código em desenvolvimento.
export const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);
