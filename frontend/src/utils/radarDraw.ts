// Canvas drawing for the radar scope (concept C "App-native").
// All sizes are CSS px: the caller has already applied setTransform(dpr, …).

import { PLANE_PATH } from "../libs/planeStyle";

const MARGIN = 24; // room outside the disc for the cardinal letters

const COLORS = {
  disc: '#111821',
  discEdge: '#30363d',
  ring: '#222c38',
  ringLabel: '#6e7a87',
  cardinal: '#9ba5b0',
  user: '#3d9bff',
  userEdge: '#e6edf3',
  planeLabel: '#7d8894',
  halo: 'rgba(251, 209, 0, 0.55)',
};

// Built once: PLANE_PATH is a nose-up glyph in a 24×24 box centred on (12, 12)
const PLANE_GLYPH = new Path2D(PLANE_PATH);
const GLYPH_BOX = 76;          // PLANE_PATH is drawn in a 76×76 box, centred on (38, 38)
const GLYPH_HEADING_DEG = 90;  // points east

/** Plane glyph and halo sizes in CSS px, smaller on the compact (phone) scope. */
export function planeSizes(compact: boolean): { glyphPx: number; haloPx: number } {
  return compact ? { glyphPx: 16, haloPx: 12 } : { glyphPx: 20, haloPx: 15 };
}

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";

/** Radius of the scope in CSS px for a canvas of the given size. */
export function scopeRadius(size: number): number {
  return size / 2 - MARGIN;
}

/** Small screens get fewer rings, fewer labels and only the N cardinal. */
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

/**
 * Draws one plane glyph centred on (x, y), nose rotated to `headingDeg`
 * (clockwise from north, like OpenSky's true_track).
 */
export function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  headingDeg: number | null,
  color: string,
  glyphPx: number,
): void {
  const scale = glyphPx / GLYPH_BOX;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((((headingDeg ?? 0) - GLYPH_HEADING_DEG) * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-GLYPH_BOX / 2, -GLYPH_BOX / 2); // rotate around the glyph's centre
  ctx.fillStyle = color;
  ctx.fill(PLANE_GLYPH);
  ctx.restore();
}

/** Callsign label to the lower right of the plane. Not rotated. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string = COLORS.planeLabel,
): void {
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 17, y + 4);
}

/** Yellow ring around the selected plane. Draw it before the glyph. */
export function drawHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.halo;
  ctx.stroke();
}

// 10 km ranges give 2 km steps; avoid labels like "6.000000001 km"
function formatKm(km: number): string {
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}