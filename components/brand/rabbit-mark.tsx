import * as React from "react"
import { cn } from "@/lib/utils"

type MarkProps = {
  /** Tamanho em px (número) ou qualquer unidade CSS. Abaixo de 24px o nariz some, e isso é esperado. */
  size?: number | string
  className?: string
  title?: string
  decorative?: boolean
}

/**
 * Símbolo da Rabbit (marca mãe). Cor via `currentColor`: use a tinta #131a17 no claro
 * e um tom claro no escuro (ex.: `text-foreground`). Cada instância tem seu próprio id de máscara.
 */
export function RabbitMark({ size = 24, className, title = "Rabbit", decorative }: MarkProps) {
  const id = `rabbit-mask-${React.useId().replace(/:/g, "")}`
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
          <circle cx="48" cy="62" r="28" fill="#fff" stroke="#000" strokeWidth="4" />
          <path d="M41.5 63.5 Q48 60.5 54.5 63.5 Q52 70 48 71.5 Q44 70 41.5 63.5 Z" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${id})`} fill="currentColor">
        <rect x="31" y="4" width="14" height="44" rx="7" transform="rotate(-14 38 44)" />
        <rect x="51" y="4" width="14" height="44" rx="7" transform="rotate(14 58 44)" />
        <circle cx="48" cy="62" r="28" />
      </g>
    </svg>
  )
}
