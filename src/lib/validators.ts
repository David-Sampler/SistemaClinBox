// Esquemas de VALIDAÇÃO (usando a biblioteca zod) para os dados que chegam
// nas rotas de API. Antes de salvar qualquer coisa no banco, validamos aqui
// se os dados enviados pelo formulário estão no formato esperado.
import { z } from "zod";
import { isValidCPF } from "./cpf";
import { isValidPhone } from "./phone";

export const patientSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  // CPF é opcional (nem todo paciente tem, ex: criança sem documento
  // ainda), mas se foi informado precisa ser um CPF de verdade — a
  // validação confere os dois dígitos verificadores, não só o formato.
  cpf: z
    .string()
    .optional()
    .refine((v) => !v || isValidCPF(v), "CPF inválido — confira os números digitados"),
  // Recusa data de nascimento no futuro — o campo do formulário já tem
  // um limite (max="hoje"), mas isso pode ser contornado direto na API,
  // então validamos de novo aqui.
  birthDate: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v) <= new Date(), "Data de nascimento não pode ser no futuro"),
  gender: z.enum(["masculino", "feminino", "outro"]).optional(),
  // Telefone sempre com DDD: 10 dígitos (fixo) ou 11 (celular) — é o que
  // permite chamar o paciente no WhatsApp direto da tela.
  phone: z.string().refine(isValidPhone, "Telefone inválido — informe DDD + número"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z
        .string()
        .optional()
        .refine((v) => !v || isValidPhone(v), "Telefone do contato de emergência inválido"),
    })
    .optional(),
  healthInsurance: z.string().optional(),
  // Anamnese: além do texto livre, um checklist das condições mais
  // relevantes pra um atendimento odontológico seguro (afetam anestesia,
  // sangramento, cicatrização...) — reduz a chance de algo importante
  // passar batido só porque não foi lembrado na hora do cadastro.
  medicalHistory: z
    .object({
      allergies: z.string().optional(),
      medications: z.string().optional(),
      conditions: z.string().optional(),
      isPregnant: z.boolean().optional(),
      isSmoker: z.boolean().optional(),
      hasDiabetes: z.boolean().optional(),
      hasHypertension: z.boolean().optional(),
      hasHeartCondition: z.boolean().optional(),
      hasBleedingDisorder: z.boolean().optional(),
      hadAnesthesiaReaction: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const appointmentSchema = z.object({
  patient: z.string().min(1, "Paciente obrigatório"),
  dentist: z.string().min(1, "Dentista obrigatório"),
  start: z.string().min(1, "Data/hora inicial obrigatória"),
  end: z.string().min(1, "Data/hora final obrigatória"),
  status: z
    .enum(["agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "falta"])
    .optional(),
  procedure: z.string().optional(),
  notes: z.string().optional(),
});

export const clinicalRecordSchema = z.object({
  dentist: z.string().min(1, "Dentista obrigatório"),
  appointment: z.string().optional(),
  date: z.string().optional(),
  tooth: z.string().optional(),
  procedure: z.string().min(1, "Procedimento obrigatório"),
  description: z.string().optional(),
});

export const odontogramSchema = z.object({
  teeth: z.array(
    z.object({
      number: z.string(),
      status: z.enum([
        "sadio",
        "cariado",
        "restaurado",
        "ausente",
        "extracao_indicada",
        "tratamento_endodontico",
        "coroa",
        "implante",
        "fraturado",
        "protese",
      ]),
      faces: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
  ),
});

export const budgetSchema = z.object({
  dentist: z.string().min(1, "Dentista obrigatório"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Descrição obrigatória"),
        tooth: z.string().optional(),
        value: z.number().min(0),
      })
    )
    .min(1, "Adicione ao menos um item"),
  status: z.enum(["pendente", "aprovado", "rejeitado"]).optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  // "" (nenhum orçamento selecionado, cobrança avulsa) vira undefined —
  // senão o Mongoose tentaria salvar uma string vazia como se fosse um
  // ID de orçamento e daria erro.
  budget: z.string().optional().transform((v) => v || undefined),
  amount: z.number().min(0),
  method: z.enum(["dinheiro", "cartao_credito", "cartao_debito", "pix", "boleto", "convenio"]),
  installment: z
    .object({
      number: z.number().int().min(1),
      total: z.number().int().min(1),
    })
    .optional(),
  dueDate: z.string().min(1, "Vencimento obrigatório"),
  paidDate: z.string().optional(),
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).optional(),
  notes: z.string().optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  category: z.string().optional(),
  // Opcional de propósito: serviços sem valor fixo ficam em branco no
  // catálogo, e o preço é definido na hora da venda.
  defaultPrice: z.number().min(0, "Valor não pode ser negativo").optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  category: z.string().optional(),
  price: z.number().min(0, "Valor não pode ser negativo"),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
});

export const saleItemSchema = z.object({
  type: z.enum(["service", "product"]),
  ref: z.string().optional(),
  name: z.string().min(1, "Item sem nome"),
  unitPrice: z.number().min(0),
  quantity: z.number().int().min(1),
});

export const saleSchema = z.object({
  // "" (venda avulsa, sem paciente cadastrado) vira undefined — mesma
  // lógica do "budget" em paymentSchema.
  patient: z.string().optional().transform((v) => v || undefined),
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um item"),
  method: z.enum(["dinheiro", "cartao_credito", "cartao_debito", "pix", "boleto", "convenio"]),
  status: z.enum(["pago", "pendente"]).optional(),
});

export const userSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["admin", "dentist", "staff"]),
  cro: z.string().optional(),
  phone: z.string().optional(),
});

// Edição de um usuário já existente: tudo opcional (o formulário manda só
// o que mudou). "password" fica de fora do formulário normal de editar
// cadastro — só é usado pela tela separada de "Redefinir senha" (ver
// src/components/reset-password-modal.tsx), mas mora no mesmo endpoint.
export const userUpdateSchema = z.object({
  name: z.string().min(2, "Nome muito curto").optional(),
  email: z.string().email("E-mail inválido").optional(),
  role: z.enum(["admin", "dentist", "staff"]).optional(),
  cro: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
  active: z.boolean().optional(),
});

// Documentos que a clínica emite pro paciente: atestado, laudo,
// declaração de comparecimento e receita. "content" é o texto corrido
// (atestado/laudo/presença); receita usa "items" em vez disso — por
// isso os dois são opcionais aqui e a regra de "pelo menos um dos dois
// de acordo com o tipo" é conferida à mão na rota da API, não aqui.
export const clinicDocumentSchema = z.object({
  patient: z.string().min(1, "Paciente obrigatório"),
  dentist: z.string().min(1, "Profissional responsável obrigatório"),
  type: z.enum(["atestado", "laudo", "presenca", "receita"]),
  content: z.string().optional(),
  daysOff: z.coerce.number().int().min(0).optional(),
  cid: z.string().optional(),
  visitDate: z.string().optional(),
  items: z
    .array(
      z.object({
        medication: z.string().min(1, "Medicamento obrigatório"),
        dosage: z.string().optional(),
        instructions: z.string().optional(),
      })
    )
    .optional(),
});
