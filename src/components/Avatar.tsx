import { getInitials } from '../lib/helpers';

interface Props {
  nombre: string;
  apodo?: string | null;
  fotoUrl?: string | null;
  /** Diámetro en px. */
  size?: number;
  className?: string;
}

/** Muestra la foto del jugador o, si no hay, sus iniciales sobre fondo celeste. */
export function Avatar({ nombre, apodo, fotoUrl, size = 48, className = '' }: Props) {
  const initials = getInitials(nombre, apodo);
  const style = { width: size, height: size };

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nombre}
        style={style}
        className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      style={{ ...style, fontSize: size * 0.38 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-celeste-400 to-celeste-600 font-bold text-white ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
