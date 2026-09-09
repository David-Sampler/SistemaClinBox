// Cabeçalho do papel timbrado + marca d'água, compartilhados por todas
// as páginas de impressão (atestado/receita/laudo e orçamento): logo
// da clínica se tiver sido cadastrada em Configurações, senão cai na
// marca padrão do ClinBox — assim nenhum documento sai "sem
// identidade" mesmo antes de a clínica configurar a própria logo.
export function ClinicLetterhead({ name, logoDataUri }: { name: string; logoDataUri: string | null }) {
  // Enquanto a clínica não configurou nada (nem logo, nem nome próprio —
  // "Minha Clínica" é o valor padrão do modelo, ninguém digita isso de
  // propósito), o papel mostra a marca do ClinBox, do jeito que sempre
  // mostrou — evita um documento saindo com o rótulo genérico "Minha
  // Clínica" só porque a tela de Configurações nunca foi aberta.
  const configured = !!logoDataUri || (name && name !== "Minha Clínica");
  const displayName = configured ? name : "ClinBox";

  return (
    <div className="flex flex-col items-center text-center gap-2 pb-5 mb-5 border-b border-line">
      {logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoDataUri} alt={displayName} className="h-16 w-auto max-w-[240px] object-contain" />
      ) : (
        <span
          className="w-14 h-14 rounded-xl text-white flex items-center justify-center font-display font-semibold text-xl shrink-0"
          style={{ background: "linear-gradient(155deg, #1f6fb0, #00203f)" }}
        >
          C
        </span>
      )}
      <div>
        <p className="font-display text-sm font-medium text-ink-muted leading-tight">{displayName}</p>
        {!configured && <p className="text-[11px] text-ink-faint">Clínica Odontológica</p>}
      </div>
    </div>
  );
}

// Marca d'água: a própria logo, bem grande e bem apagada, centralizada
// atrás do conteúdo do papel — só aparece quando a clínica cadastrou
// uma logo de verdade (sem logo, não tem o que repetir gigante e
// desbotado no fundo). Quem usa esse componente precisa envolver o
// conteúdo "de verdade" da página numa div com `relative z-10` logo ao
// lado dela, senão a marca d'água (position: absolute) fica por cima
// do texto em vez de atrás — ver src/app/documentos/[id]/imprimir/page.tsx.
export function ClinicWatermark({ logoDataUri }: { logoDataUri: string | null }) {
  if (!logoDataUri) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoDataUri}
      alt=""
      aria-hidden
      className="absolute inset-0 m-auto w-[75%] max-h-[80%] object-contain opacity-[0.07] grayscale pointer-events-none select-none"
    />
  );
}
