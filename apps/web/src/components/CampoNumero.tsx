"use client";

interface CampoNumeroProps {
  id: string;
  label: string;
  /** Sufixo curto: "kg", "cm", "%". */
  unidade: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Input numerico rotulado — o tijolo do WeightForm e do BodyCompositionForm.
 *
 * `inputMode="decimal"` e nao `type="number"`: no celular abre o teclado
 * numerico com virgula (que e como se digita peso em pt-BR) e nao traz as
 * setinhas de incremento, que ninguem usa pra digitar 82,5.
 */
export function CampoNumero({
  id,
  label,
  unidade,
  value,
  onChange,
  placeholder,
}: CampoNumeroProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block font-[family-name:var(--font-mono-face)] text-[10px] uppercase tracking-wider text-[var(--muted-2)]"
      >
        {label} ({unidade})
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--muted-2)]"
      />
    </div>
  );
}
