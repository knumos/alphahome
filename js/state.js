/**
 * AlphaHome — Estado Global, Persistencia Local y Migración Retrocompatible (v1 -> v2)
 *
 * Mantiene la misma clave STORAGE_KEY ('alphahome_state_v1') para que usuarios
 * existentes conserven 100% de su historial, rutinas y registros de peso sin perder nada,
 * mientras que dispositivos nuevos arrancan con el onboarding personalizable.
 */

import { ROUTINE_TEMPLATES, getTemplateById } from './data/templates.js';
import { CATALOG_BY_NAME } from './data/catalog.js';
import { getThemeInfo, showToast } from './utils.js';

export const STORAGE_KEY = 'alphahome_state_v1';

export function getDefaultEquipment() {
  return {
    maxDumbbellKg: 24,
    dumbbellStepKg: 2,
    hasBench: true,
    hasBands: true,
    hasPullupBar: true,
    hasVest: true,
    vestKg: 10
  };
}

export function getDefaultProfile(onboardingCompleted = false) {
  return {
    name: '',
    theme: 'cyan',
    onboardingCompleted
  };
}

export function getDefaultState(isFreshInstall = true) {
  return {
    schemaVersion: 2,
    profile: getDefaultProfile(!isFreshInstall),
    equipment: getDefaultEquipment(),
    routines: getTemplateById('alphahome_4d').build(),
    activeWorkout: null,
    activeRest: null, // { endTime, totalSec, exerciseName } — persiste al recargar PWA
    history: [],
    bodyMetrics: {
      heightMeters: 1.70,
      logs: []
    },
    settings: {
      readaptationMode: true,
      autoRest: true,
      soundEnabled: true,
      vibrationEnabled: true,
      notificationsEnabled: false,
      sessionGoalMin: 60
    },
    ui: {
      activeTab: 'train',
      selectedProgressExercise: null,
      selectedProgressMetric: 'maxWeight'
    }
  };
}

function normalizeExercise(ex) {
  const cat = CATALOG_BY_NAME.get(String(ex.name || '').toLowerCase());
  const equipment = ex.equipment || cat?.equipment || 'dumbbell';
  const bilateral = typeof ex.bilateral === 'boolean'
    ? ex.bilateral
    : (cat ? Boolean(cat.bilateral) : true);

  return {
    id: ex.id || 'ex_' + Math.random().toString(36).slice(2, 9),
    name: String(ex.name || 'Ejercicio').trim(),
    sets: Math.max(1, Math.min(12, Number(ex.sets) || 3)),
    minReps: Math.max(1, Math.min(50, Number(ex.minReps) || 8)),
    maxReps: Math.max(1, Math.min(50, Number(ex.maxReps) || 12)),
    restSec: Math.max(5, Math.min(600, Number(ex.restSec) || 90)),
    equipment,
    bilateral,
    stepKg: Number.isFinite(Number(ex.stepKg)) ? Number(ex.stepKg) : (equipment === 'band' ? 0 : 2),
    superset: ex.superset || null,
    note: ex.note || '',
    alternatives: Array.isArray(ex.alternatives) ? ex.alternatives : (cat?.alternatives || [])
  };
}

function normalizeRoutines(rawRoutines, fallbackRoutines) {
  const source = Array.isArray(rawRoutines) && rawRoutines.length ? rawRoutines : fallbackRoutines;
  return source.map((r, idx) => {
    const defMatch = fallbackRoutines.find((d) => d.id === r.id);
    const warmup = Array.isArray(r.warmup) ? r.warmup : (defMatch ? defMatch.warmup : []);
    const exercises = Array.isArray(r.exercises) ? r.exercises.map(normalizeExercise) : [];
    return {
      id: r.id || `day${idx + 1}`,
      name: String(r.name || `Día ${idx + 1}`).trim(),
      focus: String(r.focus || 'Entrenamiento en casa').trim(),
      recommendedDay: String(r.recommendedDay || '').trim(),
      warmup,
      exercises
    };
  });
}

/**
 * Normaliza y migra cualquier payload (v1, v2 o respaldo importado) a estado v2 válido.
 */
export function normalizeState(parsed, { isExistingUser = true } = {}) {
  const def = getDefaultState(!isExistingUser);
  if (!parsed || typeof parsed !== 'object') return def;

  const validTabs = ['train', 'progress', 'weight', 'settings'];
  const loadedTab = parsed.ui && validTabs.includes(parsed.ui.activeTab) ? parsed.ui.activeTab : 'train';

  const rawProfile = parsed.profile || {};
  // Si el estado ya existía en v1 (sin campo profile), no forzamos el onboarding inicial
  const onboardingCompleted = typeof rawProfile.onboardingCompleted === 'boolean'
    ? rawProfile.onboardingCompleted
    : isExistingUser;

  const profile = {
    name: String(rawProfile.name || '').trim().slice(0, 32),
    theme: getThemeInfo(rawProfile.theme).id,
    onboardingCompleted
  };

  const rawEq = parsed.equipment || {};
  const equipment = {
    maxDumbbellKg: Math.max(2, Math.min(80, Number(rawEq.maxDumbbellKg) || 24)),
    dumbbellStepKg: Math.max(0.5, Math.min(5, Number(rawEq.dumbbellStepKg) || 2)),
    hasBench: typeof rawEq.hasBench === 'boolean' ? rawEq.hasBench : true,
    hasBands: typeof rawEq.hasBands === 'boolean' ? rawEq.hasBands : true,
    hasPullupBar: typeof rawEq.hasPullupBar === 'boolean' ? rawEq.hasPullupBar : true,
    hasVest: typeof rawEq.hasVest === 'boolean' ? rawEq.hasVest : true,
    vestKg: Math.max(1, Math.min(40, Number(rawEq.vestKg) || 10))
  };

  const loadedBodyMetrics = parsed.bodyMetrics && Array.isArray(parsed.bodyMetrics.logs)
    ? {
        heightMeters: Math.max(1.2, Math.min(2.3, Number(parsed.bodyMetrics.heightMeters) || 1.70)),
        logs: parsed.bodyMetrics.logs.filter((l) => l && !isNaN(Number(l.weight)))
      }
    : def.bodyMetrics;

  const mergedRoutines = normalizeRoutines(parsed.routines, def.routines);

  // Asegurar metadatos en activeWorkout si existía en v1
  let activeWorkout = parsed.activeWorkout || null;
  if (activeWorkout && Array.isArray(activeWorkout.exercises)) {
    activeWorkout = {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        const cat = CATALOG_BY_NAME.get(String(ex.name || '').toLowerCase());
        return {
          ...ex,
          bilateral: typeof ex.bilateral === 'boolean' ? ex.bilateral : (cat ? Boolean(cat.bilateral) : true),
          sessionNote: ex.sessionNote || ''
        };
      })
    };
  }

  let activeRest = null;
  if (parsed.activeRest && Number(parsed.activeRest.endTime) > 0) {
    activeRest = {
      endTime: Number(parsed.activeRest.endTime),
      totalSec: Math.max(5, Number(parsed.activeRest.totalSec) || 60),
      exerciseName: String(parsed.activeRest.exerciseName || 'Descanso')
    };
  }

  return {
    schemaVersion: 2,
    profile,
    equipment,
    routines: mergedRoutines,
    activeWorkout,
    activeRest,
    history: Array.isArray(parsed.history) ? parsed.history : [],
    bodyMetrics: loadedBodyMetrics,
    settings: { ...def.settings, ...(parsed.settings || {}) },
    ui: { ...def.ui, ...(parsed.ui || {}), activeTab: loadedTab }
  };
}

export let state = loadState();

export function loadState() {
  try {
    if (typeof localStorage === 'undefined') return getDefaultState(true);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState(true);
    const parsed = JSON.parse(raw);
    return normalizeState(parsed, { isExistingUser: true });
  } catch (err) {
    console.error('Error cargando estado:', err);
    return getDefaultState(true);
  }
}

export function replaceState(nextState) {
  state = nextState;
  saveState();
}

export function saveState() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error guardando estado:', err);
    showToast('No se pudo guardar en memoria local.', 'error');
  }
}

export function applyRoutineTemplate(templateId) {
  const tpl = getTemplateById(templateId);
  const built = tpl.build();
  // Ajustar stepKg a la granularidad configurada en equipo si es menor
  const userStep = state.equipment?.dumbbellStepKg || 2;
  state.routines = built.map((day) => ({
    ...day,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      stepKg: ex.equipment === 'dumbbell' ? Math.min(ex.stepKg || userStep, userStep) : ex.stepKg
    }))
  }));
  saveState();
  return tpl;
}

// ---------------------------------------------------------------------------
// Exportación / Importación de Respaldo Completo y Rutinas Compartibles
// ---------------------------------------------------------------------------
export function downloadJsonFile(payload, filename) {
  const dataStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFullBackup() {
  downloadJsonFile(state, `alphahome_respaldo_${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportRoutinesOnly() {
  const payload = {
    type: 'alphahome_routines',
    version: 2,
    exportedAt: new Date().toISOString(),
    author: state.profile?.name || 'AlphaHome',
    routines: state.routines
  };
  downloadJsonFile(payload, `alphahome_rutina_${new Date().toISOString().slice(0, 10)}.json`);
}

export function parseImportedRoutines(text) {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed && Array.isArray(parsed.routines) ? parsed.routines : null);
  if (!arr || !arr.length) throw new Error('No se encontraron rutinas válidas.');
  return normalizeRoutines(arr, ROUTINE_TEMPLATES[0].build());
}
