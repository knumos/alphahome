/**
 * Migración v2 → v3 y reglas nuevas.
 * Corre con: node tests/migration.test.mjs
 */
import assert from 'node:assert/strict';
import { EXERCISE_CATALOG } from '../js/data/catalog.js';
import {
  ROUTINE_TEMPLATES, applyGoalRepRanges, suggestTemplateId, buildAlphaHomeDays
} from '../js/data/templates.js';
import { planRoutineAdaptation } from '../js/engine/adapt.js';
import {
  calculateRecommendation, getReturnBlock, getWorkingSetCount, advanceReturnBlock
} from '../js/engine/progression.js';
import {
  normalizeState, getDefaultEquipment, getDefaultState, applySharedPayload, classifyImport, SCHEMA_VERSION
} from '../js/state.js';

const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log('ok  ', name);
  } catch (err) {
    failures.push(name);
    console.error('FAIL', name);
    console.error(err);
  }
}

function session(i) {
  return {
    id: `w_${i}`,
    date: new Date(Date.UTC(2024, 0, 1 + (i % 28), 12, i % 24)).toISOString(),
    dayId: 'day1',
    dayName: 'Día guardado por el dueño',
    durationSeconds: 3600,
    totalVolume: 1000 + i,
    mode: 'Progresión',
    exercises: [{
      name: 'Press Inclinado con Mancuernas',
      sets: [{ weight: i === 10 ? 18.1 : 13.5, reps: 8, rir: 2, done: true, mods: { chain: true, vest: false } }]
    }]
  };
}

const history = Array.from({ length: 174 }, (_, i) => session(i));
const historyJson = JSON.stringify(history);

const v2 = {
  schemaVersion: 2,
  profile: { name: 'Oswaldo', theme: 'cyan', onboardingCompleted: true },
  equipment: {
    maxDumbbellKg: 24,
    dumbbellStepKg: 0.5,
    hasBench: true,
    hasBands: true,
    hasPullupBar: true,
    hasVest: true,
    vestKg: 10
  },
  routines: [{
    id: 'custom-day',
    name: 'Día guardado por el dueño',
    focus: 'No tocar',
    recommendedDay: 'Lunes',
    warmup: [{ id: 'w', name: 'Mi calentamiento', target: '2 × 10', tip: 'igual', timerSec: 30 }],
    exercises: [{
      id: 'keep-me',
      name: 'Press raro del dueño',
      sets: 4,
      minReps: 6,
      maxReps: 8,
      restSec: 100,
      equipment: 'dumbbell',
      bilateral: true,
      stepKg: 0.5,
      superset: null,
      note: 'marca personal',
      alternatives: ['Otra']
    }]
  }],
  activeWorkout: { dayId: 'custom-day', dayName: 'Día guardado por el dueño', exercises: [] },
  history,
  bodyMetrics: { heightMeters: 1.81, logs: [{ id: 'bw1', date: '2024-01-02', weight: 82.4, note: 'control' }] },
  settings: { readaptationMode: true, autoRest: false, soundEnabled: true, sessionGoalMin: 50 },
  ui: { activeTab: 'progress' }
};

check('v2 conserva 174 sesiones, rutina, equipo y pesajes', () => {
  const next = normalizeState(JSON.parse(JSON.stringify(v2)), { isExistingUser: true });
  assert.equal(next.schemaVersion, 3);
  assert.equal(next.history.length, 174);
  assert.equal(JSON.stringify(next.history), historyJson);
  assert.equal(next.history[10].exercises[0].sets[0].weight, 18.1);
  assert.equal(next.history[10].exercises[0].sets[0].mods.chain, true);
  assert.equal(next.routines.length, 1);
  assert.equal(next.routines[0].name, 'Día guardado por el dueño');
  assert.equal(next.routines[0].exercises[0].name, 'Press raro del dueño');
  assert.equal(next.routines[0].exercises[0].sets, 4);
  assert.equal(next.equipment.maxDumbbellKg, 24);
  assert.equal(next.equipment.dumbbellStepKg, 0.5);
  assert.equal(next.equipment.hasPullupBar, true);
  assert.equal(next.equipment.hasVest, true);
  assert.equal(next.equipment.vestKg, 10);
  assert.equal(next.equipment.hasDeclineBench, true);
  assert.equal(next.equipment.hasWeightBelt, false);
  assert.equal(next.equipment.bandCount, 1);
  assert.equal(next.space.hasHallway, false);
  assert.equal(next.profile.goal, 'general');
  assert.equal(next.profile.level, 'intermediate');
  assert.equal(next.profile.onboardingCompleted, true);
  assert.equal(next.settings.returningFromBreak, false);
  assert.equal(next.settings.readaptationMode, true);
  assert.equal(next.settings.autoRest, false);
  assert.equal(next.settings.sessionGoalMin, 50);
  assert.equal(next.bodyMetrics.heightMeters, 1.81);
  assert.equal(next.bodyMetrics.logs[0].weight, 82.4);
  assert.equal(next.activeWorkout.dayName, 'Día guardado por el dueño');
  assert.equal(next.profiles, undefined);
});

check('respaldo v2 importado por normalizeState no pierde historial', () => {
  const backup = JSON.parse(JSON.stringify(v2));
  assert.equal(classifyImport(backup), 'backup');
  const next = normalizeState(backup, { isExistingUser: true });
  assert.equal(next.history.length, 174);
  assert.equal(next.history[0].id, history[0].id);
});

check('instalación nueva es neutra y pide onboarding', () => {
  const eq = getDefaultEquipment();
  assert.notEqual(eq.maxDumbbellKg, 24);
  assert.equal(eq.hasPullupBar, false);
  assert.equal(eq.hasVest, false);
  assert.equal(eq.hasBench, false);
  assert.equal(eq.hasWeightBelt, false);
  assert.equal(eq.bandCount, 0);
  assert.ok(eq.dumbbellStepKg === 0.5 || eq.dumbbellStepKg === 1);
  const fresh = getDefaultState(true);
  assert.equal(fresh.profile.onboardingCompleted, false);
  assert.equal(fresh.schemaVersion, SCHEMA_VERSION);
  assert.equal(fresh.history.length, 0);
});

check('catálogo: spaceNeed en todos y sin muscle-up', () => {
  for (const item of EXERCISE_CATALOG) {
    assert.ok(['compact', 'hallway', 'overhead'].includes(item.spaceNeed), item.name);
    assert.ok(item.needs);
  }
  const names = EXERCISE_CATALOG.map((i) => i.name.toLowerCase()).join(' | ');
  assert.equal(/muscle[\s-]?up/.test(names), false);
  assert.ok(EXERCISE_CATALOG.some((i) => i.id === 'db_pullover'));
  assert.ok(EXERCISE_CATALOG.some((i) => i.id === 'walking_lunge' && i.spaceNeed === 'hallway'));
  assert.ok(EXERCISE_CATALOG.some((i) => i.id === 'chain_curl' && i.needs.belt));
});

check('alphahome 4d: orden, superserie única y crunch', () => {
  const days = buildAlphaHomeDays();
  assert.deepEqual(days.map((d) => d.recommendedDay), ['Lunes', 'Martes', 'Jueves', 'Viernes']);
  assert.equal(days[0].exercises[0].name, 'Press Inclinado con Mancuernas');
  assert.equal(days[0].exercises[0].minReps, 8);
  assert.equal(days[0].exercises[0].maxReps, 10);
  assert.equal(days[0].exercises.at(-1).name, 'Crunch Declinado en Banco');
  assert.equal(days[1].exercises[0].name, 'Sentadilla Goblet Talones Elevados');
  assert.equal(days[1].exercises[0].sets, 4);
  assert.equal(days[1].exercises[3].superset, 'SUPERSERIE A');
  assert.equal(days[1].exercises[4].superset, 'SUPERSERIE A');
  assert.equal(days[1].exercises[3].restSec, 15);
  assert.equal(days[1].exercises[4].restSec, 75);
  assert.equal(days[2].exercises[0].name, 'Press Declinado con Mancuernas');
  assert.match(days[2].warmup[3].tip, /Press Declinado/);
  assert.equal(days[3].exercises[0].name, 'Peso Muerto Rumano con Mancuernas');
  assert.equal(days[3].exercises[3].superset, 'SUPERSERIE A');
  assert.equal(days[3].exercises[4].superset, 'SUPERSERIE A');
  assert.ok(days[3].exercises[3].alternatives.some((n) => /cadena/i.test(n)));
  assert.equal(days[3].exercises.some((e) => e.name === 'Curl con Cadena Ligera'), false);
});

check('plantillas de fase 2', () => {
  const nobar = ROUTINE_TEMPLATES.find((t) => t.id === 'strength_nobar_4d').build({
    equipment: { hasBench: true, hasDeclineBench: true, hasBands: true, bandCount: 4, maxDumbbellKg: 24 }
  });
  const flat = ROUTINE_TEMPLATES.find((t) => t.id === 'strength_nobar_4d').build({
    equipment: { hasBench: true, hasDeclineBench: false, hasBands: true, bandCount: 2, maxDumbbellKg: 20 }
  });
  for (const day of nobar) {
    const rows = day.exercises.filter((e) => /remo/i.test(e.name));
    assert.ok(rows.length <= 1, day.name);
    assert.equal(day.exercises.some((e) => e.name === 'Face Pull con Banda en Barra'), false);
    assert.equal(day.exercises.some((e) => /dominada/i.test(e.name)), false);
  }
  assert.ok(nobar[0].exercises.some((e) => e.name.includes('Pullover')));
  assert.equal(nobar[0].exercises.find((e) => /remo/i.test(e.name)).sets, 4);
  assert.ok(nobar.some((d) => d.exercises.some((e) => e.name === 'Press Declinado con Mancuernas')));
  assert.equal(flat.some((d) => d.exercises.some((e) => e.name === 'Press Declinado con Mancuernas')), false);
  assert.ok(flat.some((d) => d.exercises.some((e) => e.name === 'Press Plano con Mancuernas')));

  const glute = ROUTINE_TEMPLATES.find((t) => t.id === 'glute_lower_4d').build();
  assert.ok(/plancha|crunch/i.test(glute[0].exercises.at(-1).name));
  assert.equal(glute[2].exercises.some((e) => e.name === 'Puente de Glúteo en Suelo'), false);
  assert.ok(glute[2].exercises.some((e) => /femoral|plancha|zancada/i.test(e.name)));
  assert.ok(glute[1].exercises.some((e) => /pullover|jalón/i.test(e.name)));
  const gluteHall = ROUTINE_TEMPLATES.find((t) => t.id === 'glute_lower_4d').build({ space: { hasHallway: true } });
  assert.ok(gluteHall[2].exercises.some((e) => e.name.includes('Caminando')));

  const full = ROUTINE_TEMPLATES.find((t) => t.id === 'fullbody_3d').build();
  assert.ok(full[0].exercises.some((e) => /plancha|crunch/i.test(e.name)));
  assert.ok(full[2].exercises.some((e) => /plancha|crunch/i.test(e.name)));
  assert.equal(full[1].exercises.some((e) => /plancha|crunch/i.test(e.name)), false);
  assert.ok(full.some((d) => d.exercises.some((e) => e.name.includes('Pullover'))));
  assert.equal(full[1].exercises[3].superset, full[1].exercises[4].superset);
});

check('sugerencia de plantilla', () => {
  assert.equal(suggestTemplateId({ daysPerWeek: 3, goal: 'hypertrophy' }, { hasPullupBar: true }), 'fullbody_3d');
  assert.equal(suggestTemplateId({ daysPerWeek: 4, goal: 'glute' }, { hasPullupBar: true }), 'glute_lower_4d');
  assert.equal(suggestTemplateId({ daysPerWeek: 4, goal: 'hypertrophy' }, { hasPullupBar: true }), 'alphahome_4d');
  assert.equal(suggestTemplateId({ daysPerWeek: 4, goal: 'strength' }, { hasPullupBar: false }), 'strength_nobar_4d');
});

check('fuerza solo acorta rangos de básicos', () => {
  const changed = applyGoalRepRanges(buildAlphaHomeDays(), 'strength');
  const press = changed[0].exercises[0];
  assert.equal(press.minReps, 6);
  assert.equal(press.maxReps, 8);
  const fly = changed[0].exercises.find((e) => e.name.includes('Aperturas'));
  assert.equal(fly.minReps, 12);
  assert.equal(applyGoalRepRanges(buildAlphaHomeDays(), 'hypertrophy')[0].exercises[0].minReps, 8);
});

check('adaptar pide confirmación lógica: barra, declinado y pasillo', () => {
  const routines = [{
    id: 'd',
    name: 'Día prueba',
    warmup: [{ id: 'w', name: 'Colgadas Escapulares en Barra', target: '2 × 8', tip: 'barra', timerSec: 30 }],
    exercises: [
      { id: '1', name: 'Dominadas Pronas/Neutras en Barra', sets: 3, minReps: 6, maxReps: 10, restSec: 120, equipment: 'bodyweight', superset: null },
      { id: '2', name: 'Remo Pecho Apoyado en Banco', sets: 3, minReps: 8, maxReps: 12, restSec: 90, equipment: 'dumbbell', superset: null },
      { id: '3', name: 'Press Declinado con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 120, equipment: 'dumbbell', superset: null },
      { id: '4', name: 'Zancadas Caminando con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 90, equipment: 'dumbbell', superset: null },
      { id: '5', name: 'Paseo del Granjero con Mancuernas', sets: 3, minReps: 20, maxReps: 40, restSec: 60, equipment: 'dumbbell', superset: null },
      { id: '6', name: 'Press raro del dueño', sets: 4, minReps: 6, maxReps: 8, restSec: 90, equipment: 'dumbbell', superset: null }
    ]
  }];
  const equipment = {
    maxDumbbellKg: 24, hasBench: true, hasDeclineBench: false, hasBands: true, bandCount: 4,
    hasPullupBar: false, hasWeightBelt: false, hasVest: true
  };
  const plan = planRoutineAdaptation(routines, equipment, { hasHallway: false });
  const names = plan.routines[0].exercises.map((e) => e.name);
  assert.equal(names.includes('Dominadas Pronas/Neutras en Barra'), false);
  assert.ok(names.includes('Pullover con Mancuerna en Banco') || names.includes('Remo Pecho Apoyado en Banco'));
  assert.equal(names.filter((n) => /remo/i.test(n)).length, 1);
  assert.ok(names.includes('Press Plano con Mancuernas'));
  assert.ok(names.includes('Zancadas Atrás con Mancuernas'));
  assert.equal(names.includes('Paseo del Granjero con Mancuernas'), false);
  assert.ok(names.includes('Press raro del dueño'));
  assert.equal(routines[0].exercises[0].name, 'Dominadas Pronas/Neutras en Barra');
  const again = planRoutineAdaptation(plan.routines, equipment, { hasHallway: false });
  assert.equal(again.changes.length, 0);
});

check('cinturón, tope de mancuerna y bandas', () => {
  const base = {
    settings: { returningFromBreak: false, readaptationMode: false },
    equipment: { maxDumbbellKg: 24, dumbbellStepKg: 1, hasVest: true, vestKg: 10, hasWeightBelt: true, bandCount: 4, hasBands: true },
    history: []
  };
  const pull = {
    name: 'Dominadas Pronas/Neutras en Barra', equipment: 'bodyweight', minReps: 6, maxReps: 10, stepKg: 1
  };
  base.history = [{
    date: new Date().toISOString(),
    exercises: [{
      name: pull.name,
      sets: [1, 2, 3].map(() => ({ weight: 20, reps: 10, rir: 2, done: true, mods: { belt: true } }))
    }]
  }];
  const up = calculateRecommendation(pull, base);
  assert.equal(up.suggestedBelt, true);
  assert.equal(up.suggestedWeight, 21);
  assert.match(up.detail, /cadena/i);

  base.history[0].exercises[0].sets.forEach((s) => { s.weight = 24; });
  const cap = calculateRecommendation(pull, base);
  assert.ok(cap.suggestedWeight <= 24);
  assert.equal(cap.suggestedBelt, true);

  const band = { name: 'Aperturas con Banda de Resistencia', equipment: 'band', minReps: 12, maxReps: 15, stepKg: 0 };
  base.history = [{
    date: new Date().toISOString(),
    exercises: [{
      name: band.name,
      sets: [1, 2, 3].map(() => ({ weight: 0, reps: 15, rir: 2, done: true, mods: { band: true, bandLevel: 2 } }))
    }]
  }];
  const nextBand = calculateRecommendation(band, base);
  assert.equal(nextBand.suggestedBandLevel, 3);
  assert.equal(nextBand.suggestedWeight, 0);
  assert.doesNotMatch(nextBand.summary, /\+1 kg/);

  base.history[0].exercises[0].sets.forEach((s) => { s.mods.bandLevel = 4; });
  const lastBand = calculateRecommendation(band, base);
  assert.equal(lastBand.suggestedWeight, 0);
  assert.doesNotMatch(`${lastBand.summary} ${lastBand.detail}`, /\+1 kg/);
});

check('bloque de vuelta: series, RIR y sin subir carga', () => {
  const now = Date.parse('2026-06-01T12:00:00Z');
  const mk = (startedAt, sessions) => ({
    settings: { returningFromBreak: true, returnBlockStartedAt: startedAt, readaptationMode: true },
    profile: { daysPerWeek: 4 },
    equipment: { maxDumbbellKg: 24, dumbbellStepKg: 0.5, hasVest: false, bandCount: 0 },
    history: Array.from({ length: sessions }, (_, i) => ({
      date: new Date(startedAt + (i + 1) * 3600 * 1000).toISOString(),
      exercises: []
    }))
  });
  const week1 = getReturnBlock(mk(now - 3 * 86400000, 2), now);
  assert.equal(week1.active, true);
  assert.equal(week1.phase, 'weeks12');
  const compound = { name: 'Press Inclinado con Mancuernas', sets: 3, equipment: 'dumbbell' };
  const iso = { name: 'Aperturas Inclinadas con Mancuernas', sets: 3, equipment: 'dumbbell' };
  assert.equal(getWorkingSetCount(compound, mk(now - 3 * 86400000, 2), now), 2);
  assert.equal(getWorkingSetCount(iso, mk(now - 3 * 86400000, 2), now), 2);

  const week3 = getReturnBlock(mk(now - 16 * 86400000, 4), now);
  assert.equal(week3.phase, 'week3');
  assert.equal(getWorkingSetCount({ ...compound, sets: 4 }, mk(now - 16 * 86400000, 4), now), 3);
  assert.equal(getWorkingSetCount(iso, mk(now - 16 * 86400000, 4), now), 3);

  const state = mk(now - 3 * 86400000, 2);
  state.history.push({
    date: new Date(now - 86400000).toISOString(),
    exercises: [{
      name: 'Press Inclinado con Mancuernas',
      sets: [1, 2, 3].map(() => ({ weight: 18.1, reps: 10, rir: 2, done: true, mods: {} }))
    }]
  });
  const rec = calculateRecommendation({
    name: 'Press Inclinado con Mancuernas', equipment: 'dumbbell', minReps: 8, maxReps: 10, stepKg: 0.5
  }, state, now);
  assert.equal(rec.suggestedWeight, 18.1);
  assert.match(rec.summary, /3-4/);

  const done = mk(now - 30 * 86400000, 8);
  const finished = advanceReturnBlock(done, now);
  assert.equal(finished.completed, true);
  assert.equal(done.settings.returningFromBreak, false);
  assert.equal(getWorkingSetCount(compound, done, now), 3);
});

check('importar configuración no borra el historial del receptor', () => {
  const receiver = normalizeState(JSON.parse(JSON.stringify(v2)), { isExistingUser: true });
  const shared = {
    type: 'alphahome_setup',
    version: 3,
    routines: buildAlphaHomeDays(),
    config: {
      equipment: { maxDumbbellKg: 16, dumbbellStepKg: 1, hasBench: true, hasDeclineBench: false, hasPullupBar: false, hasVest: false, hasWeightBelt: false, bandCount: 2 },
      space: { hasRoom: true, roomWidthM: 3, roomLengthM: 4, hasHallway: true, hallwayLengthM: 6, hallwayWidthM: 2 },
      goal: 'glute',
      level: 'beginner',
      daysPerWeek: 4,
      sessionGoalMin: 45
    }
  };
  assert.equal(classifyImport(shared), 'setup');
  const only = applySharedPayload(receiver, shared, 'routines');
  assert.equal(only.history.length, 174);
  assert.equal(JSON.stringify(only.history), JSON.stringify(receiver.history));
  assert.equal(only.equipment.maxDumbbellKg, 24);
  assert.equal(only.routines[0].name, buildAlphaHomeDays()[0].name);

  const both = applySharedPayload(receiver, shared, 'setup');
  assert.equal(both.history.length, 174);
  assert.equal(both.history[10].exercises[0].sets[0].weight, 18.1);
  assert.equal(both.bodyMetrics.logs[0].weight, 82.4);
  assert.equal(both.equipment.maxDumbbellKg, 16);
  assert.equal(both.equipment.hasPullupBar, false);
  assert.equal(both.space.hasHallway, true);
  assert.equal(both.profile.goal, 'glute');
  assert.equal(both.profile.level, 'beginner');
  assert.equal(both.profile.name, 'Oswaldo');
  assert.equal(both.settings.sessionGoalMin, 45);
  assert.equal(both.activeWorkout.dayName, 'Día guardado por el dueño');
});

if (failures.length) {
  console.error(`\n${failures.length} prueba(s) fallaron`);
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron');
