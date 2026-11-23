/**
 * AlphaHome — Motor de Progresión Inteligente, Métricas de Volumen y Peso Corporal
 *
 * - Doble progresión dentro del tope de mancuerna y del salto configurado (0.5 o 1 kg).
 * - Chaleco (mods.vest) suma el kg fijo del chaleco.
 * - Cinturón (mods.belt): la carga añadida es la mancuerna colgada, nunca el peso de la cadena.
 * - Bandas avanzan de banda en banda según bandCount.
 * - El bloque de vuelta (returningFromBreak) baja series y RIR y no sube kilos.
 */

import { getExerciseRole } from '../data/catalog.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getSortedWeightLogsDesc(state) {
  const logs = (state.bodyMetrics && Array.isArray(state.bodyMetrics.logs))
    ? [...state.bodyMetrics.logs]
    : [];
  return logs.sort((a, b) => {
    if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
    return String(b.id).localeCompare(String(a.id));
  });
}

export function getCurrentBodyWeight(state) {
  const sorted = getSortedWeightLogsDesc(state);
  return sorted.length ? Number(sorted[0].weight) : null;
}

export function getInitialBodyWeight(state) {
  const sorted = getSortedWeightLogsDesc(state);
  return sorted.length ? Number(sorted[sorted.length - 1].weight) : null;
}

/**
 * Agrupa pesajes del mismo día en un promedio diario cronológico (antiguo -> reciente).
 */
export function getDailyWeightSeries(state) {
  const sortedAsc = [...getSortedWeightLogsDesc(state)].reverse();
  const byDate = new Map();
  for (const item of sortedAsc) {
    const key = String(item.date || '').slice(0, 10);
    if (!key) continue;
    if (!byDate.has(key)) byDate.set(key, { sum: 0, count: 0, date: key });
    const entry = byDate.get(key);
    entry.sum += Number(item.weight);
    entry.count += 1;
  }
  return Array.from(byDate.values()).map((d) => ({
    date: d.date,
    weight: Math.round((d.sum / d.count) * 100) / 100,
    ms: new Date(d.date + 'T12:00:00').getTime()
  }));
}

export function get7DayMovingAverageWeight(state) {
  const daily = getDailyWeightSeries(state);
  if (!daily.length) return null;
  const latestMs = daily[daily.length - 1].ms;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recent = daily.filter((d) => (latestMs - d.ms) >= 0 && (latestMs - d.ms) <= sevenDaysMs);
  const pool = recent.length ? recent : daily.slice(-7);
  return pool.reduce((sum, d) => sum + d.weight, 0) / pool.length;
}

export function calculateBMI(weightKg, heightMeters) {
  if (!weightKg || !heightMeters) return null;
  const h = Number(heightMeters) || 1.70;
  const bmi = weightKg / (h * h);
  let category = 'Normal';
  let tone = 'emerald';
  if (bmi < 18.5) { category = 'Bajo peso'; tone = 'accent'; }
  else if (bmi < 25) { category = 'Normal'; tone = 'emerald'; }
  else if (bmi < 30) { category = 'Sobrepeso'; tone = 'amber'; }
  else { category = 'Obesidad'; tone = 'rose'; }
  return { value: bmi, category, tone };
}

export function getVestWeightKg(state) {
  if (!state.equipment || !state.equipment.hasVest) return 0;
  return Math.max(1, Number(state.equipment.vestKg) || 10);
}

function countSessionsSince(state, startedAt) {
  return (state?.history || []).filter((session) => {
    const t = new Date(session?.date).getTime();
    return Number.isFinite(t) && t >= startedAt;
  }).length;
}

/**
 * Semanas 1-2: 2 series en básicos y aislamiento, RIR 3-4, sin subir carga.
 * Semana 3: vuelve la 3.ª serie de básicos, RIR 2-3, todavía sin subir kilos.
 * Semana 4+: plan completo, solo si ya pasaron 21 días y al menos dos microciclos.
 */
export function getReturnBlock(state, now = Date.now()) {
  const settings = state?.settings || {};
  if (!settings.returningFromBreak) {
    return { active: false, completed: false, week: 0, phase: 'off', sessions: 0, startedAt: null, daysPerWeek: 4 };
  }
  const startedAt = Number(settings.returnBlockStartedAt) > 0 ? Number(settings.returnBlockStartedAt) : now;
  const elapsed = Math.max(0, now - startedAt);
  const timeWeek = Math.floor(elapsed / WEEK_MS) + 1;
  const daysPerWeek = state?.profile?.daysPerWeek === 3 ? 3 : 4;
  const sessions = countSessionsSince(state, startedAt);
  const base = { sessions, startedAt, timeWeek, daysPerWeek, completed: false };

  if (timeWeek >= 4 && sessions >= daysPerWeek * 2) {
    return { ...base, active: false, completed: true, week: 4, phase: 'full' };
  }
  if (timeWeek >= 3 && sessions >= daysPerWeek) {
    return { ...base, active: true, week: 3, phase: 'week3', targetRir: '2-3', suggestedRir: 3 };
  }
  const week = timeWeek >= 2 && sessions >= 1 ? 2 : 1;
  return { ...base, active: true, week, phase: 'weeks12', targetRir: '3-4', suggestedRir: 4 };
}

export function describeReturnBlock(block) {
  if (!block?.active) return null;
  if (block.phase === 'week3') {
    return {
      title: 'Vuelta al entrenamiento · Semana 3',
      detail: 'Regresa la 3.ª serie en los básicos. RIR 2-3 y todavía sin subir kilos.'
    };
  }
  return {
    title: `Vuelta al entrenamiento · Semana ${block.week}`,
    detail: `Básicos y aislamiento a 1-2 series, RIR 3-4, sin subir carga. ${block.sessions} sesión${block.sessions === 1 ? '' : 'es'} en el bloque.`
  };
}

/** Persiste el inicio y el fin del bloque. `completed` solo cuando ya toca el plan completo. */
export function advanceReturnBlock(state, now = Date.now()) {
  const result = { changed: false, completed: false };
  if (!state?.settings) return result;
  if (state.settings.returningFromBreak && !(Number(state.settings.returnBlockStartedAt) > 0)) {
    state.settings.returnBlockStartedAt = now;
    result.changed = true;
  }
  const block = getReturnBlock(state, now);
  if (block.completed && state.settings.returningFromBreak) {
    state.settings.returningFromBreak = false;
    state.settings.readaptationMode = false;
    result.changed = true;
    result.completed = true;
  }
  return result;
}

export function getWorkingSetCount(exercise, state, now = Date.now()) {
  const planned = Math.max(1, Math.min(12, Number(exercise?.sets) || 1));
  const block = getReturnBlock(state, now);
  if (!block.active) return planned;
  if (block.phase === 'weeks12') return Math.max(1, Math.min(planned, 2));
  if (block.phase === 'week3' && getExerciseRole(exercise) === 'compound') {
    return Math.max(1, Math.min(planned, 3));
  }
  return planned;
}

/**
 * Busca el último registro histórico completado de un ejercicio por nombre exacto.
 */
export function getLastExerciseLog(exerciseName, state) {
  const hist = state.history || [];
  for (let i = 0; i < hist.length; i++) {
    const session = hist[i];
    const found = (session.exercises || []).find(
      (e) => e.name === exerciseName && Array.isArray(e.sets) && e.sets.some((s) => s.done)
    );
    if (found) {
      return {
        date: session.date,
        sets: found.sets.filter((s) => s.done)
      };
    }
  }
  return null;
}

function roundStep(val, step) {
  const s = Math.max(0.5, Number(step) || 1);
  return Math.round(val / s) * s;
}

function bandLevelOf(sets) {
  const levels = (sets || []).map((s) => Number(s.mods?.bandLevel) || 0).filter((n) => n > 0);
  return levels.length ? Math.max(...levels) : 1;
}

function beltDumbbellOf(sets) {
  const loads = (sets || []).filter((s) => s.mods?.belt).map((s) => Number(s.weight) || 0);
  return loads.length ? Math.max(...loads) : 0;
}

function holdDuringReturn(exercise, block, maxRawWeight, hadFailure, step, maxDb, avgReps, avgRir) {
  let weight = exercise.equipment === 'band' ? 0 : maxRawWeight;
  if (hadFailure && exercise.equipment === 'dumbbell' && weight > step) {
    weight = Math.max(step, roundStep(weight * 0.9, step));
  }
  if (exercise.equipment === 'dumbbell') weight = Math.min(maxDb, weight);
  let reps = Math.min(exercise.maxReps, Math.max(exercise.minReps, avgReps || exercise.minReps));
  if (block.phase === 'week3' && avgRir >= 3 && reps < exercise.maxReps) reps += 1;
  const prefix = exercise.equipment === 'band' || !(weight > 0) ? '' : `${weight} kg × `;
  return {
    summary: `${prefix}${reps} reps @ RIR ${block.targetRir}`,
    detail: block.phase === 'week3'
      ? 'Semana 3 de vuelta: puedes sumar una repetición limpia, pero no subas los kilos.'
      : 'Semanas 1-2 de vuelta: misma carga, RIR 3-4. Hoy no se suben kilos.',
    suggestedWeight: exercise.equipment === 'dumbbell' ? weight : (exercise.equipment === 'band' ? 0 : weight),
    suggestedReps: reps,
    suggestedRir: block.suggestedRir,
    badge: `Vuelta S${block.week}`,
    tone: 'amber'
  };
}

/**
 * Algoritmo de doble progresión, vuelta al entrenamiento y readaptación.
 */
export function calculateRecommendation(exercise, state, now = Date.now()) {
  const last = getLastExerciseLog(exercise.name, state);
  const block = getReturnBlock(state, now);
  const isReadapt = Boolean(state.settings?.readaptationMode) && !block.active;
  const eq = state.equipment || { maxDumbbellKg: 24, dumbbellStepKg: 2, hasVest: false, vestKg: 10, bandCount: 0 };
  const maxDb = Number(eq.maxDumbbellKg) || 24;
  const vestKg = getVestWeightKg(state);
  const step = Math.max(0.5, Number(exercise.stepKg) || Number(eq.dumbbellStepKg) || 1);
  const bandCount = Math.max(0, Number(eq.bandCount) || (eq.hasBands ? 1 : 0));
  const targetRirLabel = isReadapt ? '2-3' : '1-2';
  const repRangeText = exercise.minReps === exercise.maxReps
    ? `${exercise.minReps}`
    : `${exercise.minReps}-${exercise.maxReps}`;

  // Primera vez que se registra el ejercicio
  if (!last || last.sets.length === 0) {
    const defaultWeight = exercise.equipment === 'dumbbell' ? '' : 0;
    if (block.active) {
      return {
        summary: `Carga cómoda × ${repRangeText} reps @ RIR ${block.targetRir}`,
        detail: 'Bloque de vuelta: elige un peso fácil, deja 3-4 repeticiones en recámara y no busques subir kilos.',
        suggestedWeight: defaultWeight,
        suggestedReps: exercise.minReps,
        suggestedRir: block.suggestedRir,
        suggestedBandLevel: exercise.equipment === 'band' ? 1 : undefined,
        badge: `Vuelta S${block.week}`,
        tone: 'amber'
      };
    }
    if (isReadapt) {
      return {
        summary: `Carga cómoda × ${repRangeText} reps @ RIR 2-3`,
        detail: 'Fase de readaptación: elige un peso que controles con técnica limpia sin llegar al fallo.',
        suggestedWeight: defaultWeight,
        suggestedReps: exercise.minReps,
        suggestedRir: 3,
        badge: 'Readaptación',
        tone: 'amber'
      };
    }
    return {
      summary: `${repRangeText} reps @ RIR 1-2`,
      detail: 'Primera sesión registrada. Establece tu peso base dejando 1-2 repeticiones en recámara.',
      suggestedWeight: defaultWeight,
      suggestedReps: exercise.minReps,
      suggestedRir: 2,
      badge: 'Base Inicial',
      tone: 'accent'
    };
  }

  const sets = last.sets;
  const rawWeights = sets.map((s) => Number(s.weight) || 0);
  const maxRawWeight = Math.max(...rawWeights);
  const anyVest = sets.some((s) => Boolean(s.mods?.vest));
  const anyBelt = sets.some((s) => Boolean(s.mods?.belt));
  const anyPause = sets.some((s) => Boolean(s.mods?.pause));
  const anyBand = sets.some((s) => Boolean(s.mods?.band));
  const bandLevel = bandLevelOf(sets);
  const beltLoad = beltDumbbellOf(sets);

  const repsArr = sets.map((s) => Number(s.reps) || 0);
  const avgReps = Math.round(repsArr.reduce((a, b) => a + b, 0) / sets.length);
  const minAchievedReps = Math.min(...repsArr);

  const parsedRirs = sets.map((s) => {
    if (s.rir === '' || s.rir === null || s.rir === undefined) return 2;
    const n = Number(s.rir);
    return Number.isFinite(n) ? n : 2;
  });
  const avgRir = parsedRirs.reduce((a, b) => a + b, 0) / parsedRirs.length;
  const hadFailure = parsedRirs.some((r) => r === 0);
  const allReachedTop = repsArr.every((r) => r >= exercise.maxReps);

  if (block.active) {
    return holdDuringReturn(exercise, block, maxRawWeight, hadFailure, step, maxDb, avgReps, avgRir);
  }

  // ---- MODO READAPTACIÓN ----
  if (isReadapt) {
    if (hadFailure && exercise.equipment === 'dumbbell' && maxRawWeight > step) {
      const reduced = Math.max(step, roundStep(maxRawWeight * 0.9, step));
      return {
        summary: `${reduced} kg × ${repRangeText} reps @ RIR 2-3`,
        detail: 'Llegaste al fallo la sesión pasada. Baja ligeramente la carga en readaptación para cuidar articulaciones.',
        suggestedWeight: reduced,
        suggestedReps: exercise.minReps,
        suggestedRir: 3,
        badge: 'Readaptación',
        tone: 'amber'
      };
    }
    const nextReps = Math.min(exercise.maxReps, Math.max(exercise.minReps, avgReps + 1));
    const weightPrefix = exercise.equipment === 'band'
      ? ''
      : (maxRawWeight > 0 ? `${maxRawWeight} kg × ` : '');
    return {
      summary: `${weightPrefix}${nextReps} reps @ RIR 2-3`,
      detail: 'Mantén carga controlada y suma 1 rep limpia dejando 2-3 en recámara.',
      suggestedWeight: exercise.equipment === 'band' ? 0 : maxRawWeight,
      suggestedReps: nextReps,
      suggestedRir: 2,
      badge: 'Readaptación',
      tone: 'amber'
    };
  }

  // ---- MODO DOBLE PROGRESIÓN ----
  // Caso 1: Fallo por debajo del mínimo -> consolidar
  if (hadFailure && minAchievedReps < exercise.minReps) {
    const reduced = exercise.equipment === 'dumbbell' && maxRawWeight >= step * 2
      ? Math.max(step, roundStep(maxRawWeight - step, step))
      : maxRawWeight;
    return {
      summary: `${reduced > 0 && exercise.equipment !== 'band' ? reduced + ' kg × ' : ''}${exercise.minReps} reps @ RIR 1-2`,
      detail: 'RIR 0 por debajo del rango mínimo. Reduce ligeramente la intensidad para consolidar técnica.',
      suggestedWeight: exercise.equipment === 'band' ? 0 : reduced,
      suggestedReps: exercise.minReps,
      suggestedRir: 2,
      badge: 'Consolidar',
      tone: 'rose'
    };
  }

  // Caso 2: Alcanzó el tope de repeticiones con buen RIR (>= 1)
  if (allReachedTop && avgRir >= 1) {
    // 2A. Bandas: pasar a la siguiente banda del juego, nunca "+1 kg"
    if (exercise.equipment === 'band') {
      if (bandCount > 1 && bandLevel < bandCount) {
        const nextLevel = bandLevel + 1;
        return {
          summary: `Banda ${nextLevel} de ${bandCount} × ${exercise.minReps} reps @ RIR 1-2`,
          detail: `Completaste la banda ${bandLevel}. Pasa a la banda ${nextLevel} de ${bandCount} y reinicia en ${exercise.minReps} reps.`,
          suggestedWeight: 0,
          suggestedReps: exercise.minReps,
          suggestedRir: 2,
          suggestedBandLevel: nextLevel,
          badge: `Banda ${nextLevel}/${bandCount}`,
          tone: 'emerald'
        };
      }
      const tip = !anyPause
        ? 'Ya usas la banda más fuerte de tu juego. Aléjate del anclaje o agrega una pausa de 2s.'
        : 'Mantén la banda más fuerte y alarga la bajada a 3 segundos.';
      return {
        summary: `Banda ${Math.min(bandLevel, bandCount || bandLevel)} × ${exercise.minReps} reps @ RIR 1-2`,
        detail: `Dominaste ${exercise.maxReps} reps. ${tip}`,
        suggestedWeight: 0,
        suggestedReps: exercise.minReps,
        suggestedRir: 2,
        suggestedBandLevel: bandLevel,
        badge: 'Subir Tensión ↑',
        tone: 'emerald'
      };
    }

    // 2B. Mancuernas en el tope configurado por el usuario
    if (exercise.equipment === 'dumbbell' && maxRawWeight >= maxDb) {
      let overloadTip = eq.hasVest
        ? `Activa Chaleco +${vestKg}kg o añade Pausa 2s en el estiramiento`
        : 'Añade Pausa 2s abajo, tempo lento (3s bajada) o banda de resistencia';
      if (anyVest && !anyPause) overloadTip = `Mantén Chaleco +${vestKg}kg y agrega Pausa 2s abajo`;
      else if (anyPause && !anyBand && eq.hasBands) overloadTip = 'Combina con Banda de resistencia o pasa a variante unilateral';
      else if (anyPause) overloadTip = 'Aumenta tempo excéntrico a 3s o explora una variante más demandante';

      return {
        summary: `${maxDb} kg × ${repRangeText} reps + Sobrecarga`,
        detail: `¡Tope de ${maxDb} kg alcanzado! ${overloadTip} para seguir progresando en casa.`,
        suggestedWeight: maxDb,
        suggestedReps: exercise.minReps,
        suggestedRir: 1,
        badge: `Tope ${maxDb}kg ⚡`,
        tone: 'emerald'
      };
    }

    // 2C. Peso corporal: chaleco fijo, o mancuerna colgada del cinturón. La cadena no pesa.
    if (exercise.equipment === 'bodyweight') {
      if (!anyVest && eq.hasVest && maxRawWeight === 0 && !anyBelt) {
        return {
          summary: `Chaleco +${vestKg} kg × ${exercise.minReps} reps @ RIR 1-2`,
          detail: `Dominaste ${exercise.maxReps} reps. Activa el chaleco de ${vestKg} kg. Si no lo usas, cuelga una mancuerna del cinturón: la cadena no suma kilos.`,
          suggestedWeight: 0,
          suggestedReps: exercise.minReps,
          suggestedRir: 2,
          suggestedVest: true,
          badge: 'Chaleco ↑',
          tone: 'emerald'
        };
      }
      if (eq.hasWeightBelt) {
        const current = anyBelt ? beltLoad : 0;
        const nextDb = Math.min(maxDb, roundStep(current + step, step));
        if (!anyBelt || nextDb > current) {
          return {
            summary: `Cinturón + ${nextDb} kg × ${exercise.minReps} reps @ RIR 1-2`,
            detail: `La carga es la mancuerna colgada (${nextDb} kg, tope ${maxDb} kg). La cadena solo sujeta: no cuenta como peso.`,
            suggestedWeight: nextDb,
            suggestedReps: exercise.minReps,
            suggestedRir: 2,
            suggestedBelt: true,
            suggestedVest: anyVest,
            badge: 'Cinturón ↑',
            tone: 'emerald'
          };
        }
        return {
          summary: `Cinturón + ${maxDb} kg × ${repRangeText} + pausa`,
          detail: `La mancuerna del cinturón ya está en el tope de ${maxDb} kg. Agrega pausa o tempo; no inventes kilos de cadena.`,
          suggestedWeight: maxDb,
          suggestedReps: exercise.minReps,
          suggestedRir: 1,
          suggestedBelt: true,
          badge: `Tope ${maxDb}kg ⚡`,
          tone: 'emerald'
        };
      }
      const nextAdded = Math.min(maxDb, roundStep(maxRawWeight + step, step));
      return {
        summary: `+${nextAdded} kg × ${exercise.minReps} reps @ RIR 1-2`,
        detail: `Dominaste ${exercise.maxReps} reps. Suma lastre real (mancuerna o chaleco), nunca el peso de una cadena.`,
        suggestedWeight: nextAdded,
        suggestedReps: exercise.minReps,
        suggestedRir: 2,
        badge: 'Subir Lastre ↑',
        tone: 'emerald'
      };
    }

    // 2D. Subida estándar de mancuerna respetando tope configurado
    const nextWeight = Math.min(maxDb, roundStep(maxRawWeight + step, step));
    const realDelta = Math.round((nextWeight - maxRawWeight) * 10) / 10;
    return {
      summary: `${nextWeight} kg × ${exercise.minReps} reps @ RIR 1-2`,
      detail: `¡Superaste ${exercise.maxReps} reps con buen RIR! Sube +${realDelta} kg y reinicia en ${exercise.minReps} reps.`,
      suggestedWeight: nextWeight,
      suggestedReps: exercise.minReps,
      suggestedRir: 2,
      badge: `Subir +${realDelta}kg ↑`,
      tone: 'emerald'
    };
  }

  // Caso 3: Dentro del rango -> progresar repeticiones (+1 o +2)
  const repIncrement = avgRir >= 2.5 ? 2 : 1;
  const targetReps = Math.min(exercise.maxReps, Math.max(exercise.minReps, avgReps + repIncrement));
  const prefix = exercise.equipment === 'band'
    ? ''
    : (maxRawWeight > 0 ? `${maxRawWeight} kg × ` : '');
  return {
    summary: `${prefix}${targetReps} reps @ RIR ${targetRirLabel}`,
    detail: `Mantén la carga y busca +${repIncrement} rep${repIncrement > 1 ? 's' : ''} respecto a tu sesión anterior.`,
    suggestedWeight: exercise.equipment === 'band' ? 0 : maxRawWeight,
    suggestedReps: targetReps,
    suggestedRir: 1,
    badge: `+${repIncrement} Rep${repIncrement > 1 ? 's' : ''} →`,
    tone: 'accent'
  };
}

/**
 * Calcula el volumen real levantado (kg) contemplando peso corporal y mancuernas bilaterales.
 */
export function computeSetVolumeKg(setObj, exercise, state) {
  if (!setObj || !setObj.done) return 0;
  const reps = Number(setObj.reps) || 0;
  if (reps <= 0) return 0;

  const w = Number(setObj.weight) || 0;
  const vestBonus = setObj.mods?.vest ? getVestWeightKg(state) : 0;
  // mods.belt: `weight` ya es la mancuerna colgada. mods.chain no añade kilos.

  if (exercise.equipment === 'bodyweight') {
    const bw = getCurrentBodyWeight(state) || 0;
    return (bw + w + vestBonus) * reps;
  }
  if (exercise.equipment === 'dumbbell') {
    const mult = exercise.bilateral === false ? 1 : 2;
    return (w * mult + vestBonus) * reps;
  }
  // Banda: si el usuario anotó equivalencia manual o chaleco
  return (w + vestBonus) * reps;
}

export function computeWorkoutVolume(exercises, state) {
  let total = 0;
  for (const ex of exercises || []) {
    for (const s of ex.sets || []) {
      total += computeSetVolumeKg(s, ex, state);
    }
  }
  return Math.round(total);
}

export function calculateWeeklySessions(state) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (state.history || []).filter((h) => new Date(h.date).getTime() >= sevenDaysAgo).length;
}
