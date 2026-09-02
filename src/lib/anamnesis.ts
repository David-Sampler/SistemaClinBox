// Itens do checklist de anamnese — condições que mudam a forma como o
// dentista conduz o atendimento (anestesia, sangramento, cicatrização).
// Cada um vira um campo boolean em medicalHistory (veja src/models/Patient.ts).
// Fica num arquivo à parte porque é usado tanto no formulário de anamnese
// (aba "Anamnese" do paciente) quanto no resumo exibido na ficha.
export const CONDITION_ITEMS: { key: string; label: string }[] = [
  { key: "isPregnant", label: "Gestante" },
  { key: "isSmoker", label: "Fumante" },
  { key: "hasDiabetes", label: "Diabetes" },
  { key: "hasHypertension", label: "Pressão alta (hipertensão)" },
  { key: "hasHeartCondition", label: "Cardiopatia" },
  { key: "hasBleedingDisorder", label: "Problema de coagulação/sangramento" },
  { key: "hadAnesthesiaReaction", label: "Já teve reação a anestésico" },
];

export type MedicalHistory = {
  allergies?: string;
  medications?: string;
  conditions?: string;
  notes?: string;
  isPregnant?: boolean;
  isSmoker?: boolean;
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasHeartCondition?: boolean;
  hasBleedingDisorder?: boolean;
  hadAnesthesiaReaction?: boolean;
};

// Usado pra decidir se mostra "Nenhuma anamnese feita" (nenhum campo de
// texto preenchido e nenhuma condição marcada) ou o resumo de verdade.
export function hasAnamnesisData(mh?: MedicalHistory | null): boolean {
  if (!mh) return false;
  if (mh.allergies || mh.medications || mh.conditions || mh.notes) return true;
  return CONDITION_ITEMS.some((c) => Boolean(mh[c.key as keyof MedicalHistory]));
}
