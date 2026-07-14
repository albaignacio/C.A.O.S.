import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Player } from '../../types';
import { Pitch } from './Pitch';
import { PlayerToken } from './PlayerToken';

export interface PresentationToken {
  x: number;
  y: number;
  player: Player;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tokens: PresentationToken[];
  formacionLabel: string;
  rival: string;
  onRivalChange: (v: string) => void;
  fecha: string | null;
  notas: string;
  onNotasChange: (v: string) => void;
}

/**
 * Vista a pantalla completa para proyectar en una TV antes del partido
 * (charla de vestuario): once titular en grande + consignas del DT.
 */
export function PresentationMode({
  open,
  onClose,
  tokens,
  formacionLabel,
  rival,
  onRivalChange,
  fecha,
  notas,
  onNotasChange,
}: Props) {
  useEffect(() => {
    if (!open) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', onFs);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.body.style.overflow = '';
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] animate-fade-in overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-celeste-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-10 lg:py-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Escudo C.A.O.S" className="h-12 w-12 object-contain lg:h-16 lg:w-16" />
          <div>
            <p className="font-display text-2xl font-bold tracking-tight lg:text-4xl">C.A.O.S</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-celeste-300 lg:text-xs">
              Once titular · {formacionLabel}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
          aria-label="Salir del modo presentación"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-12 lg:flex-row lg:items-start lg:gap-12 lg:px-10">
        {/* Cancha grande */}
        <div className="mx-auto w-full max-w-md animate-fade-up lg:max-w-none lg:flex-1">
          <div className="lg:mx-auto lg:aspect-[2/3] lg:h-[calc(100vh-190px)] lg:w-auto">
            <Pitch>
              {tokens.map((t, i) => (
                <div
                  key={i}
                  style={{ left: `${t.x}%`, top: `${t.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <PlayerToken player={t.player} isDt={t.player.posicion === 'dt'} />
                </div>
              ))}
            </Pitch>
          </div>
        </div>

        {/* Panel de la charla */}
        <div className="flex w-full flex-col gap-6 animate-fade-up lg:max-w-md" style={{ animationDelay: '120ms' }}>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-celeste-300">
              Rival
            </p>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-white/50 lg:text-5xl">vs</span>
              <input
                value={rival}
                onChange={(e) => onRivalChange(e.target.value)}
                placeholder="Escribí el rival…"
                className="w-full border-b-2 border-white/20 bg-transparent font-display text-3xl font-bold uppercase tracking-tight text-white placeholder:text-white/25 focus:border-celeste-400 focus:outline-none lg:text-5xl"
              />
            </div>
            {fecha && <p className="mt-2 text-sm text-white/50 lg:text-base">{fecha}</p>}
          </div>

          <div className="flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-celeste-300">
              Consignas del DT
            </p>
            <textarea
              value={notas}
              onChange={(e) => onNotasChange(e.target.value)}
              placeholder={'· Presión alta los primeros 15′\n· Salida por las bandas\n· ¡Ganar los duelos!'}
              rows={8}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-5 text-xl font-medium leading-relaxed text-white placeholder:text-white/25 focus:border-celeste-400/60 focus:outline-none focus:ring-2 focus:ring-celeste-400/20 lg:text-2xl"
            />
          </div>

          <p className="text-center text-xs text-white/30">
            Tocá el rival o las consignas para editarlas · ESC para salir
          </p>
        </div>
      </div>
    </div>
  );
}
