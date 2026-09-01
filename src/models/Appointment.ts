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

export interface IAppointment {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  dentist: Types.ObjectId;
  start: Date;
  end: Date;
  status: AppointmentStatus;
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
