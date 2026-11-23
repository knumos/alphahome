/**
 * AlphaHome — Adaptar una rutina al equipo y al espacio SIN tocar el historial.
 * Solo propone cambios. Quien llama decide si los aplica.
 */

import { CATALOG_BY_NAME } from '../data/catalog.js';

function norm(name) {
  return String(name || '').trim().toLowerCase();
}

export function resolveSpace(equipment, space) {
  if (space && typeof space === 'object') return space;
  if (equipment?.space && typeof equipment.space === 'object') return equipment.space;
  return {
    hasRoom: true,
    roomWidthM: 0,
    roomLengthM: 0,
    hasHallway: false,
    hallwayLengthM: 0,
    hallwayWidthM: 0
  };
}

function hasBands(equipment) {
  return Boolean(equipment?.hasBands) || Number(equipment?.bandCount) > 0;
}

/**
 * Requisitos de un movimiento. Si el nombre no está en el catálogo,
 * solo se restringe cuando el texto pide barra, declinado, pasillo o cinturón.
 */
export function movementNeeds(name) {
  const cat = CATALOG_BY_NAME.get(norm(name));
  if (cat?.needs) {
    return {
      ...cat.needs,
      hallway: cat.spaceNeed === 'hallway' || Boolean(cat.needs.hallway)
    };
  }
  const n = norm(name);
  const needs = {
    bench: false,
    decline: false,
    bar: false,
    bands: false,
    belt: false,
    dumbbell: false,
    hallway: false
  };
  if (/dominada|colgadas escapulares|face pull con banda en barra|extensi[oó]n de tr[ií]ceps con banda en barra|jal[oó]n con banda en barra/.test(n)) {
    needs.bar = true;
  }
  if (/declin/.test(n)) needs.decline = true;
  if (/caminando|paseo del granjero|gateo del oso/.test(n)) needs.hallway = true;
  if (/curl con cadena|cadena ligera/.test(n)) needs.belt = true;
  if (/banda/.test(n) && !needs.bar) needs.bands = true;
  const any = Object.values(needs).some(Boolean);
  return any ? needs : null;
}

export function movementFits(name, equipment, space) {
  const needs = movementNeeds(name);
  if (!needs) return true;
  const eq = equipment || {};
  const sp = resolveSpace(eq, space);
  if (needs.hallway && !sp.hasHallway) return false;
  if (needs.bar && !eq.hasPullupBar) return false;
  if (needs.decline && !eq.hasDeclineBench) return false;
  if (needs.bench && !eq.hasBench) return false;
  if (needs.bands && !hasBands(eq)) return false;
  if (needs.belt && !eq.hasWeightBelt) return false;
  if (needs.dumbbell && !(Number(eq.maxDumbbellKg) > 0)) return false;
  return true;
}

function unmetReasons(name, equipment, space) {
  const needs = movementNeeds(name);
  if (!needs) return [];
  const eq = equipment || {};
  const sp = resolveSpace(eq, space);
  const reasons = [];
  if (needs.hallway && !sp.hasHallway) reasons.push('sin pasillo');
  if (needs.bar && !eq.hasPullupBar) reasons.push('sin barra');
  if (needs.decline && !eq.hasDeclineBench) reasons.push('sin banco declinado');
  if (needs.bench && !eq.hasBench) reasons.push('sin banco');
  if (needs.bands && !hasBands(eq)) reasons.push('sin bandas');
  if (needs.belt && !eq.hasWeightBelt) reasons.push('sin cinturón');
  if (needs.dumbbell && !(Number(eq.maxDumbbellKg) > 0)) reasons.push('sin mancuernas');
  return reasons;
}

function dayHasRow(names) {
  for (const name of names) {
    if (String(name).includes('remo')) return true;
  }
  return false;
}

function candidatesFor(name, equipment, space, dayNames) {
  const n = norm(name);
  const reasons = unmetReasons(name, equipment, space);
  const list = [];
  const push = (...names) => {
    for (const item of names) {
      if (item && !list.includes(item)) list.push(item);
    }
  };

  if (reasons.includes('sin barra')) {
    if (/dominada/.test(n) && !/supina/.test(n)) {
      push(dayHasRow(dayNames) ? 'Pullover con Mancuerna en Banco' : 'Remo Pecho Apoyado en Banco', 'Pullover con Mancuerna en Banco', 'Remo con Banda');
    } else if (/supina/.test(n)) {
      push(dayHasRow(dayNames) ? 'Pullover con Mancuerna en Banco' : 'Remo Serrucho a un Brazo en Banco', 'Pullover con Mancuerna en Banco', 'Remo con Banda');
    } else if (/face pull/.test(n)) {
      push('Pájaros Sentado en Banco', 'Face Pull con Banda (sin barra)');
    } else if (/tr[ií]ceps/.test(n)) {
      push('Copa de Tríceps con Mancuerna', 'Press Francés con Mancuernas en Banco');
    } else if (/jal[oó]n|pulldown/.test(n)) {
      push('Pullover con Mancuerna en Banco', 'Remo con Banda');
    } else if (/colgada/.test(n)) {
      push(hasBands(equipment) ? 'Dislocaciones / Pases con Banda' : 'Círculos de hombro y retracciones escapulares');
    }
  }

  if (reasons.includes('sin banco declinado')) {
    if (/franc/.test(n)) push('Press Francés con Mancuernas en Banco', 'Copa de Tríceps con Mancuerna');
    else if (/apertura/.test(n)) push('Aperturas Inclinadas con Mancuernas', 'Aperturas con Banda de Resistencia');
    else if (/crunch|abdom/.test(n)) push('Plancha Frontal', 'Plancha Lateral');
    else if (/press/.test(n)) push('Press Plano con Mancuernas', 'Flexiones en Suelo');
  }

  if (reasons.includes('sin pasillo')) {
    if (/granjero|gateo|del oso/.test(n)) return [];
    if (/zancada|caminando/.test(n)) push('Zancadas Atrás con Mancuernas');
  }

  if (reasons.includes('sin cinturón')) {
    push('Curl Martillo con Mancuernas', 'Curl Inclinado en Banco 45°');
  }

  if (reasons.includes('sin banco')) {
    if (/remo/.test(n)) push('Remo con Banda');
    if (/press|apertura|fondo/.test(n)) push('Flexiones en Suelo');
    if (/hip thrust/.test(n)) push('Puente de Glúteo en Suelo');
    if (/b[uú]lgara/.test(n)) push('Zancadas Atrás con Mancuernas');
    if (/curl inclinado/.test(n)) push('Curl Martillo con Mancuernas');
    if (/franc|pájaro|pajaro/.test(n)) push('Copa de Tríceps con Mancuerna', 'Face Pull con Banda (sin barra)');
    if (/pullover|crunch declinado/.test(n)) push('Plancha Frontal');
  }

  const cat = CATALOG_BY_NAME.get(n);
  if (cat?.alternatives) push(...cat.alternatives);
  if (reasons.includes('sin bandas')) {
    push('Plancha Frontal', 'Copa de Tríceps con Mancuerna', 'Aperturas Inclinadas con Mancuernas');
  }
  return list;
}

function materialize(prev, name) {
  const cat = CATALOG_BY_NAME.get(norm(name));
  if (!cat) {
    return {
      ...prev,
      name,
      note: prev.note || ''
    };
  }
  return {
    ...prev,
    name: cat.name,
    equipment: cat.equipment,
    bilateral: cat.bilateral,
    stepKg: cat.equipment === 'dumbbell' ? (prev.stepKg || cat.stepKg) : cat.stepKg,
    note: cat.note || '',
    alternatives: [...(cat.alternatives || [])]
  };
}

function chooseReplacement(name, equipment, space, taken, dayNames) {
  const options = candidatesFor(name, equipment, space, dayNames || taken);
  for (const candidate of options) {
    if (taken.has(norm(candidate))) continue;
    if (!movementFits(candidate, equipment, space)) continue;
    return candidate;
  }
  return null;
}

function adaptWarmupItem(item, equipment, space) {
  if (movementFits(item.name, equipment, space)) {
    if (!equipment?.hasDeclineBench && /press declinado/i.test(item.tip || '')) {
      return {
        item: {
          ...item,
          tip: String(item.tip).replace(/Press Declinado/gi, 'Press Plano')
        },
        change: {
          kind: 'warmup',
          from: 'Serie de aproximación en declinado',
          to: 'Press Plano',
          reason: 'sin banco declinado'
        }
      };
    }
    return { item, change: null };
  }

  const replacement = chooseReplacement(item.name, equipment, space, new Set());
  if (!replacement) {
    return {
      item: null,
      change: { kind: 'remove', from: item.name, to: null, reason: unmetReasons(item.name, equipment, space).join(', ') || 'no cabe en tu equipo' }
    };
  }
  return {
    item: { ...item, name: replacement },
    change: {
      kind: 'warmup',
      from: item.name,
      to: replacement,
      reason: unmetReasons(item.name, equipment, space).join(', ')
    }
  };
}

/**
 * Devuelve una copia de la rutina y la lista de cambios. No muta la entrada.
 */
export function planRoutineAdaptation(routines, equipment, space) {
  const changes = [];
  const next = (routines || []).map((day) => {
    const taken = new Set();
    const dayNames = new Set((day.exercises || []).map((item) => norm(item.name)));
    const exercises = [];
    for (const ex of day.exercises || []) {
      if (movementFits(ex.name, equipment, space)) {
        exercises.push({ ...ex });
        taken.add(norm(ex.name));
        continue;
      }
      const replacement = chooseReplacement(ex.name, equipment, space, taken, dayNames);
      const reason = unmetReasons(ex.name, equipment, space).join(', ') || 'no cabe en tu equipo';
      if (!replacement) {
        changes.push({
          dayId: day.id,
          dayName: day.name,
          kind: 'remove',
          from: ex.name,
          to: null,
          reason
        });
        continue;
      }
      exercises.push(materialize(ex, replacement));
      taken.add(norm(replacement));
      changes.push({
        dayId: day.id,
        dayName: day.name,
        kind: 'swap',
        from: ex.name,
        to: replacement,
        reason
      });
    }

    const warmup = [];
    for (const item of day.warmup || []) {
      const result = adaptWarmupItem(item, equipment, space);
      if (result.change) {
        changes.push({ dayId: day.id, dayName: day.name, ...result.change });
      }
      if (result.item) warmup.push(result.item);
    }

    return { ...day, exercises, warmup };
  });

  return { routines: next, changes };
}

export function adaptationKey(changes) {
  return (changes || []).map((c) => `${c.dayId || ''}:${c.from}->${c.to || '∅'}`).join('|');
}
