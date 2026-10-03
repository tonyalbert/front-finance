import * as React from "react"
import { cn } from "@/lib/utils"

type MarkProps = {
  /** Tamanho em px (número) ou qualquer unidade CSS (ex.: "1.2em"). Mínimo recomendado: 16px. */
  size?: number | string
  className?: string
  /** Título acessível. Ignorado quando `decorative`. */
  title?: string
  /** Use quando o nome da marca já aparece ao lado (ex.: no PitLogo). */
  decorative?: boolean
}

/**
 * Símbolo do Pit Finance: orelhas da Rabbit sobre uma carteira.
 * A cor vem de `currentColor`; o tom certo para cada fundo é `text-[#00854c]` no claro e
 * `text-[#38c789]` no escuro (veja BRAND.md). Cada instância tem seu próprio id de máscara.
 */
export function PitMark({ size = 24, className, title = "Pit Finance", decorative }: MarkProps) {
  const id = `pit-mask-${React.useId().replace(/:/g, "")}`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={cn("shrink-0", className)}
    >
      {!decorative && <title>{title}</title>}
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">
          <rect width="96" height="96" fill="#fff" />
          <rect x="10" y="40" width="76" height="50" rx="13" fill="#fff" stroke="#000" strokeWidth="4" />
          <rect x="56" y="56" width="32" height="18" rx="9" fill="#000" />
          <circle cx="66" cy="65" r="3.6" fill="#fff" />
        </mask>
      </defs>
      <g mask={`url(#${id})`} fill="currentColor">
        <rect x="29" y="6" width="14" height="42" rx="7" transform="rotate(-14 36 46)" />
        <rect x="49" y="6" width="14" height="42" rx="7" transform="rotate(14 56 46)" />
        <rect x="10" y="40" width="76" height="50" rx="13" />
      </g>
    </svg>
  )
}
