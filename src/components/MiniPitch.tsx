export interface MiniToken {
  x: number;
  y: number;
  label: string; // número o iniciales
  isDt?: boolean;
}

/** Cancha en miniatura, de solo lectura (dashboard / previews). */
export function MiniPitch({ tokens }: { tokens: MiniToken[] }) {
  return (
    <div
      className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-2xl ring-1 ring-black/10"
      style={{
        background:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 22px, transparent 22px, transparent 44px), linear-gradient(180deg, #46a357, #2e8442)',
      }}
    >
      <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-white/50" />
      <div className="pointer-events-none absolute left-1.5 right-1.5 top-1/2 h-px bg-white/50" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[27%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
      <div className="pointer-events-none absolute left-1/2 top-1.5 h-[12%] w-2/5 -translate-x-1/2 border border-t-0 border-white/50" />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-[12%] w-2/5 -translate-x-1/2 border border-b-0 border-white/50" />

      {tokens.map((t, i) => (
        <span
          key={i}
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
          className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-[10px] font-bold shadow-md ring-1 ${
            t.isDt
              ? 'bg-slate-900 text-amber-300 ring-amber-400/80'
              : 'bg-white text-celeste-700 ring-white'
          }`}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
