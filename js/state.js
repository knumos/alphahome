/**
 * AlphaHome — Estado Global y Persistencia (misma clave alphahome_state_v1)
 *
 * Migración v2 → v3 es solo aditiva: historial, rutinas, equipo, peso y ajustes
 * que ya existían se conservan. Los campos nuevos (espacio, cinturón, declinado,
 * objetivo, nivel, vuelta al entrenamiento) reciben valores por defecto.
 */

import { ROUTINE_TEMPLATES, getTemplateById, applyGoalRepRanges } from './data/templates.js';
import { CATALOG_BY_NAME } from './data/catalog.js';
import { planRoutineAdaptation } from './engine/adapt.js';
import { getThemeInfo, showToast } from './utils.js';

export const STORAGE_KEY = 'alphahome_state_v1';
export const SCHEMA_VERSION = 3;

const GOALS = ['hypertrophy', 'strength', 'glute', 'general'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

export function getDefaultSpace() {
  return {
    hasRoom: true,
    roomWidthM: 0,
    roomLengthM: 0,
    hasHallway: false,
    hallwayLengthM: 0,
    hallwayWidthM: 0
  };
}

/**
 * Equipo neutro para una instalación nueva. No asume la mancuerna de 24 kg,
 * la barra ni el chaleco de ningún usuario concreto.
 */
export function getDefaultEquipment() {
  return {
    maxDumbbellKg: 12,
    dumbbellStepKg: 1,
    hasBench: false,
    hasDeclineBench: false,
    bandCount: 0,
    hasBands: false,
    hasPullupBar: false,
    hasWeightBelt: false,
    hasVest: false,
    vestKg: 10
  };
}

export function getDefaultProfile(onboardingCompleted = false) {
  return {
    name: '',
    theme: 'cyan',
    onboardingCompleted,
    goal: 'general',
    level: 'beginner',
    daysPerWeek: 4
  };
}

export function getDefaultState(isFreshInstall = true) {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: getDefaultProfile(!isFreshInstall),
    equipment: getDefaultEquipment(),
    space: getDefaultSpace(),
    routines: getTemplateById('alphahome_4d').build(),
    activeWorkout: null,
    activeRest: null,
    history: [],
    bodyMetrics: {
      heightMeters: 1.70,
      logs: []
    },
    settings: {
      readaptationMode: true,
      returningFromBreak: false,
      returnBlockStartedAt: null,
      autoRest: true,
      soundEnabled: true,
      vibrationEnabled: true,
      notificationsEnabled: false,
      sessionGoalMin: 60
    },
    ui: {
      activeTab: 'train',
      selectedProgressExercise: null,
      selectedProgressMetric: 'maxWeight',
      dismissedAdaptKey: ''
    }
  };
}

function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeStepKg(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const clamped = Math.max(0.5, Math.min(5, n));
  return Math.round(clamped * 2) / 2;
}

function normalizeDim(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(30, n) * 10) / 10;
}

export function normalizeSpace(raw) {
  const d = getDefaultSpace();
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    hasRoom: typeof s.hasRoom === 'boolean' ? s.hasRoom : d.hasRoom,
    roomWidthM: normalizeDim(s.roomWidthM),
    roomLengthM: normalizeDim(s.roomLengthM),
    hasHallway: typeof s.hasHallway === 'boolean' ? s.hasHallway : false,
    hallwayLengthM: normalizeDim(s.hallwayLengthM),
    hallwayWidthM: normalizeDim(s.hallwayWidthM)
  };
}

export function normalizeEquipment(rawEq, isExistingUser = true) {
  const raw = rawEq && typeof rawEq === 'object' ? rawEq : {};
  const neutral = getDefaultEquipment();
  const hasBench = typeof raw.hasBench === 'boolean' ? raw.hasBench : (isExistingUser ? true : neutral.hasBench);
  const hasPullupBar = typeof raw.hasPullupBar === 'boolean' ? raw.hasPullupBar : (isExistingUser ? true : neutral.hasPullupBar);
  const hasVest = typeof raw.hasVest === 'boolean' ? raw.hasVest : (isExistingUser ? true : neutral.hasVest);

  let bandCount;
  if (Number.isFinite(Number(raw.bandCount))) {
    bandCount = Math.max(0, Math.min(12, Math.round(Number(raw.bandCount))));
  } else if (typeof raw.hasBands === 'boolean') {
    bandCount = raw.hasBands ? 1 : 0;
  } else {
    bandCount = isExistingUser ? 1 : 0;
  }

  let hasDeclineBench = typeof raw.hasDeclineBench === 'boolean' ? raw.hasDeclineBench : hasBench;
  if (!hasBench) hasDeclineBench = false;

  return {
    maxDumbbellKg: clampNum(raw.maxDumbbellKg, 2, 80, isExistingUser ? 24 : neutral.maxDumbbellKg),
    dumbbellStepKg: normalizeStepKg(raw.dumbbellStepKg, isExistingUser ? 2 : neutral.dumbbellStepKg),
    hasBench,
    hasDeclineBench,
    bandCount,
    hasBands: bandCount > 0,
    hasPullupBar,
    hasWeightBelt: typeof raw.hasWeightBelt === 'boolean' ? raw.hasWeightBelt : false,
    hasVest,
    vestKg: clampNum(raw.vestKg, 1, 40, 10)
  };
}

function normalizeGoal(value, fallback) {
  return GOALS.includes(value) ? value : fallback;
}

function normalizeLevel(value, fallback) {
  return LEVELS.includes(value) ? value : fallback;
}

function normalizeDays(value, routines) {
  const n = Number(value);
  if (n === 3 || n === 4) return n;
  return Array.isArray(routines) && routines.length === 3 ? 3 : 4;
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
 * Normaliza v1, v2, v3 o un respaldo importado. No borra history ni reescribe la rutina guardada.
 */
export function normalizeState(parsed, { isExistingUser = true } = {}) {
  const def = getDefaultState(!isExistingUser);
  if (!parsed || typeof parsed !== 'object') return def;

  const validTabs = ['train', 'progress', 'weight', 'settings'];
  const loadedTab = parsed.ui && validTabs.includes(parsed.ui.activeTab) ? parsed.ui.activeTab : 'train';

  const rawProfile = parsed.profile || {};
  const onboardingCompleted = typeof rawProfile.onboardingCompleted === 'boolean'
    ? rawProfile.onboardingCompleted
    : isExistingUser;

  const profile = {
    name: String(rawProfile.name || '').trim().slice(0, 32),
    theme: getThemeInfo(rawProfile.theme).id,
    onboardingCompleted,
    goal: normalizeGoal(rawProfile.goal, 'general'),
    level: normalizeLevel(rawProfile.level, isExistingUser ? 'intermediate' : 'beginner'),
    daysPerWeek: normalizeDays(rawProfile.daysPerWeek, parsed.routines)
  };

  const equipment = normalizeEquipment(parsed.equipment, isExistingUser);
  const space = normalizeSpace(parsed.space || parsed.equipment?.space);

  const loadedBodyMetrics = parsed.bodyMetrics && Array.isArray(parsed.bodyMetrics.logs)
    ? {
        heightMeters: Math.max(1.2, Math.min(2.3, Number(parsed.bodyMetrics.heightMeters) || 1.70)),
        logs: parsed.bodyMetrics.logs.filter((l) => l && !isNaN(Number(l.weight)))
      }
    : def.bodyMetrics;

  const mergedRoutines = normalizeRoutines(parsed.routines, def.routines);

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

  const rawSettings = parsed.settings || {};
  const settings = {
    ...def.settings,
    ...rawSettings,
    readaptationMode: typeof rawSettings.readaptationMode === 'boolean'
      ? rawSettings.readaptationMode
      : def.settings.readaptationMode,
    returningFromBreak: rawSettings.returningFromBreak === true,
    returnBlockStartedAt: Number(rawSettings.returnBlockStartedAt) > 0
      ? Number(rawSettings.returnBlockStartedAt)
      : null,
    sessionGoalMin: clampNum(rawSettings.sessionGoalMin, 20, 180, def.settings.sessionGoalMin)
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    profile,
    equipment,
    space,
    routines: mergedRoutines,
    activeWorkout,
    activeRest,
    history: Array.isArray(parsed.history) ? parsed.history : [],
    bodyMetrics: loadedBodyMetrics,
    settings,
    ui: {
      ...def.ui,
      ...(parsed.ui || {}),
      activeTab: loadedTab,
      dismissedAdaptKey: String(parsed.ui?.dismissedAdaptKey || '')
    }
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
  const built = tpl.build({
    equipment: state.equipment,
    space: state.space,
    profile: state.profile
  });
  const adapted = planRoutineAdaptation(built, state.equipment, state.space).routines;
  const goaled = applyGoalRepRanges(adapted, state.profile?.goal);
  const userStep = state.equipment?.dumbbellStepKg || 1;
  state.routines = goaled.map((day) => ({
    ...day,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      stepKg: ex.equipment === 'dumbbell' ? Math.min(ex.stepKg || userStep, userStep) : ex.stepKg
    }))
  }));
  saveState();
  return tpl;
}

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
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    author: state.profile?.name || 'AlphaHome',
    routines: state.routines
  };
  downloadJsonFile(payload, `alphahome_rutina_${new Date().toISOString().slice(0, 10)}.json`);
}

export function buildSetupPayload(source = state) {
  return {
    type: 'alphahome_setup',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    author: source.profile?.name || 'AlphaHome',
    routines: source.routines,
    config: {
      equipment: source.equipment,
      space: source.space,
      goal: source.profile?.goal || 'general',
      level: source.profile?.level || 'intermediate',
      daysPerWeek: source.profile?.daysPerWeek === 3 ? 3 : 4,
      sessionGoalMin: source.settings?.sessionGoalMin || 60
    }
  };
}

export function exportSetup() {
  downloadJsonFile(buildSetupPayload(state), `alphahome_config_${new Date().toISOString().slice(0, 10)}.json`);
}

export function classifyImport(parsed) {
  if (Array.isArray(parsed)) return 'routines';
  if (!parsed || typeof parsed !== 'object') return 'invalid';
  if (parsed.type === 'alphahome_setup') return 'setup';
  if (parsed.type === 'alphahome_routines') return 'routines';
  if (Array.isArray(parsed.routines) && (
    parsed.schemaVersion || parsed.history || parsed.bodyMetrics || parsed.activeWorkout || parsed.profile
  )) {
    return 'backup';
  }
  if (Array.isArray(parsed.routines)) return 'routines';
  return 'invalid';
}

/**
 * Importa una rutina compartida o una rutina + configuración.
 * Nunca reemplaza history, bodyMetrics ni la sesión activa.
 */
export function applySharedPayload(current, payload, mode) {
  const base = normalizeState(current, { isExistingUser: true });
  const incomingRoutines = Array.isArray(payload) ? payload : payload?.routines;
  const routines = normalizeRoutines(incomingRoutines, base.routines);
  const next = {
    ...base,
    routines,
    history: base.history,
    bodyMetrics: base.bodyMetrics,
    activeWorkout: base.activeWorkout,
    activeRest: base.activeRest
  };

  if (mode === 'setup') {
    const cfg = payload?.config || {};
    next.equipment = normalizeEquipment(
      { ...base.equipment, ...(cfg.equipment || {}) },
      true
    );
    next.space = normalizeSpace({ ...base.space, ...(cfg.space || {}) });
    next.profile = {
      ...base.profile,
      goal: normalizeGoal(cfg.goal, base.profile.goal),
      level: normalizeLevel(cfg.level, base.profile.level),
      daysPerWeek: cfg.daysPerWeek === 3 || cfg.daysPerWeek === 4
        ? cfg.daysPerWeek
        : base.profile.daysPerWeek
    };
    if (cfg.sessionGoalMin != null) {
      next.settings = {
        ...base.settings,
        sessionGoalMin: clampNum(cfg.sessionGoalMin, 20, 180, base.settings.sessionGoalMin)
      };
    }
  }

  next.history = base.history;
  next.bodyMetrics = base.bodyMetrics;
  return next;
}

export function parseImportedRoutines(text) {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed && Array.isArray(parsed.routines) ? parsed.routines : null);
  if (!arr || !arr.length) throw new Error('No se encontraron rutinas válidas.');
  return normalizeRoutines(arr, ROUTINE_TEMPLATES[0].build());
}
