// Modelo de AGENDAMENTOS (consultas marcadas na agenda).
// Cada agendamento liga um paciente a um dentista, num intervalo de data/hora.
import { Schema, model, models, Model, Types } from "mongoose";

// Ciclo de vida de um agendamento, do momento em que é marcado até o fim do atendimento:
export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "falta";

// Tipo da consulta — diferente do status (que muda ao longo do dia) e do
// procedimento (texto livre do que foi/será feito): categoriza de forma
// fixa PARA QUE tipo de atendimento é a consulta, usado pra colorir o
// bloco na agenda de relance (ex: distinguir uma urgência de uma
// avaliação de rotina sem precisar abrir o painel de detalhe).
export type AppointmentType = "avaliacao" | "retorno" | "urgencia" | "procedimento" | "manutencao";

export interface IAppointment {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  dentist: Types.ObjectId;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  type?: AppointmentType;
  procedure?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    dentist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      enum: ["agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "falta"],
      default: "agendado",
    },
    // Sem "required": consultas criadas antes desse campo existir ficam
    // sem tipo (a agenda simplesmente não mostra a bolinha colorida pra
    // elas) — não precisa de migração de dados antigos.
    type: { type: String, enum: ["avaliacao", "retorno", "urgencia", "procedimento", "manutencao"] },
    procedure: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Índices para deixar rápido: buscar a agenda de um dentista por data,
// e buscar o histórico de consultas de um paciente.
AppointmentSchema.index({ dentist: 1, start: 1 });
AppointmentSchema.index({ patient: 1, start: -1 });

export const Appointment: Model<IAppointment> =
  models.Appointment || model<IAppointment>("Appointment", AppointmentSchema);
