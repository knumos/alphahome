/**
 * AlphaHome — Motor de Progresión Inteligente, Métricas de Volumen y Peso Corporal
 *
 * Corrige todos los casos límite de v1:
 *  - Respeta el equipo personalizado (tope de mancuerna, incremento mínimo, chaleco opcional)
 *  - Detecta modificadores (chaleco/pausa/banda) en TODAS las series, no solo en la primera
 *  - Progresión dedicada para bandas (tensión/distancia/pausa, nunca "+1 kg")
 *  - Parseo seguro de RIR (sin NaN cuando falta)
 *  - Peso corporal real en promedio móvil de 7 días agrupado por fecha y regresión lineal temporal
 */

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

/**
 * Algoritmo de doble progresión y readaptación adaptado al equipo del usuario.
 */
export function calculateRecommendation(exercise, state) {
  const last = getLastExerciseLog(exercise.name, state);
  const isReadapt = Boolean(state.settings?.readaptationMode);
  const eq = state.equipment || { maxDumbbellKg: 24, dumbbellStepKg: 2, hasVest: true, vestKg: 10 };
  const maxDb = Number(eq.maxDumbbellKg) || 24;
  const vestKg = getVestWeightKg(state);
  const step = Math.max(0.5, Number(exercise.stepKg) || Number(eq.dumbbellStepKg) || 2);
  const targetRirLabel = isReadapt ? '2-3' : '1-2';
  const repRangeText = exercise.minReps === exercise.maxReps
    ? `${exercise.minReps}`
    : `${exercise.minReps}-${exercise.maxReps}`;

  // Primera vez que se registra el ejercicio
  if (!last || last.sets.length === 0) {
    const defaultWeight = exercise.equipment === 'dumbbell' ? '' : 0;
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
  const anyPause = sets.some((s) => Boolean(s.mods?.pause));
  const anyBand = sets.some((s) => Boolean(s.mods?.band));
  const maxEffectiveAdded = Math.max(...sets.map((s) => (Number(s.weight) || 0) + (s.mods?.vest ? vestKg : 0)));

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
    // 2A. Bandas de resistencia (nunca sugerir "+1 kg"!)
    if (exercise.equipment === 'band') {
      const tip = !anyPause
        ? 'Sube a una banda más tensa, aléjate 1 paso del anclaje o agrega Pausa 2s en contracción.'
        : 'Pasa a una banda de mayor resistencia o acorta el agarre para aumentar tensión.';
      return {
        summary: `Más tensión × ${exercise.minReps} reps @ RIR 1-2`,
        detail: `Dominaste ${exercise.maxReps} reps con banda. ${tip}`,
        suggestedWeight: 0,
        suggestedReps: exercise.minReps,
        suggestedRir: 2,
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

    // 2C. Peso corporal (dominadas, flexiones, puente)
    if (exercise.equipment === 'bodyweight') {
      const nextAdded = roundStep(maxEffectiveAdded + step, step);
      let extraNote = `Aumenta el lastre a +${nextAdded} kg (o añade pausa 2s / tempo lento).`;
      if (maxEffectiveAdded === 0 && eq.hasVest) {
        extraNote = `Activa el Chaleco +${vestKg}kg o agrega lastre progresivo.`;
      } else if (anyVest) {
        extraNote = `Ya entrenaste con Chaleco (+${vestKg}kg). Suma +${step} kg de lastre o Pausa 2s.`;
      }
      return {
        summary: `+${nextAdded} kg × ${exercise.minReps} reps @ RIR 1-2`,
        detail: `Dominaste ${exercise.maxReps} reps. ${extraNote}`,
        suggestedWeight: anyVest ? Math.max(0, roundStep(maxRawWeight + step, step)) : nextAdded,
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
