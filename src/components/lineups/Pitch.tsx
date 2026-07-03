import type { ReactNode, Ref } from 'react';

interface Props {
  children: ReactNode;
  fieldRef?: Ref<HTMLDivElement>;
}

/** Cancha vista desde arriba: césped con franjas y líneas reglamentarias. */
export function Pitch({ children, fieldRef }: Props) {
  return (
    <div
      ref={fieldRef}
      className="relative aspect-[2/3] w-full select-none overflow-hidden rounded-[1.5rem] shadow-lift ring-1 ring-black/10"
      style={{
        background:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 40px, transparent 40px, transparent 80px), linear-gradient(180deg, #46a357, #37914a 55%, #2e8442)',
      }}
    >
      {/* Perímetro */}
      <div className="pointer-events-none absolute inset-2.5 rounded-xl border-[1.5px] border-white/55" />
      {/* Mitad de cancha */}
      <div className="pointer-events-none absolute left-2.5 right-2.5 top-1/2 h-px -translate-y-1/2 bg-white/55" />
      {/* Círculo central (22% de alto ≈ círculo con aspect 2/3) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22%] w-[33%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white/55" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      {/* Área rival (arriba) */}
      <div className="pointer-events-none absolute left-1/2 top-2.5 h-[14%] w-2/5 -translate-x-1/2 border-[1.5px] border-t-0 border-white/55" />
      <div className="pointer-events-none absolute left-1/2 top-2.5 h-[6%] w-1/5 -translate-x-1/2 border-[1.5px] border-t-0 border-white/55" />
      {/* Área propia (abajo) */}
      <div className="pointer-events-none absolute bottom-2.5 left-1/2 h-[14%] w-2/5 -translate-x-1/2 border-[1.5px] border-b-0 border-white/55" />
      <div className="pointer-events-none absolute bottom-2.5 left-1/2 h-[6%] w-1/5 -translate-x-1/2 border-[1.5px] border-b-0 border-white/55" />

      {children}
    </div>
  );
}
