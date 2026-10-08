// All sizes are CSS px: the caller has already applied setTransform(dpr, …).

const MARGIN = 24; // room outside the disc for the cardinal letters

const COLORS = {
  disc: '#111821',
  discEdge: '#30363d',
  ring: '#222c38',
  ringLabel: '#6e7a87',
  cardinal: '#9ba5b0',
  user: '#3d9bff',
  userEdge: '#e6edf3',
};

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";

export function scopeRadius(size: number): number {
  return size / 2 - MARGIN;
}

export function isCompact(size: number): boolean {
  return scopeRadius(size) < 220;
}

export function drawScope(
  ctx: CanvasRenderingContext2D,
  size: number,
  rangeKm: number,
  compact: boolean,
): void {
  const cx = size / 2;
  const cy = size / 2;
  const r = scopeRadius(size);

  ctx.clearRect(0, 0, size, size);

  // Disc
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.disc;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = COLORS.discEdge;
  ctx.stroke();

  // Range rings
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.ring;
  const rings = compact ? [0.4, 0.8] : [0.2, 0.4, 0.6, 0.8];
  for (const f of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crosshair (one path, two segments)
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  // Ring labels, just inside each labelled ring, right of the north line
  if (!compact) {
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = COLORS.ringLabel;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const f of [0.2, 0.6, 1]) {
      ctx.fillText(`${formatKm(rangeKm * f)} km`, cx + 6, cy - r * f + 12);
    }
  }

  // Cardinals, centred in the margin outside the disc
  ctx.font = `500 13px ${SANS}`;
  ctx.fillStyle = COLORS.cardinal;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const off = r + MARGIN / 2;
  ctx.fillText('N', cx, cy - off);
  if (!compact) {
    ctx.fillText('S', cx, cy + off);
    ctx.fillText('E', cx + off, cy);
    ctx.fillText('W', cx - off, cy);
  }
}

export function drawUser(ctx: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, 7, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.user;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.userEdge;
  ctx.stroke();
}

function formatKm(km: number): string {
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}