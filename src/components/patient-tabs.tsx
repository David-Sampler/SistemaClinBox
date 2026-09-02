// Controla a troca entre as abas "Odontograma", "Anamnese", "Prontuário",
// "Documentos", "Financeiro" e "Dados" dentro da página de detalhe do paciente.
// A aba atual fica na URL (?tab=...) — assim um botão de atalho (ex: "Editar
// dados" no topo da ficha) pode linkar direto pra aba certa, e o F5 não
// perde o lugar onde a pessoa estava.
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OdontogramChart } from "@/components/odontogram-chart";
import { ClinicalRecords } from "@/components/clinical-records";
import { PatientDocuments } from "@/components/patient-documents";
import { PatientFinance } from "@/components/patient-finance";
import { PatientEditForm, type EditablePatient } from "@/components/patient-edit-form";
import { AnamnesisForm } from "@/components/anamnesis-form";
import { ClinicDocuments } from "@/components/clinic-documents";

type Tab = "odontograma" | "anamnese" | "prontuario" | "documentos" | "emitir" | "financeiro" | "dados";
const TAB_IDS: Tab[] = ["odontograma", "anamnese", "prontuario", "documentos", "emitir", "financeiro", "dados"];

export function PatientTabs({
  patientId,
  dentists,
  patient,
}: {
  patientId: string;
  dentists: { id: string; name: string }[];
  patient: EditablePatient;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_IDS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "odontograma";
  const [tab, setTab] = useState<Tab>(initialTab);

  // O clique num link "Editar dados" (fora deste componente) navega pra
  // cá com ?tab=dados na URL, mas o componente já está montado (mesma
  // página) — sem isso, o estado interno "tab" ficava travado no valor
  // que existia quando o componente apareceu na tela pela primeira vez.
  useEffect(() => {
    if (TAB_IDS.includes(requestedTab as Tab) && requestedTab !== tab) {
      setTab(requestedTab as Tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "odontograma", label: "Odontograma" },
    { id: "anamnese", label: "Anamnese" },
    { id: "prontuario", label: "Prontuário" },
    { id: "documentos", label: "Documentos" },
    { id: "emitir", label: "Atestados e receitas" },
    { id: "financeiro", label: "Financeiro" },
    { id: "dados", label: "Dados" },
  ];

  function selectTab(id: Tab) {
    setTab(id);
    router.replace(`/pacientes/${patientId}?tab=${id}`, { scroll: false });
  }

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02]">
      <div className="print:hidden flex border-b border-line px-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-blue text-blue-strong"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "odontograma" && <OdontogramChart patientId={patientId} />}
        {tab === "anamnese" && <AnamnesisForm patientId={patientId} medicalHistory={patient.medicalHistory} />}
        {tab === "prontuario" && <ClinicalRecords patientId={patientId} dentists={dentists} />}
        {tab === "documentos" && <PatientDocuments patientId={patientId} />}
        {tab === "emitir" && <ClinicDocuments patientId={patientId} patientName={patient.name} dentists={dentists} />}
        {tab === "financeiro" && <PatientFinance patientId={patientId} dentists={dentists} />}
        {tab === "dados" && <PatientEditForm patient={patient} />}
      </div>
    </div>
  );
}
