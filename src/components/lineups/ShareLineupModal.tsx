import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageDown, RefreshCw, Share2 } from 'lucide-react';
import type { Player } from '../../types';
import { Modal } from '../Modal';
import { Skeleton } from '../Skeleton';
import { toast } from '../Toast';
import { exportLineupImage, shareOrDownload, type ExportToken } from '../../lib/canvas-export';
import { formatDate } from '../../lib/helpers';

interface Token {
  x: number;
  y: number;
  player: Player;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tokens: Token[];
  defaultFecha?: string | null;
}

/** Genera el posteo del once titular (imagen) listo para WhatsApp. */
export function ShareLineupModal({ open, onClose, tokens, defaultFecha }: Props) {
  const [rival, setRival] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const exportTokens: ExportToken[] = tokens.map((t) => ({
        x: t.x,
        y: t.y,
        nombre: t.player.apodo || t.player.nombre.split(' ')[0],
        numero: t.player.numero,
        fotoUrl: t.player.foto_url,
        isDt: t.player.posicion === 'dt',
      }));
      const blob = await exportLineupImage({
        tokens: exportTokens,
        rival: rival.trim() || undefined,
        fecha: defaultFecha ? formatDate(defaultFecha) : undefined,
      });
      blobRef.current = blob;
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      console.error(err);
      toast('No se pudo generar la imagen.', 'error');
    } finally {
      setGenerating(false);
    }
  }, [tokens, rival, defaultFecha]);

  // Genera automáticamente al abrir.
  useEffect(() => {
    if (open) {
      void generate();
    } else {
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      blobRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleShare() {
    if (!blobRef.current) return;
    const res = await shareOrDownload(blobRef.current, `caos-once-${Date.now()}.png`);
    toast(res === 'shared' ? 'Once compartido' : 'Imagen descargada');
  }

  return (
    <Modal
      open={open}
      title="Estampa del once"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={generate} disabled={generating} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button onClick={handleShare} disabled={!previewUrl || generating} className="btn-primary">
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="estampa-rival">
            Rival (opcional)
          </label>
          <input
            id="estampa-rival"
            className="input"
            placeholder="ej: Deportivo Rival"
            value={rival}
            onChange={(e) => setRival(e.target.value)}
            onBlur={() => void generate()}
          />
        </div>

        {generating && !previewUrl ? (
          <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Vista previa del once titular"
            className={`w-full rounded-2xl shadow-lift ring-1 ring-black/5 transition-opacity ${
              generating ? 'opacity-50' : 'animate-fade-up'
            }`}
          />
        ) : null}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <ImageDown className="h-3.5 w-3.5" />
          En el celular se abre la hoja de compartir (WhatsApp); en compu se descarga el PNG.
        </p>
      </div>
    </Modal>
  );
}
