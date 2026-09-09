// Cabeçalho do papel timbrado, compartilhado por todas as páginas de
// impressão (atestado/receita/laudo e orçamento): logo da clínica se
// tiver sido cadastrada em Configurações, senão cai na marca padrão do
// ClinBox — assim nenhum documento sai "sem identidade" mesmo antes de
// a clínica configurar a própria logo.
export function ClinicLetterhead({ name, logoDataUri }: { name: string; logoDataUri: string | null }) {
  // Enquanto a clínica não configurou nada (nem logo, nem nome próprio —
  // "Minha Clínica" é o valor padrão do modelo, ninguém digita isso de
  // propósito), o papel mostra a marca do ClinBox, do jeito que sempre
  // mostrou — evita um documento saindo com o rótulo genérico "Minha
  // Clínica" só porque a tela de Configurações nunca foi aberta.
  const configured = !!logoDataUri || (name && name !== "Minha Clínica");
  const displayName = configured ? name : "ClinBox";

  return (
    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-line">
      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoDataUri} alt={displayName} className="w-11 h-11 object-contain shrink-0" />
      ) : (
        <span
          className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-display font-semibold text-lg shrink-0"
          style={{ background: "linear-gradient(155deg, #1f6fb0, #00203f)" }}
        >
          C
        </span>
      )}
      <div>
        <p className="font-display text-xl font-semibold leading-tight">{displayName}</p>
        {!configured && <p className="text-xs text-ink-muted">Clínica Odontológica</p>}
      </div>
    </div>
  );
}
