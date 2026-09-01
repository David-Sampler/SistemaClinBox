// Página de LISTAGEM de pacientes, com busca por nome/CPF/telefone.
// É client component porque tem busca "ao vivo" (interação do usuário).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { PatientAvatar } from "@/components/patient-avatar";
import { WhatsAppLink } from "@/components/whatsapp-link";

type Patient = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // "debounce" simples: espera 300ms depois que o usuário para de digitar
    // antes de buscar, para não disparar uma requisição a cada tecla.
    const timeout = setTimeout(() => {
      loadPatients(search);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadPatients(q: string) {
    setLoading(true);
    const url = q ? `/api/patients?q=${encodeURIComponent(q)}` : "/api/patients";
    const res = await fetch(url);
    const data = await res.json();
    setPatients(data.patients ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Pacientes</h1>
          <p className="text-ink-muted">Cadastro e histórico dos pacientes da clínica</p>
        </div>
        <Link
          href="/pacientes/novo"
          className="btn-primary"
        >
          <Plus size={16} /> Novo paciente
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone..."
          className="w-full rounded-lg border border-line pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      <div className="bg-surface rounded-xl border border-line shadow-sm shadow-ink/[0.02] overflow-hidden">
        {loading ? (
          <PatientListSkeleton />
        ) : patients.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={28} className="mx-auto text-ink-faint mb-2" />
            <p className="text-sm text-ink-muted">
              {search ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
            </p>
            {!search && (
              <Link href="/pacientes/novo" className="text-sm text-blue hover:underline mt-1 inline-block">
                Cadastrar o primeiro
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {patients.map((p, i) => (
              <li key={p._id} className="fade-up" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <Link
                  href={`/pacientes/${p._id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-soft transition-colors"
                >
                  <PatientAvatar name={p.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{p.name}</p>
                    <p className="text-sm text-ink-muted">{p.phone}</p>
                  </div>
                  {p.cpf && <span className="text-sm text-ink-faint shrink-0">{p.cpf}</span>}
                  <WhatsAppLink phone={p.phone} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Esqueleto de carregamento: dá a sensação de que a lista já está
// "quase lá" em vez de uma tela em branco com um texto de aviso.
function PatientListSkeleton() {
  return (
    <ul className="divide-y divide-line-soft">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between px-5 py-3">
          <div className="space-y-2">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-3 w-28" />
          </div>
          <div className="skeleton h-3 w-24" />
        </li>
      ))}
    </ul>
  );
}
