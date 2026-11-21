/**
 * AlphaHome — Motor Biomecánico 3D → 2D Ortográfico (SVG 100% offline)
 *
 * Sistema de coordenadas (en centímetros anatómicos reales, altura ~175 cm):
 *   +X = Izquierda de la persona (en vista Frontal, +X va a la derecha de la pantalla)
 *   +Y = Arriba (suelo en Y = 0)
 *   +Z = Frente de la persona (hacia donde mira cuando está de pie)
 *
 * Todas las articulaciones se resuelven mediante cinemática inversa 3D exacta
 * garantizando longitudes óseas constantes en todas las fases y proyecciones.
 */

export const BONES = {
  HEAD_R: 9.8,
  NECK: 15.5,
  SHOULDER_HALF: 18.5,
  HIP_HALF: 10.5,
  TORSO: 48,
  UPPER_ARM: 30,
  FOREARM: 27,
  THIGH: 42,
  SHIN: 41,
  ANKLE_H: 7,
  FOOT_FWD: 18,
  FOOT_BACK: 5,
  BENCH_H: 44,
  BENCH_W: 28
};

// ---------------------------------------------------------------------------
// Álgebra vectorial 3D
// ---------------------------------------------------------------------------
export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});
export const len = (a) => Math.hypot(a.x, a.y, a.z);
export const norm = (a) => {
  const l = len(a);
  return l > 1e-6 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 1, z: 0 };
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t
});
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const deg = (d) => (d * Math.PI) / 180;

/**
 * Cinemática inversa exacta de 2 huesos en 3D.
 * A: origen (hombro/cadera), B: objetivo deseado (mano/tobillo),
 * L1/L2: longitudes fijas, pole: vector dirección preferida del codo/rodilla.
 * Devuelve { j: articulación, e: extremo clampeado con longitud exacta }.
 */
export function solveIK3D(A, B, L1, L2, pole) {
  const ab = sub(B, A);
  const rawDist = len(ab);
  const minDist = Math.abs(L1 - L2) + 0.5;
  const maxDist = L1 + L2 - 0.15;
  const d = clamp(rawDist, minDist, maxDist);

  const u = rawDist > 1e-5 ? mul(ab, 1 / rawDist) : norm(pole);
  const e = add(A, mul(u, d));

  const xAlong = (L1 * L1 + d * d - L2 * L2) / (2 * d);
  const hSq = Math.max(0, L1 * L1 - xAlong * xAlong);
  const h = Math.sqrt(hSq);

  // Proyectar el vector polo al plano perpendicular a u
  let pOrth = sub(pole, mul(u, dot(pole, u)));
  if (len(pOrth) < 1e-4) {
    // Fallback ortogonal seguro si pole es colineal con u
    const fallback = Math.abs(u.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
    pOrth = cross(u, fallback);
  }
  const v = norm(pOrth);

  const j = add(add(A, mul(u, xAlong)), mul(v, h));
  return { j, e, rawDist, clamped: rawDist > maxDist || rawDist < minDist };
}

/**
 * Crea un marco ortonormal de torso dados pelvis, centro de hombros y dirección "frente" deseada.
 * Permite colocar hombro izq/der, cadera izq/der y cabeza con anatomía 100% consistente.
 */
export function buildTorsoFrame(pelvis, shoulderMid, frontHint = v3(0, 0, 1), shoulderHalf = BONES.SHOULDER_HALF, hipHalf = BONES.HIP_HALF) {
  const up = norm(sub(shoulderMid, pelvis));
  // Asegurar que la longitud del torso sea exacta
  const shMid = add(pelvis, mul(up, BONES.TORSO));
  // Proyectar frontHint perpendicular a up
  let fwd = sub(frontHint, mul(up, dot(frontHint, up)));
  if (len(fwd) < 1e-4) fwd = v3(0, 0, 1);
  fwd = norm(fwd);
  // Eje +X (izquierda de la persona): up × fwd en nuestro sistema (+X izq, +Y arriba, +Z frente -> Y × Z = +X)
  const left = norm(cross(up, fwd));
  fwd = norm(cross(left, up));

  const lSh = add(shMid, mul(left, shoulderHalf));
  const rSh = add(shMid, mul(left, -shoulderHalf));
  const lHip = add(pelvis, mul(left, hipHalf));
  const rHip = add(pelvis, mul(left, -hipHalf));
  const head = add(shMid, add(mul(up, BONES.NECK), mul(fwd, 1.5)));

  return { pelvis, shMid, up, fwd, left, lSh, rSh, lHip, rHip, head };
}

// ---------------------------------------------------------------------------
// Proyección Ortográfica a 4 Cámaras
// ---------------------------------------------------------------------------
const STAGE_W = 340;
const STAGE_H = 230;

function getCameraDir(camType) {
  switch (camType) {
    case 'side': return v3(1, 0, 0);
    case 'front': return v3(0, 0, 1);
    case 'back': return v3(0, 0, -1);
    case 'top': return v3(0, 1, 0);
    default: return v3(1, 0, 0);
  }
}

export function projectPoint(pt, cam) {
  const { type, cx, cy, scale, target, topMode = 'faceUp' } = cam;
  const dx = pt.x - target.x;
  const dy = pt.y - target.y;
  const dz = pt.z - target.z;

  if (type === 'side') {
    return { x: cx + dz * scale, y: cy - dy * scale, d: pt.x };
  }
  if (type === 'front') {
    return { x: cx + dx * scale, y: cy - dy * scale, d: pt.z };
  }
  if (type === 'back') {
    return { x: cx - dx * scale, y: cy - dy * scale, d: -pt.z };
  }
  // top
  if (topMode === 'headTop') {
    return { x: cx + dx * scale, y: cy + dz * scale, d: pt.y };
  }
  return { x: cx + dx * scale, y: cy - dz * scale, d: pt.y };
}

// ---------------------------------------------------------------------------
// Constructores de Escena 3D (banco, barra, mancuerna, banda, cuña, cuerpo)
// ---------------------------------------------------------------------------
function shadeForDepth(baseHex, isFarSide, camType) {
  if (camType !== 'side' || !isFarSide) return baseHex;
  const map = {
    '#f1f5f9': '#64748b',
    '#e2e8f0': '#64748b',
    '#cbd5e1': '#475569',
    '#94a3b8': '#475569'
  };
  return map[baseHex] || baseHex;
}

function addBox3D(items, p1, p2, widthX, thicknessY, cam, fill, stroke) {
  // Representa un tablón (asiento o respaldo) entre p1 y p2 en el plano YZ con ancho widthX en X
  const halfW = widthX / 2;
  const dir = norm(sub(p2, p1));
  const normal = norm(cross(v3(1, 0, 0), dir));
  const halfT = thicknessY / 2;

  if (cam.type === 'side') {
    const c1 = add(p1, mul(normal, halfT));
    const c2 = add(p2, mul(normal, halfT));
    const c3 = add(p2, mul(normal, -halfT));
    const c4 = add(p1, mul(normal, -halfT));
    const pts = [c1, c2, c3, c4].map((p) => projectPoint(p, cam));
    items.push({
      d: -halfW - 2, // En lateral, el banco se ordena ligeramente detrás del brazo cercano pero delante del lejano si aplica
      svg: `<polygon points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/>`
    });
  } else {
    // Vista frontal, posterior o superior: proyectar la cara superior del tablón
    const corners = [
      add(v3(-halfW, 0, 0), p1),
      add(v3(halfW, 0, 0), p1),
      add(v3(halfW, 0, 0), p2),
      add(v3(-halfW, 0, 0), p2)
    ];
    const proj = corners.map((p) => projectPoint(p, cam));
    const avgD = proj.reduce((s, p) => s + p.d, 0) / 4 - 2;
    items.push({
      d: avgD,
      svg: `<polygon points="${proj.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/>`
    });
  }
}

function renderBench(items, bench, cam) {
  if (!bench) return;
  const fill = '#162033';
  const stroke = '#475569';
  const legColor = '#334155';
  const w = bench.width || BONES.BENCH_W;
  const h = bench.height || BONES.BENCH_H;

  if (bench.kind === 'flat') {
    const z0 = bench.z0 ?? -58;
    const z1 = bench.z1 ?? 52;
    const padY = h - 3;
    // Patas
    const legZs = [z0 + 14, z1 - 14];
    const legXs = cam.type === 'side' ? [0] : [-w * 0.38, w * 0.38];
    for (const lz of legZs) {
      for (const lx of legXs) {
        const a = projectPoint(v3(lx, padY - 3, lz), cam);
        const b = projectPoint(v3(lx, 0, lz), cam);
        items.push({
          d: Math.min(a.d, b.d) - 6,
          svg: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${legColor}" stroke-width="4" stroke-linecap="round"/>`
        });
      }
    }
    addBox3D(items, v3(0, padY, z0), v3(0, padY, z1), w, 7, cam, fill, stroke);
  } else if (bench.kind === 'adjustable') {
    const pivotZ = bench.pivotZ ?? -4;
    const seatLen = bench.seatLen ?? 38;
    const backLen = bench.backLen ?? 72;
    const angle = deg(bench.backAngleDeg ?? 30); // ángulo sobre la horizontal hacia atrás (-Z) o adelante (+Z)
    const dirSign = bench.backDir ?? -1; // -1 = respaldo hacia -Z (press inclinado/militar/curl); +1 = hacia +Z (remo pecho apoyado)
    const padY = h - 3;

    const pivot = v3(0, padY, pivotZ);
    const seatEnd = v3(0, padY, pivotZ - dirSign * seatLen);
    const backEnd = v3(0, padY + Math.sin(angle) * backLen, pivotZ + dirSign * Math.cos(angle) * backLen);

    // Patas soporte delantero y trasero
    const legPoints = [
      [v3(0, padY - 2, seatEnd.z + dirSign * 6), v3(0, 0, seatEnd.z + dirSign * 4)],
      [v3(0, padY - 2, pivotZ), v3(0, 0, pivotZ)],
      [lerp3(pivot, backEnd, 0.55), v3(0, 0, lerp(pivot.z, backEnd.z, 0.55))]
    ];
    for (const [topP, botP] of legPoints) {
      const xs = cam.type === 'side' ? [0] : [-w * 0.36, w * 0.36];
      for (const lx of xs) {
        const a = projectPoint(v3(lx, topP.y, topP.z), cam);
        const b = projectPoint(v3(lx, botP.y, botP.z), cam);
        items.push({
          d: Math.min(a.d, b.d) - 8,
          svg: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${legColor}" stroke-width="3.6" stroke-linecap="round"/>`
        });
      }
    }
    addBox3D(items, pivot, seatEnd, w, 7, cam, fill, stroke);
    addBox3D(items, pivot, backEnd, w, 7, cam, fill, stroke);
  } else if (bench.kind === 'block') {
    // Banco transversal (para Sentadilla Búlgara o Hip Thrust, orientado a lo largo de X)
    const zCenter = bench.z ?? -50;
    const depthZ = bench.depthZ ?? 32;
    const widthX = bench.widthX ?? 88;
    const padY = h - 3;
    const x0 = -widthX / 2;
    const x1 = widthX / 2;
    const z0 = zCenter - depthZ / 2;
    const z1 = zCenter + depthZ / 2;

    if (cam.type === 'side') {
      const pTopL = projectPoint(v3(0, h, z0), cam);
      const pTopR = projectPoint(v3(0, h, z1), cam);
      const pBotL = projectPoint(v3(0, h - 8, z0), cam);
      const pFloorL = projectPoint(v3(0, 0, z0 + 5), cam);
      const pFloorR = projectPoint(v3(0, 0, z1 - 5), cam);
      items.push({
        d: -24,
        svg: `
          <line x1="${(pTopL.x + 5).toFixed(1)}" y1="${pBotL.y.toFixed(1)}" x2="${pFloorL.x.toFixed(1)}" y2="${pFloorL.y.toFixed(1)}" stroke="${legColor}" stroke-width="4" stroke-linecap="round"/>
          <line x1="${(pTopR.x - 5).toFixed(1)}" y1="${pBotL.y.toFixed(1)}" x2="${pFloorR.x.toFixed(1)}" y2="${pFloorR.y.toFixed(1)}" stroke="${legColor}" stroke-width="4" stroke-linecap="round"/>
          <rect x="${Math.min(pTopL.x, pTopR.x).toFixed(1)}" y="${pTopL.y.toFixed(1)}" width="${Math.abs(pTopR.x - pTopL.x).toFixed(1)}" height="${Math.abs(pBotL.y - pTopL.y).toFixed(1)}" rx="3.5" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        `
      });
    } else if (cam.type === 'top') {
      const a = projectPoint(v3(x0, padY, z0), cam);
      const b = projectPoint(v3(x1, padY, z1), cam);
      items.push({
        d: padY - 5,
        svg: `<rect x="${Math.min(a.x, b.x).toFixed(1)}" y="${Math.min(a.y, b.y).toFixed(1)}" width="${Math.abs(b.x - a.x).toFixed(1)}" height="${Math.abs(b.y - a.y).toFixed(1)}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`
      });
    } else {
      // Frontal / Posterior
      const pL = projectPoint(v3(x0, h, zCenter), cam);
      const pR = projectPoint(v3(x1, h, zCenter), cam);
      const pBot = projectPoint(v3(x0, h - 8, zCenter), cam);
      const pFlL = projectPoint(v3(x0 + 10, 0, zCenter), cam);
      const pFlR = projectPoint(v3(x1 - 10, 0, zCenter), cam);
      const d = projectPoint(v3(0, h, zCenter), cam).d;
      items.push({
        d: d - 1,
        svg: `
          <line x1="${pFlL.x.toFixed(1)}" y1="${pBot.y.toFixed(1)}" x2="${pFlL.x.toFixed(1)}" y2="${pFlL.y.toFixed(1)}" stroke="${legColor}" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="${pFlR.x.toFixed(1)}" y1="${pBot.y.toFixed(1)}" x2="${pFlR.x.toFixed(1)}" y2="${pFlR.y.toFixed(1)}" stroke="${legColor}" stroke-width="3.5" stroke-linecap="round"/>
          <rect x="${Math.min(pL.x, pR.x).toFixed(1)}" y="${pL.y.toFixed(1)}" width="${Math.abs(pR.x - pL.x).toFixed(1)}" height="${Math.abs(pBot.y - pL.y).toFixed(1)}" rx="3.5" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
        `
      });
    }
  } else if (bench.kind === 'decline') {
    // Banco declinado (-18° hacia la cabeza en -Z) con rodillos de sujeción de rodillas/tobillos en +Z
    const pivotZ = bench.pivotZ ?? 14;
    const backLen = bench.backLen ?? 76;
    const angle = deg(bench.backAngleDeg ?? 18);
    const padY = h - 3;

    const highEnd = v3(0, padY, pivotZ + 12);
    const lowEnd = v3(0, padY - Math.sin(angle) * backLen, pivotZ - Math.cos(angle) * backLen);

    // Patas soporte trasero (bajo) y delantero (alto) + barra de rodillos
    const legPairs = [
      [lerp3(highEnd, lowEnd, 0.85), v3(0, 0, lerp(highEnd.z, lowEnd.z, 0.85))],
      [v3(0, padY - 2, pivotZ + 6), v3(0, 0, pivotZ + 10)]
    ];
    const xs = cam.type === 'side' ? [0] : [-w * 0.36, w * 0.36];
    for (const [topP, botP] of legPairs) {
      for (const lx of xs) {
        const a = projectPoint(v3(lx, topP.y, topP.z), cam);
        const b = projectPoint(v3(lx, botP.y, botP.z), cam);
        items.push({
          d: Math.min(a.d, b.d) - 8,
          svg: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${legColor}" stroke-width="3.8" stroke-linecap="round"/>`
        });
      }
    }

    // Colchón declinado
    addBox3D(items, highEnd, lowEnd, w, 7, cam, fill, stroke);

    // Rodillos acolchados de sujeción de tobillos/rodillas en el extremo alto (+Z)
    const kneeRoller = v3(0, padY - 1, pivotZ + 16);
    const ankleRoller = v3(0, padY - 24, pivotZ + 26);
    if (cam.type === 'side') {
      const pk = projectPoint(kneeRoller, cam);
      const pa = projectPoint(ankleRoller, cam);
      items.push({
        d: 26,
        svg: `
          <line x1="${pk.x.toFixed(1)}" y1="${pk.y.toFixed(1)}" x2="${pa.x.toFixed(1)}" y2="${pa.y.toFixed(1)}" stroke="${legColor}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="${pk.x.toFixed(1)}" cy="${pk.y.toFixed(1)}" r="4.2" fill="#334155" stroke="#64748b" stroke-width="1.3"/>
          <circle cx="${pa.x.toFixed(1)}" cy="${pa.y.toFixed(1)}" r="4.6" fill="#334155" stroke="#64748b" stroke-width="1.3"/>
        `
      });
    } else {
      for (const rPt of [kneeRoller, ankleRoller]) {
        const rL = projectPoint(v3(-w * 0.65, rPt.y, rPt.z), cam);
        const rR = projectPoint(v3(w * 0.65, rPt.y, rPt.z), cam);
        items.push({
          d: (rL.d + rR.d) / 2 + 2,
          svg: `<line x1="${rL.x.toFixed(1)}" y1="${rL.y.toFixed(1)}" x2="${rR.x.toFixed(1)}" y2="${rR.y.toFixed(1)}" stroke="#475569" stroke-width="6" stroke-linecap="round"/>`
        });
      }
    }
  }
}

function renderBar(items, bar, cam, accent = '#38bdf8') {
  if (!bar) return;
  const y = bar.y ?? 215;
  const z = bar.z ?? 0;
  const halfW = bar.halfW ?? 72;
  const pL = projectPoint(v3(-halfW, y, z), cam);
  const pR = projectPoint(v3(halfW, y, z), cam);
  const midD = projectPoint(v3(0, y, z), cam).d;

  if (cam.type === 'side') {
    items.push({
      d: midD + 40, // Barra visible claramente en perfil como disco metálico
      svg: `<circle cx="${pL.x.toFixed(1)}" cy="${pL.y.toFixed(1)}" r="4.8" fill="${accent}" stroke="#070b14" stroke-width="1.5"/>`
    });
  } else {
    // Postes laterales sutiles + barra principal
    const fL = projectPoint(v3(-halfW, 0, z), cam);
    const fR = projectPoint(v3(halfW, 0, z), cam);
    if (bar.showPosts !== false && cam.type !== 'top') {
      items.push({
        d: midD - 5,
        svg: `
          <line x1="${pL.x.toFixed(1)}" y1="${pL.y.toFixed(1)}" x2="${fL.x.toFixed(1)}" y2="${fL.y.toFixed(1)}" stroke="#1e293b" stroke-width="3.5"/>
          <line x1="${pR.x.toFixed(1)}" y1="${pR.y.toFixed(1)}" x2="${fR.x.toFixed(1)}" y2="${fR.y.toFixed(1)}" stroke="#1e293b" stroke-width="3.5"/>
        `
      });
    }
    items.push({
      d: midD + 2,
      svg: `<line x1="${pL.x.toFixed(1)}" y1="${pL.y.toFixed(1)}" x2="${pR.x.toFixed(1)}" y2="${pR.y.toFixed(1)}" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>`
    });
  }
}

function renderWedge(items, wedge, cam, accent = '#38bdf8') {
  if (!wedge) return;
  const zHeel = wedge.zHeel ?? -6;
  const zToe = wedge.zToe ?? 10;
  const h = wedge.h ?? 5.5;
  const halfW = wedge.halfW ?? 26;

  if (cam.type === 'side') {
    const a = projectPoint(v3(0, 0, zHeel - 3), cam);
    const b = projectPoint(v3(0, 0, zToe), cam);
    const c = projectPoint(v3(0, h, zHeel - 3), cam);
    items.push({
      d: -20,
      svg: `<polygon points="${a.x.toFixed(1)},${a.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}" fill="${accent}" opacity="0.85"/>`
    });
  } else if (cam.type === 'front' || cam.type === 'back') {
    const a = projectPoint(v3(-halfW, h, zHeel), cam);
    const b = projectPoint(v3(halfW, 0, zHeel), cam);
    items.push({
      d: projectPoint(v3(0, 0, zHeel), cam).d - 2,
      svg: `<rect x="${Math.min(a.x, b.x).toFixed(1)}" y="${Math.min(a.y, b.y).toFixed(1)}" width="${Math.abs(b.x - a.x).toFixed(1)}" height="${Math.max(3, Math.abs(b.y - a.y)).toFixed(1)}" rx="2" fill="${accent}" opacity="0.75"/>`
    });
  }
}

function renderDumbbell3D(items, db, cam) {
  // db: { pos: vec3, axis: vec3 (dirección del mango), halfLen?: 10, plateR?: 6.5 }
  const axis = norm(db.axis || v3(1, 0, 0));
  const halfLen = db.halfLen ?? 10.5;
  const plateR = (db.plateR ?? 6.2) * cam.scale;

  const p1 = add(db.pos, mul(axis, -halfLen));
  const p2 = add(db.pos, mul(axis, halfLen));
  const s1 = projectPoint(p1, cam);
  const s2 = projectPoint(p2, cam);
  const sc = projectPoint(db.pos, cam);

  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const projLen = Math.hypot(dx, dy);

  const plateColor = '#38bdf8';
  const shaftColor = '#94a3b8';

  if (projLen < 4.5) {
    // Mancuerna vista de frente (eje apuntando hacia cámara): dibujar disco redondo limpio
    items.push({
      d: sc.d + 2.5,
      svg: `
        <circle cx="${sc.x.toFixed(1)}" cy="${sc.y.toFixed(1)}" r="${Math.max(4.5, plateR).toFixed(1)}" fill="${plateColor}" stroke="#070b14" stroke-width="1.3"/>
        <circle cx="${sc.x.toFixed(1)}" cy="${sc.y.toFixed(1)}" r="${Math.max(1.8, plateR * 0.35).toFixed(1)}" fill="#0f172a"/>
      `
    });
    return;
  }

  // Vector perpendicular al eje proyectado para dibujar los discos
  const nx = -dy / projLen;
  const ny = dx / projLen;
  const pHalf = Math.max(4.8, plateR);
  const pThick = Math.max(3.6, plateR * 0.65);

  const plateSvg = (pt) => {
    const ux = dx / projLen;
    const uy = dy / projLen;
    const c1x = pt.x - ux * (pThick * 0.5) - nx * pHalf;
    const c1y = pt.y - uy * (pThick * 0.5) - ny * pHalf;
    const c2x = pt.x + ux * (pThick * 0.5) - nx * pHalf;
    const c2y = pt.y + uy * (pThick * 0.5) - ny * pHalf;
    const c3x = pt.x + ux * (pThick * 0.5) + nx * pHalf;
    const c3y = pt.y + uy * (pThick * 0.5) + ny * pHalf;
    const c4x = pt.x - ux * (pThick * 0.5) + nx * pHalf;
    const c4y = pt.y - uy * (pThick * 0.5) + ny * pHalf;
    return `<polygon points="${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${c3x.toFixed(1)},${c3y.toFixed(1)} ${c4x.toFixed(1)},${c4y.toFixed(1)}" fill="${plateColor}" stroke="#070b14" stroke-width="1" stroke-linejoin="round"/>`;
  };

  items.push({
    d: sc.d + 2.5,
    svg: `
      <line x1="${s1.x.toFixed(1)}" y1="${s1.y.toFixed(1)}" x2="${s2.x.toFixed(1)}" y2="${s2.y.toFixed(1)}" stroke="${shaftColor}" stroke-width="3.2" stroke-linecap="round"/>
      ${plateSvg(s1)}
      ${plateSvg(s2)}
    `
  });
}

function renderBand3D(items, band, cam, accent = '#38bdf8') {
  // band: { points: vec3[], anchor?: vec3, color?: '#f59e0b' }
  const pts = band.points || [];
  const color = band.color || '#f59e0b';

  if (band.anchor) {
    const pa = projectPoint(band.anchor, cam);
    items.push({
      d: pa.d + 3,
      svg: `<circle cx="${pa.x.toFixed(1)}" cy="${pa.y.toFixed(1)}" r="4.5" fill="${accent}" stroke="#070b14" stroke-width="1.4"/>`
    });
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const a = projectPoint(pts[i], cam);
    const b = projectPoint(pts[i + 1], cam);
    items.push({
      d: (a.d + b.d) / 2 + (band.depthBias ?? 0),
      svg: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/>`
    });
  }
}

function addLimb(items, a3, b3, thicknessPx, color, cam, farFlag = false, depthBias = 0) {
  const a = projectPoint(a3, cam);
  const b = projectPoint(b3, cam);
  const c = shadeForDepth(color, farFlag, cam.type);
  items.push({
    d: (a.d + b.d) / 2 + depthBias,
    svg: `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${c}" stroke-width="${thicknessPx.toFixed(1)}" stroke-linecap="round"/>`
  });
}

function addFoot(items, ankle, toe, heel, cam, color, farFlag = false) {
  const pa = projectPoint(ankle, cam);
  const pt = projectPoint(toe, cam);
  const ph = projectPoint(heel, cam);
  const c = shadeForDepth(color, farFlag, cam.type);
  const d = (pa.d + pt.d + ph.d) / 3;
  items.push({
    d,
    svg: `<polygon points="${pa.x.toFixed(1)},${pa.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)} ${ph.x.toFixed(1)},${ph.y.toFixed(1)}" fill="${c}" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/>`
  });
}

function addJointDot(items, p3, r, color, cam, depthBias = 1.5) {
  const p = projectPoint(p3, cam);
  items.push({
    d: p.d + depthBias,
    svg: `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" stroke="#070b14" stroke-width="1.3"/>`
  });
}

function renderTorsoAndHead(items, torso, cam) {
  const { pelvis, shMid, lSh, rSh, lHip, rHip, head, fwd } = torso;
  const camDir = getCameraDir(cam.type);
  const facingDot = dot(fwd, camDir); // >0 mirando hacia cámara, <0 de espaldas

  const pLSh = projectPoint(lSh, cam);
  const pRSh = projectPoint(rSh, cam);
  const pLHip = projectPoint(lHip, cam);
  const pRHip = projectPoint(rHip, cam);
  const pPelv = projectPoint(pelvis, cam);
  const pShMid = projectPoint(shMid, cam);

  const shoulderSpan = Math.hypot(pLSh.x - pRSh.x, pLSh.y - pRSh.y);
  const torsoLen2D = Math.hypot(pShMid.x - pPelv.x, pShMid.y - pPelv.y);
  const torsoFill = facingDot < -0.25 ? '#94a3b8' : '#e2e8f0';
  const torsoDepth = (pPelv.d + pShMid.d) / 2;

  if (shoulderSpan > 10 && torsoLen2D > 8) {
    // Polígono anatómico trapezoidal (hombros anchos, cintura estilizada)
    items.push({
      d: torsoDepth,
      svg: `<polygon points="${pLSh.x.toFixed(1)},${pLSh.y.toFixed(1)} ${pRSh.x.toFixed(1)},${pRSh.y.toFixed(1)} ${pRHip.x.toFixed(1)},${pRHip.y.toFixed(1)} ${pLHip.x.toFixed(1)},${pLHip.y.toFixed(1)}" fill="${torsoFill}" stroke="${torsoFill}" stroke-width="6.5" stroke-linejoin="round"/>`
    });
    // Línea sutil de columna en vista posterior
    if (facingDot < -0.35) {
      items.push({
        d: torsoDepth + 0.5,
        svg: `<line x1="${pShMid.x.toFixed(1)}" y1="${pShMid.y.toFixed(1)}" x2="${pPelv.x.toFixed(1)}" y2="${pPelv.y.toFixed(1)}" stroke="#64748b" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.7"/>`
      });
    }
  } else if (shoulderSpan > 10 && torsoLen2D <= 8) {
    // Vista superior de persona erguida: óvalo de hombros
    const rx = Math.max(12, shoulderSpan * 0.58);
    const ry = Math.max(8, 11 * cam.scale);
    items.push({
      d: torsoDepth,
      svg: `<ellipse cx="${pShMid.x.toFixed(1)}" cy="${pShMid.y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${torsoFill}" stroke="#cbd5e1" stroke-width="1.2"/>`
    });
  } else {
    // Vista lateral: cápsula robusta del torso
    items.push({
      d: torsoDepth,
      svg: `<line x1="${pPelv.x.toFixed(1)}" y1="${pPelv.y.toFixed(1)}" x2="${pShMid.x.toFixed(1)}" y2="${pShMid.y.toFixed(1)}" stroke="${torsoFill}" stroke-width="${(14 * cam.scale).toFixed(1)}" stroke-linecap="round"/>`
    });
  }

  // Cabeza + indicador de orientación facial (nariz/visor)
  const pHead = projectPoint(head, cam);
  const headR = Math.max(7.5, BONES.HEAD_R * cam.scale);
  const headFill = facingDot < -0.25 ? '#94a3b8' : '#cbd5e1';
  items.push({
    d: pHead.d + 0.4,
    svg: `<circle cx="${pHead.x.toFixed(1)}" cy="${pHead.y.toFixed(1)}" r="${headR.toFixed(1)}" fill="${headFill}" stroke="#070b14" stroke-width="1.4"/>`
  });

  // Indicador de dirección hacia donde mira la cabeza (muy útil en Lateral y Superior)
  const nose3D = add(head, mul(fwd, BONES.HEAD_R * 0.88));
  const pNose = projectPoint(nose3D, cam);
  const noseOffset = Math.hypot(pNose.x - pHead.x, pNose.y - pHead.y);
  if (facingDot > -0.2 && noseOffset > 2.5) {
    items.push({
      d: pHead.d + 0.8,
      svg: `<circle cx="${pNose.x.toFixed(1)}" cy="${pNose.y.toFixed(1)}" r="2.1" fill="#0f172a" opacity="0.65"/>`
    });
  }
}

// ---------------------------------------------------------------------------
// Auto-encuadre estable (se calcula una vez muestreando toda la repetición)
// ---------------------------------------------------------------------------
function computeCamera(poseFn, viewType, options = {}) {
  const topMode = options.topMode || 'faceUp';
  const padX = 36;
  const padTop = 26;
  const padBot = options.hasCallout ? 32 : 20;

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  const probeCam = { type: viewType, cx: 0, cy: 0, scale: 1, target: v3(0, 0, 0), topMode };

  const includePt = (pt) => {
    if (!pt) return;
    const p = projectPoint(pt, probeCam);
    if (p.x < minU) minU = p.x;
    if (p.x > maxU) maxU = p.x;
    if (p.y < minV) minV = p.y;
    if (p.y > maxV) maxV = p.y;
  };

  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const s = poseFn(t);
    const pts = [
      s.torso.head, s.torso.lSh, s.torso.rSh, s.torso.lHip, s.torso.rHip,
      s.lArm?.elbow, s.lArm?.hand, s.rArm?.elbow, s.rArm?.hand,
      s.lLeg?.knee, s.lLeg?.ankle, s.lLeg?.toe, s.lLeg?.heel,
      s.rLeg?.knee, s.rLeg?.ankle, s.rLeg?.toe, s.rLeg?.heel
    ];
    pts.forEach(includePt);
    if (s.dumbbells) s.dumbbells.forEach((db) => {
      includePt(add(db.pos, v3(12, 12, 12)));
      includePt(sub(db.pos, v3(12, 12, 12)));
    });
    if (s.bands) s.bands.forEach((b) => {
      if (b.anchor) includePt(b.anchor);
      (b.points || []).forEach(includePt);
    });
    if (s.bar) {
      includePt(v3(-(s.bar.halfW ?? 70), s.bar.y ?? 215, s.bar.z ?? 0));
      includePt(v3(s.bar.halfW ?? 70, s.bar.y ?? 215, s.bar.z ?? 0));
    }
    if (s.bench) {
      if (s.bench.kind === 'flat') {
        includePt(v3(0, 0, s.bench.z0 ?? -58));
        includePt(v3(0, s.bench.height ?? 44, s.bench.z1 ?? 52));
      } else if (s.bench.kind === 'block') {
        includePt(v3(-(s.bench.widthX ?? 88) / 2, 0, (s.bench.z ?? -50) - 18));
        includePt(v3((s.bench.widthX ?? 88) / 2, s.bench.height ?? 44, (s.bench.z ?? -50) + 18));
      } else if (s.bench.kind === 'adjustable') {
        includePt(v3(0, 0, (s.bench.pivotZ ?? 0) - 65));
        includePt(v3(0, 0, (s.bench.pivotZ ?? 0) + 55));
      } else if (s.bench.kind === 'decline') {
        includePt(v3(0, 0, (s.bench.pivotZ ?? 14) - 76));
        includePt(v3(0, s.bench.height ?? 54, (s.bench.pivotZ ?? 14) + 32));
      }
    }
    if (s.floorY !== null && s.floorY !== undefined && viewType !== 'top') {
      includePt(v3(0, s.floorY, 0));
    }
  }

  // Margen por radios de cabeza/extremidades
  minU -= 14; maxU += 14;
  minV -= 14; maxV += 12;

  const spanU = Math.max(60, maxU - minU);
  const spanV = Math.max(60, maxV - minV);
  const availW = STAGE_W - padX * 2;
  const availH = STAGE_H - padTop - padBot;
  const scale = Math.min(availW / spanU, availH / spanV, 1.38);

  const midU = (minU + maxU) / 2;
  const midV = (minV + maxV) / 2;

  // Mapear midU, midV al centro del área disponible
  const centerX = STAGE_W / 2;
  const centerY = padTop + availH / 2;

  // Como probeCam usó target=(0,0,0), cx = centerX - midU*scale, cy = centerY - midV*scale
  return {
    type: viewType,
    cx: centerX - midU * scale,
    cy: centerY - midV * scale,
    scale,
    target: v3(0, 0, 0),
    topMode
  };
}

const cameraCache = new WeakMap();

function getCachedCamera(exerciseDef, viewType, hasCallout) {
  let byKey = cameraCache.get(exerciseDef);
  if (!byKey) {
    byKey = new Map();
    cameraCache.set(exerciseDef, byKey);
  }
  const key = `${viewType}|${hasCallout ? 1 : 0}`;
  if (!byKey.has(key)) {
    byKey.set(key, computeCamera(exerciseDef.pose, viewType, {
      topMode: exerciseDef.topMode || 'faceUp',
      hasCallout
    }));
  }
  return byKey.get(key);
}

// ---------------------------------------------------------------------------
// Renderizador principal de escena 3D → SVG
// ---------------------------------------------------------------------------
export function renderScene3D(exerciseDef, viewIndex, p, showGuides = true, accentColor = '#38bdf8') {
  const viewSpec = exerciseDef.views[viewIndex] || exerciseDef.views[0];
  const viewType = viewSpec.cam; // 'side' | 'front' | 'back' | 'top'
  const calloutText = showGuides ? (viewSpec.cue || exerciseDef.cue || '') : '';

  const cam = getCachedCamera(exerciseDef, viewType, Boolean(calloutText));
  const scene = exerciseDef.pose(p);
  const items = [];

  // 1. Suelo sutil (en vistas laterales/frontales/posteriores)
  let bgSvg = `
    <defs>
      <radialGradient id="ah-muscle-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.58"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ah-stage-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a1020"/>
        <stop offset="100%" stop-color="#060a14"/>
      </linearGradient>
    </defs>
    <rect width="${STAGE_W}" height="${STAGE_H}" fill="url(#ah-stage-bg)"/>
  `;

  if (scene.floorY !== null && scene.floorY !== undefined && viewType !== 'top') {
    const fl = projectPoint(v3(0, scene.floorY, 0), cam);
    if (fl.y > 20 && fl.y < STAGE_H - 6) {
      bgSvg += `<line x1="20" y1="${fl.y.toFixed(1)}" x2="${STAGE_W - 20}" y2="${fl.y.toFixed(1)}" stroke="#24324a" stroke-width="1.8" stroke-linecap="round"/>`;
    }
  } else if (viewType === 'top') {
    const origin = projectPoint(v3(0, 0, 0), cam);
    bgSvg += `<line x1="36" y1="${origin.y.toFixed(1)}" x2="${STAGE_W - 36}" y2="${origin.y.toFixed(1)}" stroke="#172236" stroke-width="1" stroke-dasharray="4 4"/>`;
    bgSvg += `<line x1="${origin.x.toFixed(1)}" y1="24" x2="${origin.x.toFixed(1)}" y2="${STAGE_H - 28}" stroke="#172236" stroke-width="1" stroke-dasharray="4 4"/>`;
  }

  // 2. Guías de trayectoria real muestreadas en 3D
  if (showGuides && exerciseDef.trackPaths) {
    for (const track of exerciseDef.trackPaths) {
      const pts2d = [];
      for (let i = 0; i <= 14; i++) {
        const s = exerciseDef.pose(i / 14);
        const pt3 = track(s);
        if (pt3) pts2d.push(projectPoint(pt3, cam));
      }
      if (pts2d.length >= 2) {
        const dPath = pts2d.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
        bgSvg += `<path d="${dPath}" fill="none" stroke="${accentColor}" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.62"/>`;
      }
    }
  }

  // 3. Equipamiento
  renderBench(items, scene.bench, cam);
  renderBar(items, scene.bar, cam, accentColor);
  renderWedge(items, scene.wedge, cam, accentColor);

  // 4. Resaltados musculares 3D
  if (scene.glows) {
    for (const gl of scene.glows) {
      const gp = projectPoint(gl.pos, cam);
      const r = (gl.r ?? 18) * cam.scale;
      items.push({
        d: gp.d + (gl.depthBias ?? 0.3),
        svg: `<circle cx="${gp.x.toFixed(1)}" cy="${gp.y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#ah-muscle-glow)"/>`
      });
    }
  }

  // 5. Torso y cabeza
  renderTorsoAndHead(items, scene.torso, cam);

  // 6. Piernas (Izquierda = +X = cercana en side; Derecha = -X = lejana en side)
  const drawLeg = (leg, hip, isFar) => {
    if (!leg) return;
    addLimb(items, hip, leg.knee, 9.2 * cam.scale, '#cbd5e1', cam, isFar);
    addLimb(items, leg.knee, leg.ankle, 7.8 * cam.scale, '#94a3b8', cam, isFar);
    if (leg.toe && leg.heel) {
      addFoot(items, leg.ankle, leg.toe, leg.heel, cam, '#e2e8f0', isFar);
    }
    if (showGuides && !isFar) {
      addJointDot(items, leg.knee, 3.2, '#10b981', cam);
    }
  };
  drawLeg(scene.lLeg, scene.torso.lHip, false);
  drawLeg(scene.rLeg, scene.torso.rHip, true);

  // 7. Brazos (Izquierdo = +X = cercano en side; Derecho = -X = lejano en side)
  const drawArm = (arm, sh, isFar) => {
    if (!arm) return;
    addLimb(items, sh, arm.elbow, 7.4 * cam.scale, '#cbd5e1', cam, isFar);
    addLimb(items, arm.elbow, arm.hand, 6.4 * cam.scale, '#f1f5f9', cam, isFar);
    if (showGuides && !isFar) {
      addJointDot(items, arm.elbow, 3.0, '#10b981', cam);
    }
  };
  drawArm(scene.lArm, scene.lArmOrigin || scene.torso.lSh, false);
  drawArm(scene.rArm, scene.rArmOrigin || scene.torso.rSh, true);

  // 8. Bandas y Mancuernas (ordenados en profundidad Z real!)
  if (scene.bands) scene.bands.forEach((b) => renderBand3D(items, b, cam, accentColor));
  if (scene.dumbbells) scene.dumbbells.forEach((db) => renderDumbbell3D(items, db, cam));

  // 9. Painter's Algorithm: ordenar de menor profundidad (lejos) a mayor profundidad (cerca)
  items.sort((a, b) => a.d - b.d);

  // 10. Etiqueta técnica inferior limpia (nunca se superpone sobre el personaje)
  let overlaySvg = '';
  if (calloutText) {
    overlaySvg = `
      <rect x="14" y="${STAGE_H - 25}" width="${STAGE_W - 28}" height="19" rx="9.5" fill="#0f172a" fill-opacity="0.88" stroke="#1e293b" stroke-width="1"/>
      <text x="${STAGE_W / 2}" y="${STAGE_H - 12.5}" text-anchor="middle" fill="#cbd5e1" font-size="9.5" font-weight="700" font-family="Inter, system-ui, sans-serif">${calloutText}</text>
    `;
  }

  return bgSvg + items.map((it) => it.svg).join('') + overlaySvg;
}
