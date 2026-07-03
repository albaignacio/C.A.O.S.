import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

type Kind = 'success' | 'error';
interface ToastMsg {
  id: number;
  text: string;
  kind: Kind;
}

type Listener = (t: ToastMsg) => void;
let listeners: Listener[] = [];
let nextId = 1;

/** Dispara un toast de feedback desde cualquier parte de la app. */
export function toast(text: string, kind: Kind = 'success') {
  const t: ToastMsg = { id: nextId++, text, kind };
  listeners.forEach((l) => l(t));
}

/** Contenedor de toasts. Se monta una sola vez en el Layout. */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const add: Listener = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 2600);
    };
    listeners.push(add);
    return () => {
      listeners = listeners.filter((l) => l !== add);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex animate-fade-up items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-pop ${
            t.kind === 'success' ? 'bg-slate-900/95' : 'bg-red-600/95'
          }`}
        >
          {t.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
}
