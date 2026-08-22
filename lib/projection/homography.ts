import type { CornerPins, Point } from "./types";

// Solves 8x8 linear system for homography (DLT). Returns 3x3 matrix row-major.
function solveHomography(src: CornerPins, dst: CornerPins): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Gaussian elimination 8x8
  const n = 8;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    }
    if (Math.abs(A[pivot][col]) < 1e-10) continue;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];

    const div = A[col][col];
    for (let j = col; j < n; j++) A[col][j] /= div;
    b[col] /= div;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      for (let j = col; j < n; j++) A[row][j] -= factor * A[col][j];
      b[row] -= factor * b[col];
    }
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = b;
  return [h0, h1, h2, h3, h4, h5, h6, h7, 1];
}

function multiply3x3(a: number[], b: number[]): number[] {
  const r = new Array(9).fill(0);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      for (let k = 0; k < 3; k++) r[row * 3 + col] += a[row * 3 + k] * b[k * 3 + col];
  return r;
}

// Convert homography to CSS matrix3d (column-major for CSS)
export function homographyToCSSMatrix(src: CornerPins, dst: CornerPins): string {
  const H = solveHomography(src, dst);
  // CSS matrix3d is column-major, need transpose-ish mapping
  // H is:
  // [h0 h1 h2]
  // [h3 h4 h5]
  // [h6 h7 h8]
  // For CSS 4x4, embed as:
  const m = [
    H[0], H[3], 0, H[6],
    H[1], H[4], 0, H[7],
    0,    0,    1, 0,
    H[2], H[5], 0, H[8],
  ];
  return `matrix3d(${m.join(",")})`;
}

// Warp a canvas via subdivision + homography on 2D context (no WebGL needed)
// Splits source rect into grid and draws textured quads with perspective-correct interpolation via manual transform
export function warpCanvas(
  srcCanvas: HTMLCanvasElement,
  dstCanvas: HTMLCanvasElement,
  dstPins: CornerPins
): void {
  const ctx = dstCanvas.getContext("2d");
  if (!ctx) return;

  const w = dstCanvas.width;
  const h = dstCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;

  // Convert normalized pins to pixel coords on dst
  const dstPx: CornerPins = [
    { x: dstPins[0].x * w, y: dstPins[0].y * h },
    { x: dstPins[1].x * w, y: dstPins[1].y * h },
    { x: dstPins[2].x * w, y: dstPins[2].y * h },
    { x: dstPins[3].x * w, y: dstPins[3].y * h },
  ];

  // Subdivide into GRID x GRID quads for approximate perspective warp using 2D context
  const GRID = 20;
  const cellW = srcW / GRID;
  const cellH = srcH / GRID;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const u0 = gx / GRID;
      const v0 = gy / GRID;
      const u1 = (gx + 1) / GRID;
      const v1 = (gy + 1) / GRID;

      // Bilinear interpolate dest quad for this cell
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const bilerp = (p: Point, q: Point, r: Point, s: Point, u: number, v: number): Point => {
        const top = { x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) };
        const bot = { x: lerp(s.x, r.x, u), y: lerp(s.y, r.y, u) };
        return { x: lerp(top.x, bot.x, v), y: lerp(top.y, bot.y, v) };
      };

      const tl = bilerp(dstPx[0], dstPx[1], dstPx[2], dstPx[3], u0, v0);
      const tr = bilerp(dstPx[0], dstPx[1], dstPx[2], dstPx[3], u1, v0);
      const br = bilerp(dstPx[0], dstPx[1], dstPx[2], dstPx[3], u1, v1);
      const bl = bilerp(dstPx[0], dstPx[1], dstPx[2], dstPx[3], u0, v1);

      // Draw this cell as a clipped quad
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.clip();

      // Approximate affine fit for this small cell (bilinear -> affine is close when GRID large)
      // Compute dest bounding box and drawImage stretched to it
      const minX = Math.min(tl.x, tr.x, br.x, bl.x);
      const minY = Math.min(tl.y, tr.y, br.y, bl.y);
      const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
      const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
      const dw = maxX - minX;
      const dh = maxY - minY;

      if (dw > 0.5 && dh > 0.5) {
        ctx.drawImage(
          srcCanvas,
          gx * cellW, gy * cellH, cellW, cellH,
          minX, minY, dw, dh
        );
      }
      ctx.restore();
    }
  }
}

// For CSS path: compute transform + origin that maps unit square to pins
export function getWarpStyle(pins: CornerPins, width: number, height: number): React.CSSProperties {
  const src: CornerPins = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const dst: CornerPins = [
    { x: pins[0].x * width, y: pins[0].y * height },
    { x: pins[1].x * width, y: pins[1].y * height },
    { x: pins[2].x * width, y: pins[2].y * height },
    { x: pins[3].x * width, y: pins[3].y * height },
  ];

  // Normalize to 0..1 for homography
  const srcN: CornerPins = src.map(p => ({ x: p.x / width, y: p.y / height })) as CornerPins;
  const dstN: CornerPins = dst.map(p => ({ x: p.x / width, y: p.y / height })) as CornerPins;

  return {
    transform: homographyToCSSMatrix(srcN, dstN),
    transformOrigin: "0 0",
  };
}
