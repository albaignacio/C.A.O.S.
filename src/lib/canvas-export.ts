import type { BoardStroke } from '../types';

/**
 * Exportación de imágenes 100% en el cliente, dibujando sobre <canvas>.
 * Sin dependencias externas (no hace falta html2canvas).
 */

export interface ExportToken {
  x: number; // % horizontal sobre la cancha
  y: number; // % vertical sobre la cancha
  nombre: string;
  numero: number | null;
  fotoUrl: string | null;
  isDt?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('700 60px "Space Grotesk"'),
      document.fonts.load('600 30px Inter'),
    ]);
    await document.fonts.ready;
  } catch {
    /* si falla, se usa la fuente del sistema */
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Cancha
// ---------------------------------------------------------------------------

/** Dibuja la cancha (vista desde arriba) dentro del rectángulo dado. */
export function drawPitch(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
) {
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.clip();

  // Césped con degradé
  const grad = ctx.createLinearGradient(0, py, 0, py + ph);
  grad.addColorStop(0, '#46a357');
  grad.addColorStop(0.55, '#37914a');
  grad.addColorStop(1, '#2e8442');
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, pw, ph);

  // Franjas horizontales
  const bands = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < bands; i += 2) {
    ctx.fillRect(px, py + (ph / bands) * i, pw, ph / bands);
  }

  // Líneas
  const m = Math.round(pw * 0.03); // margen interior
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(2, pw * 0.004);

  roundRect(ctx, px + m, py + m, pw - m * 2, ph - m * 2, 14);
  ctx.stroke();

  // Mitad de cancha
  ctx.beginPath();
  ctx.moveTo(px + m, py + ph / 2);
  ctx.lineTo(px + pw - m, py + ph / 2);
  ctx.stroke();

  // Círculo central
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, pw * 0.165, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();

  // Áreas (arriba y abajo)
  const bigW = pw * 0.4;
  const bigH = ph * 0.14;
  const smallW = pw * 0.2;
  const smallH = ph * 0.06;
  for (const top of [true, false]) {
    const yEdge = top ? py + m : py + ph - m;
    const dir = top ? 1 : -1;
    ctx.strokeRect(px + pw / 2 - bigW / 2, top ? yEdge : yEdge - bigH * dir, bigW, bigH * dir);
    ctx.strokeRect(
      px + pw / 2 - smallW / 2,
      top ? yEdge : yEdge - smallH * dir,
      smallW,
      smallH * dir,
    );
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Fichas de jugador
// ---------------------------------------------------------------------------

async function drawTokens(
  ctx: CanvasRenderingContext2D,
  tokens: ExportToken[],
  px: number,
  py: number,
  pw: number,
  ph: number,
  radius: number,
) {
  // Precarga de fotos (en paralelo; si falla alguna, iniciales)
  const photos = await Promise.all(
    tokens.map((t) => (t.fotoUrl ? loadImage(t.fotoUrl) : Promise.resolve(null))),
  );

  tokens.forEach((t, i) => {
    const cx = px + (t.x / 100) * pw;
    const cy = py + (t.y / 100) * ph;
    const photo = photos[i];

    // Sombra + círculo
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = radius * 0.5;
    ctx.shadowOffsetY = radius * 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = t.isDt ? '#0f172a' : '#ffffff';
    ctx.fill();
    ctx.restore();

    // Contenido del círculo
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
      ctx.clip();
      // cover: recorte cuadrado centrado de la foto
      const side = Math.min(photo.width, photo.height);
      ctx.drawImage(
        photo,
        (photo.width - side) / 2,
        (photo.height - side) / 2,
        side,
        side,
        cx - radius + 3,
        cy - radius + 3,
        (radius - 3) * 2,
        (radius - 3) * 2,
      );
      ctx.restore();
    } else {
      ctx.fillStyle = t.isDt ? '#fbbf24' : '#2775b0';
      ctx.font = `700 ${Math.round(radius * 0.9)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = t.isDt && t.numero == null ? 'DT' : String(t.numero ?? initials(t.nombre));
      ctx.fillText(label, cx, cy + radius * 0.05);
    }

    // Aro
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = t.isDt ? '#fbbf24' : '#ffffff';
    ctx.stroke();

    // Nombre (píldora)
    const name = t.nombre;
    ctx.font = `600 ${Math.round(radius * 0.52)}px Inter, sans-serif`;
    const tw = ctx.measureText(name).width;
    const pillW = tw + radius * 0.9;
    const pillH = radius * 0.85;
    const pillY = cy + radius + 6;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    roundRect(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, cx, pillY + pillH / 2 + 1);
  });
}

// ---------------------------------------------------------------------------
// Trazos de la pizarra
// ---------------------------------------------------------------------------

function strokePath(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  toX: (v: number) => number,
  toY: (v: number) => number,
) {
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].x), toY(pts[0].y));
  if (pts.length < 3) {
    ctx.lineTo(toX(pts[pts.length - 1].x), toY(pts[pts.length - 1].y));
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(toX(pts[i].x), toY(pts[i].y), toX(mx), toY(my));
  }
  ctx.lineTo(toX(pts[pts.length - 1].x), toY(pts[pts.length - 1].y));
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: BoardStroke[],
  px: number,
  py: number,
  pw: number,
  ph: number,
) {
  const toX = (v: number) => px + (v / 100) * pw;
  const toY = (v: number) => py + (v / 100) * ph;
  const base = pw * 0.008;

  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color;

    if (s.kind === 'press') {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = base * 3.2;
    } else {
      ctx.lineWidth = base;
      if (s.kind === 'pass') ctx.setLineDash([base * 2.4, base * 2]);
    }

    strokePath(ctx, s.points, toX, toY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Punta de flecha (movimiento y pase)
    if (s.kind !== 'press') {
      const a = s.points[Math.max(0, s.points.length - 3)];
      const b = s.points[s.points.length - 1];
      const ang = Math.atan2(toY(b.y) - toY(a.y), toX(b.x) - toX(a.x));
      const size = base * 4;
      ctx.beginPath();
      ctx.moveTo(toX(b.x), toY(b.y));
      ctx.lineTo(
        toX(b.x) - size * Math.cos(ang - Math.PI / 6),
        toY(b.y) - size * Math.sin(ang - Math.PI / 6),
      );
      ctx.lineTo(
        toX(b.x) - size * Math.cos(ang + Math.PI / 6),
        toY(b.y) - size * Math.sin(ang + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Estampa del once (posteo para compartir)
// ---------------------------------------------------------------------------

export async function exportLineupImage(opts: {
  tokens: ExportToken[];
  rival?: string;
  fecha?: string;
}): Promise<Blob> {
  await ensureFonts();
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Fondo blanco con leve degradé celeste arriba
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, 320);
  bg.addColorStop(0, 'rgba(74,168,224,0.14)');
  bg.addColorStop(1, 'rgba(74,168,224,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, 320);

  // Header: escudo + nombre
  const logo = await loadImage('/logo.png');
  if (logo) ctx.drawImage(logo, 64, 48, 120, 120);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 76px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('C.A.O.S', 208, 118);
  ctx.fillStyle = '#2f8fce';
  ctx.font = '700 30px "Space Grotesk", sans-serif';
  ctx.save();
  // tracking manual para el subtítulo
  let sx = 210;
  for (const ch of 'ONCE TITULAR') {
    ctx.fillText(ch, sx, 162);
    sx += ctx.measureText(ch).width + 9;
  }
  ctx.restore();

  // Rival y fecha (derecha)
  ctx.textAlign = 'right';
  if (opts.rival) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 44px "Space Grotesk", sans-serif';
    ctx.fillText(`vs ${opts.rival}`, W - 64, 108);
  }
  if (opts.fecha) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillText(opts.fecha, W - 64, 152);
  }

  // Cancha
  const pw = 760;
  const ph = 1040;
  const px = (W - pw) / 2;
  const py = 216;
  ctx.save();
  ctx.shadowColor = 'rgba(16,24,40,0.25)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.fillStyle = '#37914a';
  ctx.fill();
  ctx.restore();
  drawPitch(ctx, px, py, pw, ph);
  await drawTokens(ctx, opts.tokens, px, py, pw, ph, 40);

  // Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 26px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚽ Vamos C.A.O.S', W / 2, H - 42);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png');
  });
}

// ---------------------------------------------------------------------------
// Exportar pizarra táctica
// ---------------------------------------------------------------------------

export async function exportBoardImage(opts: {
  tokens: ExportToken[];
  strokes: BoardStroke[];
  nombre?: string;
}): Promise<Blob> {
  await ensureFonts();
  const W = 1080;
  const H = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Header compacto
  const logo = await loadImage('/logo.png');
  if (logo) ctx.drawImage(logo, 48, 32, 72, 72);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 44px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('C.A.O.S · Pizarra', 140, 80);
  if (opts.nombre) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 28px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(opts.nombre, W - 48, 78);
  }

  const px = 48;
  const py = 136;
  const pw = W - 96;
  const ph = H - py - 48;
  drawPitch(ctx, px, py, pw, ph);
  drawStrokes(ctx, opts.strokes, px, py, pw, ph);
  await drawTokens(ctx, opts.tokens, px, py, pw, ph, 34);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png');
  });
}

// ---------------------------------------------------------------------------
// Compartir / descargar
// ---------------------------------------------------------------------------

export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  // En celular abre la hoja de compartir (WhatsApp, etc.)
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch {
      /* usuario canceló: cae a descarga */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
