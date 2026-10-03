import { cn } from "@/lib/utils"
import { PitMark } from "./pit-mark"

/**
 * Logo do Pit Finance: símbolo + nome em Geist 600, tracking −0,04em.
 * O símbolo tem a altura da linha mais 20% (linha de 1em => símbolo de 1.2em), então o tamanho
 * todo escala com o `font-size` do contexto (ex.: `className="text-[15px]"`).
 * `iconOnly` mostra só o símbolo (menu lateral recolhido).
 */
export function PitLogo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.45em] font-semibold leading-none tracking-[-0.04em]", className)}>
      <PitMark size="1.2em" decorative={!iconOnly} className="text-[#00854c] dark:text-[#38c789]" />
      {!iconOnly && <span>Pit Finance</span>}
    </span>
  )
}
