/**
 * AlphaHome — Biblioteca de Poses 3D Biomecánicas (28 arquetipos)
 *
 * Cada ejercicio define una función pose(p) (p ∈ [0, 1]) en coordenadas 3D reales (cm),
 * resuelta mediante solveIK3D para garantizar longitudes óseas constantes y coherencia
 * total entre las 3 proyecciones ortográficas (Lateral, Frontal, Posterior, Superior).
 */

import {
  BONES, v3, add, sub, mul, norm, cross, lerp, lerp3, deg,
  solveIK3D, buildTorsoFrame
} from './rig3d.js';

// ---------------------------------------------------------------------------
// Helpers anatómicos reutilizables
// ---------------------------------------------------------------------------
function makeFloorFoot(ankle, yawDeg = 0, heelLift = 0) {
  const yaw = deg(yawDeg);
  const fz = Math.cos(yaw);
  const fx = Math.sin(yaw);
  return {
    ankle,
    heel: v3(ankle.x - fx * BONES.FOOT_BACK, heelLift, ankle.z - fz * BONES.FOOT_BACK),
    toe: v3(ankle.x + fx * BONES.FOOT_FWD, 0, ankle.z + fz * BONES.FOOT_FWD)
  };
}

function makeHangingFoot(ankle) {
  return {
    ankle,
    heel: v3(ankle.x, ankle.y - 4, ankle.z - 5),
    toe: v3(ankle.x, ankle.y - 11, ankle.z + 12)
  };
}

function solveLeg(hip, ankle, pole, footOpts = {}) {
  const ik = solveIK3D(hip, ankle, BONES.THIGH, BONES.SHIN, pole);
  const foot = footOpts.customFoot
    ? footOpts.customFoot(ik.e)
    : makeFloorFoot(ik.e, footOpts.yawDeg || 0, footOpts.heelLift || 0);
  return { knee: ik.j, ankle: ik.e, toe: foot.toe, heel: foot.heel };
}

function solveArm(sh, handTarget, pole) {
  const ik = solveIK3D(sh, handTarget, BONES.UPPER_ARM, BONES.FOREARM, pole);
  return { elbow: ik.j, hand: ik.e };
}

function seatedLegs(torso, footZ = 48, stanceX = 13) {
  const lLeg = solveLeg(torso.lHip, v3(stanceX, BONES.ANKLE_H, footZ), v3(0.08, 0.2, 1));
  const rLeg = solveLeg(torso.rHip, v3(-stanceX, BONES.ANKLE_H, footZ), v3(-0.08, 0.2, 1));
  return { lLeg, rLeg };
}

function standingLegs(torso, stanceX = 12, lFootZ = 0, rFootZ = 0) {
  const lLeg = solveLeg(torso.lHip, v3(stanceX, BONES.ANKLE_H, lFootZ), v3(0.08, 0, 1));
  const rLeg = solveLeg(torso.rHip, v3(-stanceX, BONES.ANKLE_H, rFootZ), v3(-0.08, 0, 1));
  return { lLeg, rLeg };
}

// ---------------------------------------------------------------------------
// 28 ARQUETIPOS 3D BIOMECÁNICOS
// ---------------------------------------------------------------------------
export const POSES_3D = {

  // 1. PRESS INCLINADO CON MANCUERNAS (30°)
  incline_press: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Abajo en pecho', 'Empuje (concéntrica)', 'Extensión arriba', 'Descenso controlado'],
    views: [
      { label: 'Lateral (30°)', cam: 'side', cue: 'Antebrazos verticales • Banco a 30°' },
      { label: 'Frontal', cam: 'front', cue: 'Sube convergiendo suavemente sin chocar' },
      { label: 'Superior', cam: 'top', cue: 'Codos a ~45° del torso (hombros seguros)' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(30);
      const pelvis = v3(0, 48, 4);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), Math.sin(a)));
      const { lLeg, rLeg } = seatedLegs(torso, 50, 13);

      // Recorrido vertical real con ligera convergencia en el tope
      const hx = lerp(31, 15, p);
      const hy = lerp(torso.shMid.y + 8, torso.shMid.y + 52, p);
      const hz = lerp(torso.shMid.z + 17, torso.shMid.z + 14, p);

      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.75, -0.7, 0.72));
      const rArm = solveArm(torso.rSh, v3(-hx, hy, hz), v3(-0.75, -0.7, 0.72));

      return {
        floorY: 0,
        bench: { kind: 'adjustable', pivotZ: 2, backAngleDeg: 30, backDir: -1, seatLen: 36, backLen: 72, height: 44 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0.95, 0, -0.3) },
          { pos: rArm.hand, axis: v3(0.95, 0, 0.3) }
        ],
        glows: [
          { pos: add(torso.shMid, v3(8, 3, 6)), r: 17 },
          { pos: add(torso.shMid, v3(-8, 3, 6)), r: 17 }
        ]
      };
    }
  },

  // 2. PRESS PLANO CON MANCUERNAS
  flat_press: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Abajo en pecho', 'Empuje (concéntrica)', 'Extensión arriba', 'Descenso controlado'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Antebrazo perpendicular al suelo • Escápulas retraídas' },
      { label: 'Frontal', cam: 'front', cue: 'Trayectoria en arco sutil hacia el centro' },
      { label: 'Superior', cam: 'top', cue: 'Codos a ~45° hacia pies (evita forma de T)' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const pelvis = v3(0, 48, 8);
      const shMid = v3(0, 49, 8 - BONES.TORSO);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 1, 0));
      const { lLeg, rLeg } = seatedLegs(torso, 54, 14);

      const hx = lerp(31, 15, p);
      const hy = lerp(57, 102, p);
      const hz = lerp(-31, -34, p);

      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.72, -0.75, 0.65));
      const rArm = solveArm(torso.rSh, v3(-hx, hy, hz), v3(-0.72, -0.75, 0.65));

      return {
        floorY: 0,
        bench: { kind: 'flat', z0: -60, z1: 42, height: 44 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0.95, 0, -0.28) },
          { pos: rArm.hand, axis: v3(0.95, 0, 0.28) }
        ],
        glows: [
          { pos: add(torso.shMid, v3(9, 4, 8)), r: 17 },
          { pos: add(torso.shMid, v3(-9, 4, 8)), r: 17 }
        ]
      };
    }
  },

  // 3. PRESS MILITAR SENTADO EN BANCO (80°)
  overhead_press: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['A la altura de orejas', 'Empuje vertical', 'Bloqueo controlado', 'Bajada en 2s'],
    views: [
      { label: 'Lateral (80°)', cam: 'side', cue: 'Empuja sobre la coronilla sin arquear lumbar' },
      { label: 'Frontal', cam: 'front', cue: 'Antebrazos verticales • Sube sin chocar mancuernas' },
      { label: 'Superior', cam: 'top', cue: 'Codos ~30° al frente (plano escapular)' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(80);
      const pelvis = v3(0, 49, 4);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), Math.sin(a)));
      const { lLeg, rLeg } = seatedLegs(torso, 48, 13);

      // Manos inician a los costados de las orejas (sin atravesar la cara) y suben sobre la coronilla
      const hx = lerp(31, 15, p);
      const hy = lerp(108, 151, p);
      const hz = lerp(7, -1, p);

      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.6, -0.82, 0.7));
      const rArm = solveArm(torso.rSh, v3(-hx, hy, hz), v3(-0.6, -0.82, 0.7));

      return {
        floorY: 0,
        bench: { kind: 'adjustable', pivotZ: 2, backAngleDeg: 80, backDir: -1, seatLen: 36, backLen: 66, height: 44 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0.92, 0, -0.38) },
          { pos: rArm.hand, axis: v3(0.92, 0, 0.38) }
        ],
        glows: [
          { pos: add(torso.lSh, v3(3, 3, 2)), r: 15 },
          { pos: add(torso.rSh, v3(-3, 3, 2)), r: 15 }
        ]
      };
    }
  },

  // 4. DOMINADAS PRONAS/NEUTRAS EN BARRA
  pullup: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Colgado activo', 'Tracción arriba', 'Pecho hacia barra', 'Bajada controlada'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Ligera inclinación atrás • Barbilla supera la barra' },
      { label: 'Frontal', cam: 'front', cue: 'Codos hacia abajo y costillas, sin balanceo' },
      { label: 'Posterior', cam: 'back', cue: 'Deprime y junta escápulas al subir' }
    ],
    trackPaths: [(s) => s.torso.shMid],
    pose(p) {
      const barY = 214;
      const gripX = 31;
      // Al subir, ligera extensión torácica atrás para que barbilla/pecho pasen detrás y sobre la barra (cero colisión)
      const shY = lerp(161, 203, p);
      const shZ = lerp(-3, -12, p);
      const tilt = deg(lerp(4, 15, p));
      const pelvis = v3(0, shY - Math.cos(tilt) * BONES.TORSO, shZ + Math.sin(tilt) * BONES.TORSO);
      const torso = buildTorsoFrame(pelvis, v3(0, shY, shZ), v3(0, Math.sin(tilt), Math.cos(tilt)));

      // Piernas estables con leve flexión de rodilla controlada atrás
      const lLeg = solveLeg(torso.lHip, add(torso.lHip, v3(0, -76, -12)), v3(0.05, 0, 1), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, add(torso.rHip, v3(0, -76, -12)), v3(-0.05, 0, 1), { customFoot: makeHangingFoot });

      const lHand = v3(gripX, barY, 0);
      const rHand = v3(-gripX, barY, 0);
      // Codos bajan hacia las costillas y ligeramente al frente en plano escapular
      const lArm = solveArm(torso.lSh, lHand, v3(0.75, -0.65, 0.35));
      const rArm = solveArm(torso.rSh, rHand, v3(-0.75, -0.65, 0.35));

      return {
        floorY: 20,
        bar: { y: barY, z: 0, halfW: 66 },
        torso, lLeg, rLeg, lArm, rArm,
        glows: [
          { pos: add(torso.shMid, v3(12, -16, -6)), r: 17 },
          { pos: add(torso.shMid, v3(-12, -16, -6)), r: 17 }
        ]
      };
    }
  },

  // 5. DOMINADAS SUPINAS EN BARRA
  chinup: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Colgado activo', 'Tracción supina', 'Barbilla sobre barra', 'Bajada completa'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codos viajan hacia adelante y abajo • Sin patear' },
      { label: 'Frontal', cam: 'front', cue: 'Agarre al ancho de hombros • Codos cerrados' },
      { label: 'Posterior', cam: 'back', cue: 'Hombros abajo lejos de las orejas' }
    ],
    trackPaths: [(s) => s.torso.shMid],
    pose(p) {
      const barY = 214;
      const gripX = 17.5; // Al ancho de los hombros
      const shY = lerp(160, 205, p);
      const shZ = lerp(-3, -11, p);
      const tilt = deg(lerp(3, 10, p));
      const pelvis = v3(0, shY - Math.cos(tilt) * BONES.TORSO, shZ + Math.sin(tilt) * BONES.TORSO);
      const torso = buildTorsoFrame(pelvis, v3(0, shY, shZ), v3(0, Math.sin(tilt), Math.cos(tilt)));

      const lLeg = solveLeg(torso.lHip, add(torso.lHip, v3(0, -76, -10)), v3(0.05, 0, 1), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, add(torso.rHip, v3(0, -76, -10)), v3(-0.05, 0, 1), { customFoot: makeHangingFoot });

      const lHand = v3(gripX, barY, 0);
      const rHand = v3(-gripX, barY, 0);
      // Codos pegados al frente/abajo (NO abiertos a 90° en W)
      const lArm = solveArm(torso.lSh, lHand, v3(0.16, -0.55, 0.95));
      const rArm = solveArm(torso.rSh, rHand, v3(-0.16, -0.55, 0.95));

      return {
        floorY: 20,
        bar: { y: barY, z: 0, halfW: 62 },
        torso, lLeg, rLeg, lArm, rArm,
        glows: [
          { pos: lerp3(torso.lSh, lArm.elbow, 0.55), r: 14 },
          { pos: lerp3(torso.rSh, rArm.elbow, 0.55), r: 14 },
          { pos: add(torso.shMid, v3(0, -16, -5)), r: 16 }
        ]
      };
    }
  },

  // 6. REMO PECHO APOYADO EN BANCO (35°)
  chest_row: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Brazos estirados', 'Tracción a cadera', 'Aprieta escápulas 1s', 'Retorno controlado'],
    views: [
      { label: 'Lateral (35°)', cam: 'side', cue: 'Codos suben atrás hacia la cadera • Pecho pegado' },
      { label: 'Frontal', cam: 'front', cue: 'Codos cerca del torso sin abrirse a 90°' },
      { label: 'Superior', cam: 'top', cue: 'Retrae escápulas atrás en cada repetición' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(35);
      const pelvis = v3(0, 50, -10);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.cos(a), Math.sin(a)));

      // Piernas apoyadas firmes en el suelo detrás
      const lLeg = solveLeg(torso.lHip, v3(14, BONES.ANKLE_H, -68), v3(0.1, -0.4, 0.8));
      const rLeg = solveLeg(torso.rHip, v3(-14, BONES.ANKLE_H, -68), v3(-0.1, -0.4, 0.8));

      // Manos cuelgan bajo los hombros (p=0) y jalan en arco ligero hacia la cadera (p=1)
      const hx = lerp(22, 26, p);
      const hy = lerp(23, 55, p);
      const hz = lerp(29, -2, p);

      // Polo ARRIBA y ATRÁS (+Y, -Z) para que el codo suba por encima de la espalda
      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.28, 0.92, -0.55));
      const rArm = solveArm(torso.rSh, v3(-hx, hy, hz), v3(-0.28, 0.92, -0.55));

      return {
        floorY: 0,
        bench: { kind: 'adjustable', pivotZ: -12, backAngleDeg: 35, backDir: 1, seatLen: 28, backLen: 72, height: 44 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0.32, 0, 0.95) },
          { pos: rArm.hand, axis: v3(-0.32, 0, 0.95) }
        ],
        glows: [
          { pos: add(torso.shMid, v3(8, 2, -14)), r: 17 },
          { pos: add(torso.shMid, v3(-8, 2, -14)), r: 17 }
        ]
      };
    }
  },

  // 7. REMO SERRUCHO A UN BRAZO EN BANCO
  one_arm_row: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Estiramiento dorsal', 'Jala hacia cadera', 'Pausa arriba', 'Bajada controlada'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codo sube pegado al costado hacia la cadera' },
      { label: 'Frontal', cam: 'front', cue: 'Espalda plana y cadera nivelada sin rotar' },
      { label: 'Superior', cam: 'top', cue: 'Trayectoria en arco rozando el costado' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      // Torso casi paralelo al suelo, ligeramente desplazado a +X para dejar lado derecho sobre banco
      const pelvis = v3(4, 87, -24);
      const shMid = v3(4, 90, -24 + BONES.TORSO);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -1, 0));

      // Pierna derecha (-X): rodilla y pantorrilla apoyadas planas sobre el banco horizontal
      const benchY = 44;
      const rKnee = v3(-5, benchY + 2, -24);
      const rAnkle = v3(-5, benchY + 4, -24 - BONES.SHIN);
      const rLeg = {
        knee: rKnee,
        ankle: rAnkle,
        heel: v3(-5, benchY + 12, rAnkle.z - 2),
        toe: v3(-5, benchY + 1, rAnkle.z - 12)
      };

      // Pierna izquierda (+X): pie exterior firme en el suelo
      const lLeg = solveLeg(torso.lHip, v3(24, BONES.ANKLE_H, -36), v3(0.25, 0.1, 1));

      // Brazo derecho (-X): apoyado recto sobre el banco
      const rArm = solveArm(torso.rSh, v3(-6, benchY + 1, 28), v3(-0.1, 0, -1));

      // Brazo izquierdo (+X): rema en arco desde debajo del hombro hacia la cadera
      const hx = lerp(24, 25, p);
      const hy = lerp(34, 72, p);
      const hz = lerp(24, -10, p);
      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.22, 0.95, -0.45));

      return {
        floorY: 0,
        bench: { kind: 'flat', z0: -78, z1: 44, height: benchY, width: 28 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [{ pos: lArm.hand, axis: v3(0, 0, 1) }],
        glows: [{ pos: add(torso.shMid, v3(12, 0, -18)), r: 18 }]
      };
    }
  },

  // 8. APERTURAS INCLINADAS CON MANCUERNAS (30°)
  incline_fly: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Estiramiento abierto', 'Cierre en abrazo', 'Aprieta pecho arriba', 'Apertura controlada'],
    views: [
      { label: 'Lateral (30°)', cam: 'side', cue: 'Ligera flexión fija de codo (~18°) en todo el arco' },
      { label: 'Frontal', cam: 'front', cue: 'Abre amplio hasta estiramiento cómodo y cierra arriba' },
      { label: 'Superior', cam: 'top', cue: 'Arco semicircular como en un abrazo' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(30);
      const pelvis = v3(0, 48, 4);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), Math.sin(a)));
      const { lLeg, rLeg } = seatedLegs(torso, 50, 13);

      // Arco con radio fijo (~53.5 cm => ~18° de flexión constante de codo)
      const reach = 53.5;
      const openAng = deg(lerp(78, 13, p));
      const fwdDir = torso.fwd; // normal al pecho
      const upShift = mul(torso.up, -4); // brazos ligeramente en línea de pecho (no sobre la cara)

      const lHandT = add(add(torso.lSh, upShift), add(v3(Math.sin(openAng) * reach, 0, 0), mul(fwdDir, Math.cos(openAng) * reach)));
      const rHandT = add(add(torso.rSh, upShift), add(v3(-Math.sin(openAng) * reach, 0, 0), mul(fwdDir, Math.cos(openAng) * reach)));

      const lArm = solveArm(torso.lSh, lHandT, v3(0.55, -0.55, 0.45));
      const rArm = solveArm(torso.rSh, rHandT, v3(-0.55, -0.55, 0.45));

      return {
        floorY: 0,
        bench: { kind: 'adjustable', pivotZ: 2, backAngleDeg: 30, backDir: -1, seatLen: 36, backLen: 72, height: 44 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: torso.up },
          { pos: rArm.hand, axis: torso.up }
        ],
        glows: [
          { pos: add(torso.shMid, v3(10, 2, 6)), r: 17 },
          { pos: add(torso.shMid, v3(-10, 2, 6)), r: 17 }
        ]
      };
    }
  },

  // 9. APERTURAS CON BANDA DE RESISTENCIA
  band_fly: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Brazos abiertos', 'Cierre al frente', 'Aprieta pectoral 1s', 'Retorno con tensión'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Paso adelante estable • Cierra frente al esternón' },
      { label: 'Frontal', cam: 'front', cue: 'Hombros abajo • Codos semiflexionados fijos' },
      { label: 'Superior', cam: 'top', cue: 'La banda rodea la espalda manteniendo tensión constante' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const pelvis = v3(0, 90, 0);
      const shMid = v3(0, 138, 4);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 0, 1));
      const { lLeg, rLeg } = standingLegs(torso, 12, 22, -20);

      const reach = 53.5;
      const openAng = deg(lerp(78, 8, p));
      const handY = torso.shMid.y - 4;
      const lHandT = v3(torso.lSh.x + Math.sin(openAng) * reach, handY, torso.lSh.z + Math.cos(openAng) * reach);
      const rHandT = v3(torso.rSh.x - Math.sin(openAng) * reach, handY, torso.rSh.z + Math.cos(openAng) * reach);

      const lArm = solveArm(torso.lSh, lHandT, v3(0.4, -0.25, -0.8));
      const rArm = solveArm(torso.rSh, rHandT, v3(-0.4, -0.25, -0.8));

      // Banda rodeando la ESPALDA por detrás (z negativo detrás del torso -> Z-sorting correcto)
      const backZ = torso.shMid.z - 12;
      const bandPts = [
        lArm.hand,
        add(lArm.elbow, v3(2, -1, -5)),
        v3(torso.lSh.x + 2, torso.shMid.y - 3, backZ),
        v3(0, torso.shMid.y - 4, backZ - 2),
        v3(torso.rSh.x - 2, torso.shMid.y - 3, backZ),
        add(rArm.elbow, v3(-2, -1, -5)),
        rArm.hand
      ];

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        bands: [{ points: bandPts }],
        glows: [
          { pos: add(torso.shMid, v3(9, -4, 6)), r: 16 },
          { pos: add(torso.shMid, v3(-9, -4, 6)), r: 16 }
        ]
      };
    }
  },

  // 10. FACE PULL CON BANDA EN BARRA
  face_pull: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Brazos extendidos', 'Jala hacia frente', 'Rotación externa 1s', 'Retorno controlado'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codos viajan atrás a la altura del hombro' },
      { label: 'Frontal', cam: 'front', cue: 'Termina en pose de doble bíceps (rotación externa)' },
      { label: 'Superior', cam: 'top', cue: 'Separa manos hacia orejas apretando espalda alta' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const pelvis = v3(0, 90, 0);
      const shMid = v3(0, 138, -2);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 0, 1));
      const { lLeg, rLeg } = standingLegs(torso, 12, 16, -16);

      const anchor = v3(0, 146, 98);
      // En p=0 manos juntas adelante; en p=1 manos abiertas arriba junto a orejas/frente (pose doble bíceps) y codos altos ATRÁS
      const hx = lerp(12, 36, p);
      const hy = lerp(141, 160, p);
      const hz = lerp(49, 1, p);

      // Polo hacia AFUERA y ATRÁS (-Z) y ligeramente abajo para crear una L vertical nítida de rotación externa
      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.85, -0.18, -0.9));
      const rArm = solveArm(torso.rSh, v3(-hx, hy, hz), v3(-0.85, -0.18, -0.9));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        bands: [
          { anchor, points: [anchor, lArm.hand] },
          { points: [anchor, rArm.hand] }
        ],
        glows: [
          { pos: add(torso.lSh, v3(0, 1, -6)), r: 15 },
          { pos: add(torso.rSh, v3(0, 1, -6)), r: 15 }
        ]
      };
    }
  },

  // 11. ELEVACIONES LATERALES CON MANCUERNA
  lateral_raise: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Brazos a los lados', 'Elevación lateral', 'Altura del hombro', 'Descenso controlado'],
    views: [
      { label: 'Frontal', cam: 'front', cue: 'Sube liderando con codos hasta la altura del hombro' },
      { label: 'Lateral', cam: 'side', cue: 'Brazos ~30° por delante • Sin impulso lumbar' },
      { label: 'Superior (30°)', cam: 'top', cue: 'Plano escapular (~30° hacia adelante)' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const pelvis = v3(0, 90, -1);
      const shMid = v3(0, 138, 3); // Leve inclinación estable al frente
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 0, 1));
      const { lLeg, rLeg } = standingLegs(torso, 12, 0, 0);

      const reach = 54.5; // Codo ligeramente semiflexionado (~14°)
      const elev = deg(lerp(9, 86, p));
      const scapCos = Math.cos(deg(30));
      const scapSin = Math.sin(deg(30));

      const lHandT = add(torso.lSh, v3(Math.sin(elev) * scapCos * reach, -Math.cos(elev) * reach, Math.sin(elev) * scapSin * reach));
      const rHandT = add(torso.rSh, v3(-Math.sin(elev) * scapCos * reach, -Math.cos(elev) * reach, Math.sin(elev) * scapSin * reach));

      const lArm = solveArm(torso.lSh, lHandT, v3(0.1, 0.15, -0.95));
      const rArm = solveArm(torso.rSh, rHandT, v3(-0.1, 0.15, -0.95));

      // Eje de mancuerna perpendicular al brazo (agarre prono en elevación lateral)
      const lAxis = norm(cross(sub(lArm.hand, torso.lSh), v3(0, 1, 0)));
      const rAxis = norm(cross(v3(0, 1, 0), sub(rArm.hand, torso.rSh)));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: lAxis },
          { pos: rArm.hand, axis: rAxis }
        ],
        glows: [
          { pos: add(torso.lSh, v3(4, 2, 0)), r: 15 },
          { pos: add(torso.rSh, v3(-4, 2, 0)), r: 15 }
        ]
      };
    }
  },

  // 12. PÁJAROS SENTADO EN BANCO
  rear_delt: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Bajo los muslos', 'Apertura posterior', 'Pausa arriba', 'Bajada controlada'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Pecho inclinado cerca de muslos • Espalda neutra' },
      { label: 'Frontal', cam: 'front', cue: 'Abre liderando con codos sin encoger trapecios' },
      { label: 'Superior', cam: 'top', cue: 'Brazos abren a ~45° hacia los lados y atrás' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(20); // Pecho bien inclinado sobre muslos
      const pelvis = v3(0, 49, 4);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.cos(a), Math.sin(a)));
      const { lLeg, rLeg } = seatedLegs(torso, 44, 11);

      const reach = 53.5;
      const openAng = deg(lerp(8, 86, p));
      // p=0: manos debajo de los muslos (y≈14); p=1: brazos abiertos lateral y ligeramente atrás (-18°)
      const backSweep = deg(lerp(0, -18, p));
      const lHandT = add(torso.lSh, v3(Math.sin(openAng) * Math.cos(backSweep) * reach, -Math.cos(openAng) * reach, Math.sin(openAng) * Math.sin(backSweep) * reach));
      const rHandT = add(torso.rSh, v3(-Math.sin(openAng) * Math.cos(backSweep) * reach, -Math.cos(openAng) * reach, Math.sin(openAng) * Math.sin(backSweep) * reach));

      const lArm = solveArm(torso.lSh, lHandT, v3(0.25, 0.75, -0.55));
      const rArm = solveArm(torso.rSh, rHandT, v3(-0.25, 0.75, -0.55));

      return {
        floorY: 0,
        bench: { kind: 'flat', z0: -38, z1: 20, height: 44, width: 28 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0, 0, 1) },
          { pos: rArm.hand, axis: v3(0, 0, 1) }
        ],
        glows: [
          { pos: add(torso.lSh, v3(0, 4, -5)), r: 15 },
          { pos: add(torso.rSh, v3(0, 4, -5)), r: 15 }
        ]
      };
    }
  },

  // 13. SENTADILLA BÚLGARA EN BANCO
  bulgarian: {
    topMode: 'faceUp',
    eccentricFirst: true,
    phaseLabels: ['Arriba estable', 'Descenso (excéntrica)', 'Profundidad abajo', 'Empuje (concéntrica)'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Empeine plano atrás • Rodilla sigue la punta del pie' },
      { label: 'Frontal', cam: 'front', cue: 'Pies al ancho de cadera • Rodilla recta sin colapsar' },
      { label: 'Posterior', cam: 'back', cue: 'Cadera nivelada • Empuje desde pierna delantera' }
    ],
    trackPaths: [(s) => s.torso.pelvis],
    pose(p) {
      const benchH = 42;
      const benchZ = -58;
      // Arriba (p=0): pierna delantera casi extendida; abajo (p=1): descenso profundo
      const pelvY = lerp(87, 49, p);
      const pelvZ = lerp(6, -3, p);
      const lean = deg(lerp(9, 17, p));
      const pelvis = v3(0, pelvY, pelvZ);
      const shMid = add(pelvis, v3(0, Math.cos(lean) * BONES.TORSO, Math.sin(lean) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.sin(lean), Math.cos(lean)));

      // Pierna delantera (+X = izquierda, ancho de cadera x=+12)
      const lLeg = solveLeg(torso.lHip, v3(12, BONES.ANKLE_H, 32), v3(0.05, 0.1, 1));

      // Pierna trasera (-X = derecha, ancho de cadera x=-12), empeine plano sobre el banco
      const backAnkle = v3(-12, benchH + 3, benchZ + 14);
      const rLeg = solveLeg(torso.rHip, backAnkle, v3(-0.05, -0.35, 1), {
        customFoot: (ank) => ({
          ankle: ank,
          heel: v3(ank.x, benchH + 10, ank.z - 2),
          toe: v3(ank.x, benchH + 1, ank.z - 20)
        })
      });

      // Brazos largos colgando verticalmente a los costados con mancuernas
      const lArm = solveArm(torso.lSh, add(torso.lSh, v3(6, -55, 1)), v3(0.3, 0, -0.8));
      const rArm = solveArm(torso.rSh, add(torso.rSh, v3(-6, -55, 1)), v3(-0.3, 0, -0.8));

      return {
        floorY: 0,
        bench: { kind: 'block', z: benchZ, depthZ: 30, height: benchH, widthX: 84 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0, 0, 1) },
          { pos: rArm.hand, axis: v3(0, 0, 1) }
        ],
        glows: [
          { pos: lerp3(torso.lHip, lLeg.knee, 0.5), r: 19 },
          { pos: add(torso.lHip, v3(0, 0, -5)), r: 15 }
        ]
      };
    }
  },

  // 14. SENTADILLA GOBLET TALONES ELEVADOS
  goblet_squat: {
    topMode: 'faceUp',
    eccentricFirst: true,
    phaseLabels: ['De pie erguido', 'Descenso profundo', 'Pausa abajo', 'Empuje arriba'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Talones sobre cuña • Torso erguido y rodillas adelante' },
      { label: 'Frontal', cam: 'front', cue: 'Rodillas alineadas con las puntas • Mancuerna al pecho' },
      { label: 'Posterior', cam: 'back', cue: 'Espalda neutra y cadera simétrica al subir' }
    ],
    trackPaths: [(s) => s.torso.pelvis],
    pose(p) {
      const pelvY = lerp(89, 44, p);
      const pelvZ = lerp(-3, -17, p);
      const lean = deg(lerp(5, 16, p));
      const pelvis = v3(0, pelvY, pelvZ);
      const shMid = add(pelvis, v3(0, Math.cos(lean) * BONES.TORSO, Math.sin(lean) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.sin(lean), Math.cos(lean)));

      // Pies separados al ancho de hombros, talones elevados 5.5 cm sobre la cuña
      const lLeg = solveLeg(torso.lHip, v3(17, BONES.ANKLE_H + 3, 0), v3(0.32, 0.08, 0.95), { yawDeg: 14, heelLift: 5.5 });
      const rLeg = solveLeg(torso.rHip, v3(-17, BONES.ANKLE_H + 3, 0), v3(-0.32, 0.08, 0.95), { yawDeg: -14, heelLift: 5.5 });

      // Ambas manos sujetan la mancuerna vertical pegada al pecho
      const dbPos = add(torso.shMid, add(mul(torso.fwd, 17), mul(torso.up, -10)));
      const lArm = solveArm(torso.lSh, add(dbPos, v3(4, 2, 0)), v3(0.35, -0.92, 0.25));
      const rArm = solveArm(torso.rSh, add(dbPos, v3(-4, 2, 0)), v3(-0.35, -0.92, 0.25));

      return {
        floorY: 0,
        wedge: { zHeel: -5, zToe: 13, h: 5.5, halfW: 25 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [{ pos: dbPos, axis: v3(0, 1, 0), halfLen: 11, plateR: 6.5 }],
        glows: [
          { pos: lerp3(torso.lHip, lLeg.knee, 0.5), r: 17 },
          { pos: lerp3(torso.rHip, rLeg.knee, 0.5), r: 17 }
        ]
      };
    }
  },

  // 15. PESO MUERTO RUMANO CON MANCUERNAS
  rdl: {
    topMode: 'faceUp',
    eccentricFirst: true,
    phaseLabels: ['De pie erguido', 'Bisagra cadera atrás', 'Estiramiento isquios', 'Empuje de glúteos'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Rodillas fijas (~15°) • Cadera atrás y espalda neutra' },
      { label: 'Frontal', cam: 'front', cue: 'Mancuernas pegadas a muslos y espinillas' },
      { label: 'Posterior', cam: 'back', cue: 'Activa isquiotibiales y glúteos sin redondear lumbar' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      // Rodillas casi fijas (~15° flexión constante), cadera viaja hacia atrás en arco sobre el fémur
      const ankleL = v3(12, BONES.ANKLE_H, 0);
      const ankleR = v3(-12, BONES.ANKLE_H, 0);
      // Espinilla inclinada solo 6° adelante (fija)
      const kneeY = BONES.ANKLE_H + Math.cos(deg(6)) * BONES.SHIN;
      const kneeZ = Math.sin(deg(6)) * BONES.SHIN;
      // El fémur pivota hacia atrás de 10° a 52° respecto a la vertical (flexión de rodilla casi constante!)
      const femurBack = deg(lerp(8, 42, p));
      const pelvY = kneeY + Math.cos(femurBack) * BONES.THIGH;
      const pelvZ = kneeZ - Math.sin(femurBack) * BONES.THIGH;

      // Torso rota en bisagra de 85° (erguido) a 15° sobre la horizontal (espalda 100% recta)
      const torsoPitch = deg(lerp(85, 16, p));
      const pelvis = v3(0, pelvY, pelvZ);
      const shMid = add(pelvis, v3(0, Math.sin(torsoPitch) * BONES.TORSO, Math.cos(torsoPitch) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.cos(torsoPitch), Math.sin(torsoPitch)));

      const lLeg = solveLeg(torso.lHip, ankleL, v3(0.05, 0.1, 1));
      const rLeg = solveLeg(torso.rHip, ankleR, v3(-0.05, 0.1, 1));

      // Brazos cuelgan verticales pegados a las piernas (mancuernas rozan muslo/mitad de espinilla)
      const handZ = lerp(9, 10, p);
      const handY = Math.max(26, torso.shMid.y - 54);
      const lArm = solveArm(torso.lSh, v3(16, handY, handZ), v3(0.1, 0, -1));
      const rArm = solveArm(torso.rSh, v3(-16, handY, handZ), v3(-0.1, 0, -1));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(1, 0, 0) },
          { pos: rArm.hand, axis: v3(1, 0, 0) }
        ],
        glows: [
          { pos: add(lerp3(torso.lHip, lLeg.knee, 0.5), v3(0, 0, -6)), r: 17 },
          { pos: add(lerp3(torso.rHip, rLeg.knee, 0.5), v3(0, 0, -6)), r: 17 }
        ]
      };
    }
  },

  // 16. HIP THRUST EN BANCO CON MANCUERNAS
  hip_thrust: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Cadera abajo', 'Empuje con talones', 'Aprieta glúteos 1s', 'Descenso controlado'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Espinillas verticales arriba • Cadera alineada' },
      { label: 'Frontal', cam: 'front', cue: 'Rodillas firmes sin colapsar hacia adentro' },
      { label: 'Superior', cam: 'top', cue: 'Escápulas en banco • Mancuerna estable en pelvis' }
    ],
    trackPaths: [(s) => s.torso.pelvis],
    pose(p) {
      const benchH = 42;
      // Pivote exacto en borde inferior de escápulas apoyadas sobre el borde del banco
      const scap = v3(0, benchH + 2, -32);
      const torsoAng = deg(lerp(-36, 0, p)); // -36° abajo -> 0° horizontal arriba
      const shMid = add(scap, v3(0, -Math.sin(torsoAng) * 10, -Math.cos(torsoAng) * 10));
      const pelvis = add(shMid, v3(0, Math.sin(torsoAng) * BONES.TORSO, Math.cos(torsoAng) * BONES.TORSO));
      // Cabeza acompaña el torso (mentón recogido mirando al frente)
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(torsoAng), -Math.sin(torsoAng)));
      torso.head = add(shMid, v3(0, 12, -11));

      // Tobillos fijos en el suelo de modo que en p=1 la espinilla sea vertical (z = pelvis.z + THIGH = 6 + 42 = 48)
      const footZ = 48;
      const lLeg = solveLeg(torso.lHip, v3(15, BONES.ANKLE_H, footZ), v3(0.08, 1, 0.15));
      const rLeg = solveLeg(torso.rHip, v3(-15, BONES.ANKLE_H, footZ), v3(-0.08, 1, 0.15));

      // Mancuerna apoyada sobre la pelvis sujetada por ambas manos
      const dbPos = add(pelvis, v3(0, 7, 3));
      const lArm = solveArm(torso.lSh, add(dbPos, v3(12, 1, 0)), v3(0.5, -0.5, -0.4));
      const rArm = solveArm(torso.rSh, add(dbPos, v3(-12, 1, 0)), v3(-0.5, -0.5, -0.4));

      return {
        floorY: 0,
        bench: { kind: 'block', z: -48, depthZ: 34, height: benchH, widthX: 84 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [{ pos: dbPos, axis: v3(1, 0, 0), halfLen: 15, plateR: 7 }],
        glows: [
          { pos: add(pelvis, v3(0, -4, 0)), r: 21 }
        ]
      };
    }
  },

  // 17. CURL INCLINADO EN BANCO 45°
  incline_curl: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Estiramiento abajo', 'Flexión de codos', 'Contracción arriba', 'Bajada en 2s'],
    views: [
      { label: 'Lateral (45°)', cam: 'side', cue: 'Brazos perpendiculares al suelo detrás del torso' },
      { label: 'Frontal', cam: 'front', cue: 'Codos fijos y paralelos sin adelantarse' },
      { label: 'Superior', cam: 'top', cue: 'Hombros pegados al respaldo en todo el recorrido' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const a = deg(45);
      const pelvis = v3(0, 49, 4);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), Math.sin(a)));
      const { lLeg, rLeg } = seatedLegs(torso, 48, 12);

      // Húmero cuelga vertical detrás del torso (codo fijo) y antebrazo rota libre por el exterior
      const lEl = add(torso.lSh, v3(4, -BONES.UPPER_ARM, -1));
      const rEl = add(torso.rSh, v3(-4, -BONES.UPPER_ARM, -1));
      const fAng = deg(lerp(-85, 56, p));
      const lHand = add(lEl, v3(1, Math.sin(fAng) * BONES.FOREARM, Math.cos(fAng) * BONES.FOREARM));
      const rHand = add(rEl, v3(-1, Math.sin(fAng) * BONES.FOREARM, Math.cos(fAng) * BONES.FOREARM));

      // Supinación progresiva de neutro abajo a supino arriba
      const sup = lerp(0, 1, p);
      const lAxis = norm(v3(sup, 0, 1 - sup * 0.85));
      const rAxis = norm(v3(sup, 0, -(1 - sup * 0.85)));

      return {
        floorY: 0,
        bench: { kind: 'adjustable', pivotZ: 2, backAngleDeg: 45, backDir: -1, seatLen: 36, backLen: 72, height: 44 },
        torso, lLeg, rLeg,
        lArm: { elbow: lEl, hand: lHand },
        rArm: { elbow: rEl, hand: rHand },
        dumbbells: [
          { pos: lHand, axis: lAxis },
          { pos: rHand, axis: rAxis }
        ],
        glows: [
          { pos: add(lerp3(torso.lSh, lEl, 0.55), v3(0, 0, 4)), r: 14 },
          { pos: add(lerp3(torso.rSh, rEl, 0.55), v3(0, 0, 4)), r: 14 }
        ]
      };
    }
  },

  // 18. CURL MARTILLO CON MANCUERNAS
  hammer_curl: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Brazos extendidos', 'Flexión neutra', 'Contracción arriba', 'Descenso en 2s'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codos pegados al costado • Sin balancear espalda' },
      { label: 'Frontal', cam: 'front', cue: 'Palmas enfrentadas (agarre neutro) todo el tiempo' },
      { label: 'Superior', cam: 'top', cue: 'Trayectoria recta sin abrir los codos' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const pelvis = v3(0, 90, 0);
      const shMid = v3(0, 138, 0);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 0, 1));
      const { lLeg, rLeg } = standingLegs(torso, 12, 0, 0);

      const lEl = add(torso.lSh, v3(2, -BONES.UPPER_ARM, 1));
      const rEl = add(torso.rSh, v3(-2, -BONES.UPPER_ARM, 1));
      const fAng = deg(lerp(-85, 62, p));
      const lHand = add(lEl, v3(0, Math.sin(fAng) * BONES.FOREARM, Math.cos(fAng) * BONES.FOREARM));
      const rHand = add(rEl, v3(0, Math.sin(fAng) * BONES.FOREARM, Math.cos(fAng) * BONES.FOREARM));

      // Agarre martillo verdadero: el eje de la mancuerna rota perpendicular al antebrazo en plano YZ
      const dbAxis = v3(0, -Math.cos(fAng), Math.sin(fAng));

      return {
        floorY: 0,
        torso, lLeg, rLeg,
        lArm: { elbow: lEl, hand: lHand },
        rArm: { elbow: rEl, hand: rHand },
        dumbbells: [
          { pos: lHand, axis: dbAxis },
          { pos: rHand, axis: dbAxis }
        ],
        glows: [
          { pos: add(lerp3(torso.lSh, lEl, 0.55), v3(0, 0, 5)), r: 14 },
          { pos: add(lerp3(torso.rSh, rEl, 0.55), v3(0, 0, 5)), r: 14 }
        ]
      };
    }
  },

  // 19. PRESS FRANCÉS CON MANCUERNAS EN BANCO
  french_press: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['A lados de la cabeza', 'Extensión de codos', 'Contracción tríceps', 'Bajada controlada'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Húmero fijo inclinado ~15° atrás • Solo mueve codos' },
      { label: 'Frontal', cam: 'front', cue: 'Acostado en banco • Codos paralelos sin abrirse' },
      { label: 'Superior', cam: 'top', cue: 'Mancuernas bajan a los costados de la cabeza' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const pelvis = v3(0, 48, 8);
      const shMid = v3(0, 49, 8 - BONES.TORSO);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 1, 0));
      const { lLeg, rLeg } = seatedLegs(torso, 54, 14);

      // Húmero fijo inclinado 15° hacia atrás sobre la cabeza (mantiene tensión constante en tríceps)
      const humTilt = deg(15);
      const lEl = add(torso.lSh, v3(-1, Math.cos(humTilt) * BONES.UPPER_ARM, -Math.sin(humTilt) * BONES.UPPER_ARM));
      const rEl = add(torso.rSh, v3(1, Math.cos(humTilt) * BONES.UPPER_ARM, -Math.sin(humTilt) * BONES.UPPER_ARM));

      // Antebrazo gira de -130° (mancuernas junto a las sienes/orejas!) hasta +102° (extensión arriba!)
      const fAng = deg(lerp(-142, -16, p)); // 0° = +Y arriba, negativo = hacia -Z atrás
      // Usando ángulo desde +Y hacia -Z: dy = cos(a)*L, dz = sin(a)*L
      const lHand = add(lEl, v3(0, Math.cos(fAng) * BONES.FOREARM, Math.sin(fAng) * BONES.FOREARM));
      const rHand = add(rEl, v3(0, Math.cos(fAng) * BONES.FOREARM, Math.sin(fAng) * BONES.FOREARM));

      // Agarre neutro: eje de mancuerna perpendicular al antebrazo
      const dbAxis = v3(0, -Math.sin(fAng), Math.cos(fAng));

      return {
        floorY: 0,
        bench: { kind: 'flat', z0: -62, z1: 42, height: 44 },
        torso, lLeg, rLeg,
        lArm: { elbow: lEl, hand: lHand },
        rArm: { elbow: rEl, hand: rHand },
        dumbbells: [
          { pos: lHand, axis: dbAxis },
          { pos: rHand, axis: dbAxis }
        ],
        glows: [
          { pos: add(lerp3(torso.lSh, lEl, 0.5), v3(0, 0, -5)), r: 15 },
          { pos: add(lerp3(torso.rSh, rEl, 0.5), v3(0, 0, -5)), r: 15 }
        ]
      };
    }
  },

  // 20. EXTENSIÓN DE TRÍCEPS CON BANDA EN BARRA
  band_tricep: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Codos a 90°+', 'Empuje abajo', 'Aprieta tríceps 1s', 'Subida controlada'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codos pegados al torso • Extiende por completo abajo' },
      { label: 'Frontal', cam: 'front', cue: 'Hombros fijos • Brazos paralelos sin abrir codos' },
      { label: 'Posterior', cam: 'back', cue: 'Espalda estable y ligera inclinación al frente' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const pelvis = v3(0, 90, -4);
      const lean = deg(11);
      const shMid = add(pelvis, v3(0, Math.cos(lean) * BONES.TORSO, Math.sin(lean) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.sin(lean), Math.cos(lean)));
      const { lLeg, rLeg } = standingLegs(torso, 12, 8, -8);

      const barY = 214;
      const barZ = 28; // Barra claramente al frente de la cabeza (no atraviesa el rostro)
      const lEl = add(torso.lSh, v3(1, -BONES.UPPER_ARM, 4));
      const rEl = add(torso.rSh, v3(-1, -BONES.UPPER_ARM, 4));

      // Antebrazo de +25° arriba (flexionado >90°) hasta -82° (extensión completa abajo)
      const fAng = deg(lerp(24, -82, p));
      const lHand = add(lEl, v3(-2, Math.sin(fAng) * BONES.FOREARM, Math.cos(fAng) * BONES.FOREARM));
      const rHand = add(rEl, v3(2, Math.sin(fAng) * BONES.FOREARM, Math.cos(fAng) * BONES.FOREARM));

      const anchor = v3(0, barY, barZ);
      return {
        floorY: 0,
        bar: { y: barY, z: barZ, halfW: 54, showPosts: false },
        torso, lLeg, rLeg,
        lArm: { elbow: lEl, hand: lHand },
        rArm: { elbow: rEl, hand: rHand },
        bands: [
          { anchor, points: [anchor, lHand] },
          { points: [anchor, rHand] }
        ],
        glows: [
          { pos: add(lerp3(torso.lSh, lEl, 0.5), v3(0, 0, -5)), r: 14 },
          { pos: add(lerp3(torso.rSh, rEl, 0.5), v3(0, 0, -5)), r: 14 }
        ]
      };
    }
  },

  // =========================================================================
  // 8 ARQUETIPOS ADICIONALES (Calentamientos, alternativas y rutinas nuevas)
  // =========================================================================

  // 21. FLEXIONES (Suelo / Chaleco / Banda)
  pushup: {
    topMode: 'faceUp',
    eccentricFirst: true,
    phaseLabels: ['Plancha alta', 'Descenso en bloque', 'Pecho cerca del suelo', 'Empuje firme'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Cuerpo en línea recta de tobillos a hombros' },
      { label: 'Frontal', cam: 'front', cue: 'Manos firmes algo más anchas que hombros' },
      { label: 'Superior', cam: 'top', cue: 'Codos a ~45° hacia atrás (no a 90°)' }
    ],
    trackPaths: [(s) => s.torso.shMid],
    pose(p) {
      // Pivote desde la punta de los pies atrás (z=-78, y=4)
      const pivot = v3(0, 6, -78);
      const bodyAng = deg(lerp(24, 6, p));
      const legLen = BONES.THIGH + BONES.SHIN - 1;
      const pelvis = add(pivot, v3(0, Math.sin(bodyAng) * legLen, Math.cos(bodyAng) * legLen));
      const shMid = add(pelvis, v3(0, Math.sin(bodyAng) * BONES.TORSO, Math.cos(bodyAng) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.cos(bodyAng), Math.sin(bodyAng)));

      const lLeg = solveLeg(torso.lHip, v3(10, 6, -78), v3(0, -1, 0), {
        customFoot: (ank) => ({ ankle: ank, heel: v3(ank.x, 14, ank.z - 4), toe: v3(ank.x, 0, ank.z + 4) })
      });
      const rLeg = solveLeg(torso.rHip, v3(-10, 6, -78), v3(0, -1, 0), {
        customFoot: (ank) => ({ ankle: ank, heel: v3(ank.x, 14, ank.z - 4), toe: v3(ank.x, 0, ank.z + 4) })
      });

      const handZ = 48;
      const lArm = solveArm(torso.lSh, v3(26, 2, handZ), v3(0.7, 0.35, -0.8));
      const rArm = solveArm(torso.rSh, v3(-26, 2, handZ), v3(-0.7, 0.35, -0.8));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        glows: [
          { pos: add(torso.shMid, v3(9, -4, 0)), r: 16 },
          { pos: add(torso.shMid, v3(-9, -4, 0)), r: 16 }
        ]
      };
    }
  },

  // 22. PUENTE DE GLÚTEO EN SUELO
  glute_bridge: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Cadera en suelo', 'Elevación de pelvis', 'Aprieta glúteos 1s', 'Bajada controlada'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Empuja con talones • Alinea hombros, cadera y rodillas' },
      { label: 'Frontal', cam: 'front', cue: 'Rodillas paralelas sin juntarse al subir' },
      { label: 'Superior', cam: 'top', cue: 'Pies al ancho de cadera • Core firme' }
    ],
    trackPaths: [(s) => s.torso.pelvis],
    pose(p) {
      const shMid = v3(0, 9, -34);
      const liftAng = deg(lerp(0, 31, p));
      const pelvis = add(shMid, v3(0, Math.sin(liftAng) * BONES.TORSO, Math.cos(liftAng) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(liftAng), -Math.sin(liftAng)));
      torso.head = v3(0, 10, -50);

      const footZ = 42;
      const lLeg = solveLeg(torso.lHip, v3(14, BONES.ANKLE_H, footZ), v3(0.05, 1, 0.2));
      const rLeg = solveLeg(torso.rHip, v3(-14, BONES.ANKLE_H, footZ), v3(-0.05, 1, 0.2));

      const lArm = solveArm(torso.lSh, v3(24, 4, 14), v3(0.4, -0.5, 0));
      const rArm = solveArm(torso.rSh, v3(-24, 4, 14), v3(-0.4, -0.5, 0));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        glows: [{ pos: add(pelvis, v3(0, -3, 0)), r: 19 }]
      };
    }
  },

  // 23. CURL FEMORAL ACOSTADO CON BANDA
  leg_curl_band: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Piernas extendidas', 'Flexión femoral', 'Talones al glúteo', 'Retorno lento'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Cadera pegada al suelo • Lleva talones hacia glúteos' },
      { label: 'Superior', cam: 'top', cue: 'Rodillas paralelas • Tensión continua en banda' },
      { label: 'Posterior', cam: 'back', cue: 'Contrae isquiotibiales sin despegar pelvis' }
    ],
    trackPaths: [(s) => s.lLeg.ankle],
    pose(p) {
      // Boca abajo en el suelo, cabeza en +Z, piernas hacia -Z
      const pelvis = v3(0, 9, 0);
      const shMid = v3(0, 11, BONES.TORSO);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -1, 0));

      const lKnee = v3(11, 8, -BONES.THIGH);
      const rKnee = v3(-11, 8, -BONES.THIGH);
      const flexAng = deg(lerp(5, 116, p)); // 5° casi plano -> 116° flexionado hacia glúteos
      const lAnkle = add(lKnee, v3(0, Math.sin(flexAng) * BONES.SHIN, -Math.cos(flexAng) * BONES.SHIN));
      const rAnkle = add(rKnee, v3(0, Math.sin(flexAng) * BONES.SHIN, -Math.cos(flexAng) * BONES.SHIN));

      const mkProneFoot = (ank) => ({
        ankle: ank,
        heel: add(ank, v3(0, 4, 4)),
        toe: add(ank, v3(0, -6, -8))
      });
      const lLeg = { knee: lKnee, ...mkProneFoot(lAnkle) };
      const rLeg = { knee: rKnee, ...mkProneFoot(rAnkle) };

      const lArm = solveArm(torso.lSh, v3(14, 5, 64), v3(0.8, 0.1, 0.2));
      const rArm = solveArm(torso.rSh, v3(-14, 5, 64), v3(-0.8, 0.1, 0.2));

      const anchor = v3(0, 9, -110);
      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        bands: [
          { anchor, points: [anchor, lAnkle] },
          { points: [anchor, rAnkle] }
        ],
        glows: [
          { pos: add(lerp3(torso.lHip, lKnee, 0.5), v3(0, 5, 0)), r: 16 },
          { pos: add(lerp3(torso.rHip, rKnee, 0.5), v3(0, 5, 0)), r: 16 }
        ]
      };
    }
  },

  // 24. COPA DE TRÍCEPS / EXTENSIÓN SOBRE CABEZA
  overhead_tricep: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Detrás de la cabeza', 'Extensión arriba', 'Bloqueo suave', 'Bajada profunda'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codos apuntando arriba • Estiramiento profundo atrás' },
      { label: 'Frontal', cam: 'front', cue: 'Codos cerrados junto a la cabeza sin abrirse' },
      { label: 'Posterior', cam: 'back', cue: 'Baja la mancuerna controlada detrás de la nuca' }
    ],
    trackPaths: [(s) => s.dumbbells[0].pos],
    pose(p) {
      const pelvis = v3(0, 49, 2);
      const shMid = v3(0, 49 + BONES.TORSO, 0);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 0, 1));
      const { lLeg, rLeg } = seatedLegs(torso, 44, 13);

      const fAng = deg(lerp(-140, -6, p)); // 0° = +Y arriba, negativo = detrás de la cabeza (-Z)
      const elbowY = torso.lSh.y + BONES.UPPER_ARM - 2;
      const elbowZ = torso.lSh.z + 2;
      const rPlane = Math.sqrt(BONES.FOREARM * BONES.FOREARM - 8 * 8); // exacto considerando convergencia lateral a las manos
      const dbPos = v3(0, elbowY + Math.cos(fAng) * rPlane, elbowZ + Math.sin(fAng) * rPlane);
      const lArm = solveArm(torso.lSh, add(dbPos, v3(5, 0, 0)), v3(0.25, 0.9, 0.45));
      const rArm = solveArm(torso.rSh, add(dbPos, v3(-5, 0, 0)), v3(-0.25, 0.9, 0.45));
      const actualDb = lerp3(lArm.hand, rArm.hand, 0.5);

      return {
        floorY: 0,
        bench: { kind: 'flat', z0: -34, z1: 24, height: 44, width: 28 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [{ pos: actualDb, axis: v3(0, Math.cos(fAng), Math.sin(fAng)), halfLen: 11, plateR: 6.5 }],
        glows: [
          { pos: add(lerp3(torso.lSh, lArm.elbow, 0.5), v3(0, 0, -5)), r: 15 },
          { pos: add(lerp3(torso.rSh, rArm.elbow, 0.5), v3(0, 0, -5)), r: 15 }
        ]
      };
    }
  },

  // 25. PATADA DE TRÍCEPS CON MANCUERNA
  tricep_kickback: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Codo a 90°', 'Extensión atrás', 'Aprieta tríceps 1s', 'Retorno controlado'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Codo alto fijo al torso • Extiende antebrazo atrás' },
      { label: 'Posterior', cam: 'back', cue: 'Brazo paralelo al costado sin abrirse' },
      { label: 'Superior', cam: 'top', cue: 'Torso estable sin balancear hombros' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const pelvis = v3(0, 84, -14);
      const a = deg(26);
      const shMid = add(pelvis, v3(0, Math.sin(a) * BONES.TORSO, Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.cos(a), Math.sin(a)));
      const { lLeg, rLeg } = standingLegs(torso, 12, 10, -18);

      // Húmero fijo alto junto a la espalda
      const lEl = add(torso.lSh, v3(2, -4, -BONES.UPPER_ARM + 1));
      const rEl = add(torso.rSh, v3(-2, -4, -BONES.UPPER_ARM + 1));
      const fAng = deg(lerp(-85, 10, p)); // -85° colgando -> +10° extendido horizontal atrás
      const lHand = add(lEl, v3(0, Math.sin(fAng) * BONES.FOREARM, -Math.cos(fAng) * BONES.FOREARM));
      const rHand = add(rEl, v3(0, Math.sin(fAng) * BONES.FOREARM, -Math.cos(fAng) * BONES.FOREARM));

      return {
        floorY: 0,
        torso, lLeg, rLeg,
        lArm: { elbow: lEl, hand: lHand },
        rArm: { elbow: rEl, hand: rHand },
        dumbbells: [
          { pos: lHand, axis: v3(0, Math.cos(fAng), Math.sin(fAng)) },
          { pos: rHand, axis: v3(0, Math.cos(fAng), Math.sin(fAng)) }
        ],
        glows: [
          { pos: add(lerp3(torso.lSh, lEl, 0.5), v3(0, 5, 0)), r: 15 },
          { pos: add(lerp3(torso.rSh, rEl, 0.5), v3(0, 5, 0)), r: 15 }
        ]
      };
    }
  },

  // 26. COLGADAS ESCAPULARES EN BARRA (Calentamiento Día 1)
  scapular_hang: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Colgado pasivo', 'Depresión escapular', 'Hombros abajo 1s', 'Relaja controlado'],
    views: [
      { label: 'Posterior', cam: 'back', cue: 'Codos 100% bloqueados • Baja y junta escápulas' },
      { label: 'Frontal', cam: 'front', cue: 'Aleja los hombros de las orejas sin doblar codos' },
      { label: 'Lateral', cam: 'side', cue: 'Pecho se eleva ligeramente con brazos totalmente rectos' }
    ],
    trackPaths: [(s) => s.torso.shMid],
    pose(p) {
      const barY = 214;
      const gripX = 24;
      // Brazos 100% rectos colgados de la barra: la articulación del hombro permanece fija y la caja torácica/cabeza sube por depresión escapular
      const armTotal = BONES.UPPER_ARM + BONES.FOREARM - 0.2;
      const dx = gripX - BONES.SHOULDER_HALF;
      const dy = Math.sqrt(armTotal * armTotal - dx * dx);
      const socketY = barY - dy; // ~157.5 cm

      const dep = lerp(0, 9.5, p); // depresión escapular pura (~9.5 cm)
      const torsoTopY = socketY - 3 + dep;
      const pelvis = v3(0, torsoTopY - BONES.TORSO, 0);
      const torso = buildTorsoFrame(pelvis, v3(0, torsoTopY, 0), v3(0, 0, 1));
      torso.head = v3(0, torsoTopY + 13 + dep * 0.35, 1);

      const lLeg = solveLeg(torso.lHip, add(torso.lHip, v3(0, -78, -6)), v3(0, 0, 1), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, add(torso.rHip, v3(0, -78, -6)), v3(0, 0, 1), { customFoot: makeHangingFoot });

      const lSocket = v3(BONES.SHOULDER_HALF, socketY, 0);
      const rSocket = v3(-BONES.SHOULDER_HALF, socketY, 0);
      const lDir = norm(sub(v3(gripX, barY, 0), lSocket));
      const rDir = norm(sub(v3(-gripX, barY, 0), rSocket));
      const lArm = {
        elbow: add(lSocket, mul(lDir, BONES.UPPER_ARM)),
        hand: add(lSocket, mul(lDir, BONES.UPPER_ARM + BONES.FOREARM))
      };
      const rArm = {
        elbow: add(rSocket, mul(rDir, BONES.UPPER_ARM)),
        hand: add(rSocket, mul(rDir, BONES.UPPER_ARM + BONES.FOREARM))
      };

      return {
        floorY: 20,
        bar: { y: barY, z: 0, halfW: 62 },
        torso, lLeg, rLeg, lArm, rArm,
        lArmOrigin: lSocket,
        rArmOrigin: rSocket,
        glows: [
          { pos: add(torso.shMid, v3(10, -8, -5)), r: 15 },
          { pos: add(torso.shMid, v3(-10, -8, -5)), r: 15 }
        ]
      };
    }
  },

  // 27. DISLOCACIONES / PASES CON BANDA (Calentamiento Días 1 & 4)
  band_dislocation: {
    topMode: 'faceUp',
    eccentricFirst: false,
    phaseLabels: ['Banda al frente', 'Pase sobre cabeza', 'Detrás de la espalda', 'Retorno al frente'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Brazos estirados • Rota hombros en arco amplio sin dolor' },
      { label: 'Frontal', cam: 'front', cue: 'Agarre ancho con tensión ligera y abdomen firme' },
      { label: 'Superior', cam: 'top', cue: 'Abre más el agarre si sientes rigidez arriba' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const pelvis = v3(0, 90, 0);
      const shMid = v3(0, 138, 0);
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, 0, 1));
      const { lLeg, rLeg } = standingLegs(torso, 12, 0, 0);

      // Arco completo de 210° sobre la cabeza con brazos rectos y agarre ancho
      const arc = deg(lerp(-52, 232, p)); // -52° abajo-frente -> +90° arriba -> +232° abajo-espalda
      const radius = 50;
      const spreadX = 42;
      const lHandT = add(torso.lSh, v3(spreadX - BONES.SHOULDER_HALF, Math.sin(arc) * radius, Math.cos(arc) * radius));
      const rHandT = add(torso.rSh, v3(-(spreadX - BONES.SHOULDER_HALF), Math.sin(arc) * radius, Math.cos(arc) * radius));

      const lArm = solveArm(torso.lSh, lHandT, v3(0.4, 0, 0.2));
      const rArm = solveArm(torso.rSh, rHandT, v3(-0.4, 0, 0.2));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        bands: [{ points: [lArm.hand, rArm.hand] }],
        glows: [
          { pos: torso.lSh, r: 15 },
          { pos: torso.rSh, r: 15 }
        ]
      };
    }
  },

  // 28. ZANCADA ATRÁS / ZANCADA CON ROTACIÓN
  lunge_rotation: {
    topMode: 'faceUp',
    eccentricFirst: true,
    phaseLabels: ['De pie', 'Zancada controlada', 'Rodilla cerca del suelo', 'Regreso arriba'],
    views: [
      { label: 'Lateral', cam: 'side', cue: 'Paso largo atrás • Ambas rodillas cerca de 90°' },
      { label: 'Frontal', cam: 'front', cue: 'Mantén separación al ancho de cadera para equilibrio' },
      { label: 'Superior', cam: 'top', cue: 'Torso estable y rodilla delantera alineada' }
    ],
    trackPaths: [(s) => s.torso.pelvis],
    pose(p) {
      const pelvY = lerp(89, 51, p);
      const pelvZ = lerp(0, -4, p);
      const lean = deg(lerp(4, 11, p));
      const pelvis = v3(0, pelvY, pelvZ);
      const shMid = add(pelvis, v3(0, Math.cos(lean) * BONES.TORSO, Math.sin(lean) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, -Math.sin(lean), Math.cos(lean)));

      // Pie delantero (+X) firme adelante; pie trasero (-X) da paso atrás sobre el metatarso
      const frontZ = lerp(4, 30, p);
      const backZ = lerp(-4, -44, p);
      const lLeg = solveLeg(torso.lHip, v3(12, BONES.ANKLE_H, frontZ), v3(0.05, 0.1, 1));
      const rLeg = solveLeg(torso.rHip, v3(-12, lerp(BONES.ANKLE_H, 10, p), backZ), v3(-0.05, -0.3, 1), {
        customFoot: (ank) => ({
          ankle: ank,
          heel: v3(ank.x, lerp(0, 12, p), ank.z - 6),
          toe: v3(ank.x, 0, ank.z + 14)
        })
      });

      const lArm = solveArm(torso.lSh, add(torso.lSh, v3(5, -54, 2)), v3(0.3, 0, -0.8));
      const rArm = solveArm(torso.rSh, add(torso.rSh, v3(-5, -54, 2)), v3(-0.3, 0, -0.8));

      return {
        floorY: 0,
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0, 0, 1) },
          { pos: rArm.hand, axis: v3(0, 0, 1) }
        ],
        glows: [
          { pos: lerp3(torso.lHip, lLeg.knee, 0.5), r: 17 },
          { pos: add(torso.lHip, v3(0, 0, -5)), r: 15 }
        ]
      };
    }
  },

  // =========================================================================
  // 4 ARQUETIPOS EN BANCO DECLINADO (−18°)
  // =========================================================================

  // 29. PRESS DECLINADO CON MANCUERNAS (−18°)
  decline_press: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Abajo pecho inferior', 'Empuje vertical', 'Extensión arriba', 'Descenso controlado'],
    views: [
      { label: 'Lateral (−18°)', cam: 'side', cue: 'Antebrazos verticales • Empuja recto arriba' },
      { label: 'Frontal', cam: 'front', cue: 'Sube convergiendo sobre el pecho inferior' },
      { label: 'Superior', cam: 'top', cue: 'Codos a ~45° del torso • Hombros cómodos' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(18);
      const pelvis = v3(0, 54, 0);
      const shMid = add(pelvis, v3(0, -Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), -Math.sin(a)));

      // Piernas enganchadas en los rodillos del extremo alto del banco declinado
      const lLeg = solveLeg(torso.lHip, v3(12, 23, 42), v3(0.05, 1, 0.25), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, v3(-12, 23, 42), v3(-0.05, 1, 0.25), { customFoot: makeHangingFoot });

      const hx = lerp(31, 15, p);
      const hy = lerp(49, 93, p);
      const hz = lerp(-34, -36, p);

      const lArm = solveArm(torso.lSh, v3(hx, hy, hz), v3(0.72, -0.75, 0.62));
      const rArm = solveArm(torso.rSh, v3(-hx, hy, hz), v3(-0.72, -0.75, 0.62));

      return {
        floorY: 0,
        bench: { kind: 'decline', pivotZ: 22, backAngleDeg: 18, backLen: 86, height: 54 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: v3(0.95, 0, -0.28) },
          { pos: rArm.hand, axis: v3(0.95, 0, 0.28) }
        ],
        glows: [
          { pos: add(lerp3(torso.pelvis, torso.shMid, 0.72), v3(9, 4, 0)), r: 17 },
          { pos: add(lerp3(torso.pelvis, torso.shMid, 0.72), v3(-9, 4, 0)), r: 17 }
        ]
      };
    }
  },

  // 30. APERTURAS DECLINADAS CON MANCUERNAS (−18°)
  decline_fly: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Estiramiento abierto', 'Cierre en abrazo', 'Aprieta pecho inferior', 'Apertura controlada'],
    views: [
      { label: 'Lateral (−18°)', cam: 'side', cue: 'Codos semiflexionados fijos (~18°) en el arco' },
      { label: 'Frontal', cam: 'front', cue: 'Abre controlado y cierra sobre el pecho bajo' },
      { label: 'Superior', cam: 'top', cue: 'Trayectoria semicircular estable sin bajar de más' }
    ],
    trackPaths: [(s) => s.lArm.hand, (s) => s.rArm.hand],
    pose(p) {
      const a = deg(18);
      const pelvis = v3(0, 54, 0);
      const shMid = add(pelvis, v3(0, -Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), -Math.sin(a)));

      const lLeg = solveLeg(torso.lHip, v3(12, 23, 42), v3(0.05, 1, 0.25), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, v3(-12, 23, 42), v3(-0.05, 1, 0.25), { customFoot: makeHangingFoot });

      const reach = 53.5;
      const openAng = deg(lerp(76, 13, p));
      const lHandT = add(torso.lSh, v3(Math.sin(openAng) * reach, Math.cos(openAng) * reach, 10));
      const rHandT = add(torso.rSh, v3(-Math.sin(openAng) * reach, Math.cos(openAng) * reach, 10));

      const lArm = solveArm(torso.lSh, lHandT, v3(0.55, -0.55, 0.45));
      const rArm = solveArm(torso.rSh, rHandT, v3(-0.55, -0.55, 0.45));

      return {
        floorY: 0,
        bench: { kind: 'decline', pivotZ: 22, backAngleDeg: 18, backLen: 86, height: 54 },
        torso, lLeg, rLeg, lArm, rArm,
        dumbbells: [
          { pos: lArm.hand, axis: torso.up },
          { pos: rArm.hand, axis: torso.up }
        ],
        glows: [
          { pos: add(lerp3(torso.pelvis, torso.shMid, 0.72), v3(9, 4, 0)), r: 17 },
          { pos: add(lerp3(torso.pelvis, torso.shMid, 0.72), v3(-9, 4, 0)), r: 17 }
        ]
      };
    }
  },

  // 31. PRESS FRANCÉS DECLINADO CON MANCUERNAS (−18°)
  decline_french_press: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Estiramiento profundo', 'Extensión de codos', 'Contracción tríceps', 'Bajada controlada'],
    views: [
      { label: 'Lateral (−18°)', cam: 'side', cue: 'Mayor estiramiento de cabeza larga • Húmero fijo' },
      { label: 'Frontal', cam: 'front', cue: 'Codos paralelos sin abrirse hacia los lados' },
      { label: 'Superior', cam: 'top', cue: 'Mancuernas bajan controladas a lados de la cabeza' }
    ],
    trackPaths: [(s) => s.lArm.hand],
    pose(p) {
      const a = deg(18);
      const pelvis = v3(0, 54, 0);
      const shMid = add(pelvis, v3(0, -Math.sin(a) * BONES.TORSO, -Math.cos(a) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(a), -Math.sin(a)));

      const lLeg = solveLeg(torso.lHip, v3(12, 23, 42), v3(0.05, 1, 0.25), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, v3(-12, 23, 42), v3(-0.05, 1, 0.25), { customFoot: makeHangingFoot });

      const humTilt = deg(14);
      const lEl = add(torso.lSh, v3(-1, Math.cos(humTilt) * BONES.UPPER_ARM, -Math.sin(humTilt) * BONES.UPPER_ARM));
      const rEl = add(torso.rSh, v3(1, Math.cos(humTilt) * BONES.UPPER_ARM, -Math.sin(humTilt) * BONES.UPPER_ARM));

      const fAng = deg(lerp(-140, -14, p));
      const lHand = add(lEl, v3(0, Math.cos(fAng) * BONES.FOREARM, Math.sin(fAng) * BONES.FOREARM));
      const rHand = add(rEl, v3(0, Math.cos(fAng) * BONES.FOREARM, Math.sin(fAng) * BONES.FOREARM));
      const dbAxis = v3(0, -Math.sin(fAng), Math.cos(fAng));

      return {
        floorY: 0,
        bench: { kind: 'decline', pivotZ: 22, backAngleDeg: 18, backLen: 86, height: 54 },
        torso, lLeg, rLeg,
        lArm: { elbow: lEl, hand: lHand },
        rArm: { elbow: rEl, hand: rHand },
        dumbbells: [
          { pos: lHand, axis: dbAxis },
          { pos: rHand, axis: dbAxis }
        ],
        glows: [
          { pos: add(lerp3(torso.lSh, lEl, 0.5), v3(0, 0, -5)), r: 15 },
          { pos: add(lerp3(torso.rSh, rEl, 0.5), v3(0, 0, -5)), r: 15 }
        ]
      };
    }
  },

  // 32. CRUNCH DECLINADO EN BANCO (CORE / ABDOMEN)
  decline_crunch: {
    topMode: 'headTop',
    eccentricFirst: false,
    phaseLabels: ['Espalda apoyada', 'Flexión abdominal', 'Aprieta abdomen 1s', 'Descenso lento'],
    views: [
      { label: 'Lateral (−18°)', cam: 'side', cue: 'Enrolla costillas hacia pelvis sin dar tirones' },
      { label: 'Frontal', cam: 'front', cue: 'Manos al pecho • Sube simétrico y controlado' },
      { label: 'Superior', cam: 'top', cue: 'Tobillos firmes en rodillos • Cuello neutro' }
    ],
    trackPaths: [(s) => s.torso.shMid],
    pose(p) {
      const pelvis = v3(0, 54, 0);
      // El torso pivota en flexión controlada de −18° (apoyado) a +34° (contracción abdominal)
      const pitch = deg(lerp(-18, 34, p));
      const shMid = add(pelvis, v3(0, Math.sin(pitch) * BONES.TORSO, -Math.cos(pitch) * BONES.TORSO));
      const torso = buildTorsoFrame(pelvis, shMid, v3(0, Math.cos(pitch), Math.sin(pitch)));

      const lLeg = solveLeg(torso.lHip, v3(12, 23, 42), v3(0.05, 1, 0.25), { customFoot: makeHangingFoot });
      const rLeg = solveLeg(torso.rHip, v3(-12, 23, 42), v3(-0.05, 1, 0.25), { customFoot: makeHangingFoot });

      // Manos cruzadas/apoyadas sobre el pecho (sin jalar el cuello!)
      const chestCenter = add(lerp3(torso.pelvis, torso.shMid, 0.78), mul(torso.fwd, 9));
      const lArm = solveArm(torso.lSh, add(chestCenter, v3(-4, 0, 0)), add(mul(torso.left, 0.7), mul(torso.up, -0.7)));
      const rArm = solveArm(torso.rSh, add(chestCenter, v3(4, 0, 0)), add(mul(torso.left, -0.7), mul(torso.up, -0.7)));

      return {
        floorY: 0,
        bench: { kind: 'decline', pivotZ: 22, backAngleDeg: 18, backLen: 86, height: 54 },
        torso, lLeg, rLeg, lArm, rArm,
        glows: [
          { pos: add(lerp3(torso.pelvis, torso.shMid, 0.42), mul(torso.fwd, 5)), r: 19 }
        ]
      };
    }
  }
};
