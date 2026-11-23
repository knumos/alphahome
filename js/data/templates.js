/**
 * AlphaHome — Plantillas de Rutina
 * La clásica de 4 días sigue el bloque Torso / Extremidades (Lun, Mar, Jue, Vie).
 * Las otras plantillas reutilizan esa estructura cuando aplica y respetan equipo y espacio.
 */

import { CATALOG_BY_NAME, getExerciseRole } from './catalog.js';
import { planRoutineAdaptation } from '../engine/adapt.js';

function ex(partial) {
  return {
    sets: 3,
    minReps: 8,
    maxReps: 12,
    restSec: 90,
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    superset: null,
    note: '',
    alternatives: [],
    ...partial
  };
}

function catAlts(name, extra = []) {
  const cat = CATALOG_BY_NAME.get(String(name).toLowerCase());
  return [...extra, ...(cat?.alternatives || [])];
}

export function buildAlphaHomeDays() {
  return [
    {
      id: 'day1',
      name: 'Día 1 — Torso A',
      focus: 'Pecho, Espalda y Hombro Posterior (Fuerza)',
      recommendedDay: 'Lunes',
      warmup: [
        { id: 'w1_1', name: 'Dislocaciones / Pases con banda', target: '2 × 10-12', tip: 'Brazos estirados, abre el agarre para rotar hombros sin molestia.', timerSec: 45 },
        { id: 'w1_2', name: 'Band Pull-Aparts + Rotación externa', target: '2 × 12-15', tip: 'Activa manguito rotador y estabiliza el hombro antes del Press Inclinado.', timerSec: 45 },
        { id: 'w1_3', name: 'Bombeo de codos con banda (curl + extensión)', target: '2 × 15', tip: 'Tensión ligera y continua para lubricar tendones de bíceps y tríceps.', timerSec: 45 },
        { id: 'w1_4', name: 'Colgadas Escapulares en Barra', target: '2 × 8-10', tip: 'Codos bloqueados, deprime y retrae escápulas para preparar las dominadas.', timerSec: 30 }
      ],
      exercises: [
        ex({
          id: 'd1_e1', name: 'Press Inclinado con Mancuernas',
          sets: 3, minReps: 8, maxReps: 10, restSec: 120, stepKg: 2,
          alternatives: catAlts('Press Inclinado con Mancuernas')
        }),
        ex({
          id: 'd1_e2', name: 'Dominadas Pronas/Neutras en Barra',
          sets: 3, minReps: 6, maxReps: 10, restSec: 120,
          equipment: 'bodyweight', stepKg: 2,
          note: 'Al llegar a 3×10, lastra con chaleco o con cinturón + mancuerna. La cadena no suma kilos.',
          alternatives: catAlts('Dominadas Pronas/Neutras en Barra')
        }),
        ex({
          id: 'd1_e3', name: 'Remo Pecho Apoyado en Banco',
          sets: 3, minReps: 8, maxReps: 12, restSec: 90, stepKg: 2,
          alternatives: catAlts('Remo Pecho Apoyado en Banco')
        }),
        ex({
          id: 'd1_e4', name: 'Aperturas Inclinadas con Mancuernas',
          sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 1,
          alternatives: catAlts('Aperturas Inclinadas con Mancuernas')
        }),
        ex({
          id: 'd1_e5', name: 'Face Pull con Banda en Barra',
          sets: 3, minReps: 12, maxReps: 15, restSec: 60,
          equipment: 'band', stepKg: 0,
          alternatives: catAlts('Face Pull con Banda en Barra')
        }),
        ex({
          id: 'd1_e6', name: 'Crunch Declinado en Banco',
          sets: 3, minReps: 12, maxReps: 20, restSec: 60,
          equipment: 'bodyweight', stepKg: 0,
          alternatives: catAlts('Crunch Declinado en Banco')
        })
      ]
    },
    {
      id: 'day2',
      name: 'Día 2 — Extremidades A',
      focus: 'Cuádriceps, Hombro y Brazos',
      recommendedDay: 'Martes',
      warmup: [
        { id: 'w2_1', name: 'Rotación externa con banda + círculos de hombro', target: '2 × 12', tip: 'Calienta deltoides antes de abrir con Elevaciones Laterales.', timerSec: 45 },
        { id: 'w2_2', name: 'Bombeo de codos con banda (extensión + curl suave)', target: '2 × 15', tip: 'Prepara los codos para la superserie de bíceps y tríceps sin dolor.', timerSec: 45 },
        { id: 'w2_3', name: 'Movilidad de tobillo y cadera (zancada con rotación)', target: '2 × 8 / lado', tip: 'Mejora profundidad y estabilidad para la sentadilla goblet y las zancadas atrás.', timerSec: 60 },
        { id: 'w2_4', name: 'Sentadilla al aire con pausa abajo', target: '2 × 10', tip: 'Pausa de 2s abajo para lubricar rodillas y activar cuádriceps.', timerSec: 45 }
      ],
      exercises: [
        ex({
          id: 'd2_e1', name: 'Sentadilla Goblet Talones Elevados',
          sets: 4, minReps: 8, maxReps: 12, restSec: 120,
          bilateral: false, stepKg: 2,
          alternatives: catAlts('Sentadilla Goblet Talones Elevados')
        }),
        ex({
          id: 'd2_e2', name: 'Zancadas Atrás con Mancuernas',
          sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 2,
          note: 'Por pierna',
          alternatives: catAlts('Zancadas Atrás con Mancuernas')
        }),
        ex({
          id: 'd2_e3', name: 'Elevaciones Laterales con Mancuerna',
          sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 1,
          alternatives: catAlts('Elevaciones Laterales con Mancuerna')
        }),
        ex({
          id: 'd2_e4', name: 'Curl Inclinado en Banco 45°',
          sets: 3, minReps: 10, maxReps: 12, restSec: 15, stepKg: 1,
          superset: 'SUPERSERIE A',
          alternatives: catAlts('Curl Inclinado en Banco 45°')
        }),
        ex({
          id: 'd2_e5', name: 'Extensión de Tríceps con Banda en Barra',
          sets: 3, minReps: 10, maxReps: 12, restSec: 75,
          equipment: 'band', stepKg: 0,
          superset: 'SUPERSERIE A',
          alternatives: catAlts('Extensión de Tríceps con Banda en Barra')
        }),
        ex({
          id: 'd2_e6', name: 'Curl Femoral Acostado con Banda',
          sets: 3, minReps: 12, maxReps: 15, restSec: 60,
          equipment: 'band', stepKg: 0,
          alternatives: catAlts('Curl Femoral Acostado con Banda')
        })
      ]
    },
    {
      id: 'day3',
      name: 'Día 3 — Torso B',
      focus: 'Pecho, Espalda y Hombro Posterior (Hipertrofia)',
      recommendedDay: 'Jueves',
      warmup: [
        { id: 'w3_1', name: 'Círculos escapulares + retracciones con banda', target: '2 × 12', tip: 'Despierta espalda media y hombros antes de empujar y jalar.', timerSec: 45 },
        { id: 'w3_2', name: 'Rotación externa a 90° con banda (posición L)', target: '2 × 12 / lado', tip: 'Protege el manguito rotador y la cápsula anterior para el Press Declinado.', timerSec: 45 },
        { id: 'w3_3', name: 'Bombeo de codos con banda (curl + extensión)', target: '2 × 15', tip: 'Clave antes de las Dominadas Supinas para proteger tendón de bíceps y codo.', timerSec: 45 },
        { id: 'w3_4', name: 'Movilidad de muñecas + 1 serie ligera de aproximación', target: '1 min', tip: 'Círculos y apoyos suaves de muñeca + 8-10 reps ligeras de Press Declinado.', timerSec: 60 }
      ],
      exercises: [
        ex({
          id: 'd3_e1', name: 'Press Declinado con Mancuernas',
          sets: 3, minReps: 8, maxReps: 12, restSec: 120, stepKg: 2,
          alternatives: catAlts('Press Declinado con Mancuernas')
        }),
        ex({
          id: 'd3_e2', name: 'Dominadas Supinas en Barra',
          sets: 3, minReps: 6, maxReps: 10, restSec: 120,
          equipment: 'bodyweight', stepKg: 2,
          note: 'Al llegar a 3×10, lastra con chaleco o con cinturón + mancuerna. La cadena no suma kilos.',
          alternatives: catAlts('Dominadas Supinas en Barra')
        }),
        ex({
          id: 'd3_e3', name: 'Remo Serrucho a un Brazo en Banco',
          sets: 3, minReps: 10, maxReps: 12, restSec: 90,
          bilateral: false, stepKg: 2, note: 'Por lado',
          alternatives: catAlts('Remo Serrucho a un Brazo en Banco')
        }),
        ex({
          id: 'd3_e4', name: 'Aperturas con Banda de Resistencia',
          sets: 3, minReps: 12, maxReps: 15, restSec: 60,
          equipment: 'band', stepKg: 0,
          alternatives: catAlts('Aperturas con Banda de Resistencia')
        }),
        ex({
          id: 'd3_e5', name: 'Pájaros Sentado en Banco',
          sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 1,
          alternatives: catAlts('Pájaros Sentado en Banco')
        }),
        ex({
          id: 'd3_e6', name: 'Crunch Declinado en Banco',
          sets: 3, minReps: 12, maxReps: 20, restSec: 60,
          equipment: 'bodyweight', stepKg: 0,
          alternatives: catAlts('Crunch Declinado en Banco')
        })
      ]
    },
    {
      id: 'day4',
      name: 'Día 4 — Extremidades B',
      focus: 'Cadena Posterior, Hombro y Brazos',
      recommendedDay: 'Viernes',
      warmup: [
        { id: 'w4_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Abre el rango de movimiento vertical antes del Press Militar Sentado.', timerSec: 45 },
        { id: 'w4_2', name: 'Rotación externa + extensiones ligeras de tríceps con banda', target: '2 × 15', tip: 'Indispensable para lubricar codos antes del Press Francés con mancuernas.', timerSec: 45 },
        { id: 'w4_3', name: 'Bisagra de cadera con banda (Good Mornings)', target: '2 × 12', tip: 'Activa isquiotibiales y espalda baja para el Peso Muerto Rumano.', timerSec: 45 },
        { id: 'w4_4', name: 'Puente de Glúteo en Suelo', target: '2 × 12', tip: 'Despierta glúteos sin fatiga antes de pasar a la carga en banco.', timerSec: 45 }
      ],
      exercises: [
        ex({
          id: 'd4_e1', name: 'Peso Muerto Rumano con Mancuernas',
          sets: 3, minReps: 8, maxReps: 12, restSec: 120, stepKg: 2,
          alternatives: catAlts('Peso Muerto Rumano con Mancuernas')
        }),
        ex({
          id: 'd4_e2', name: 'Sentadilla Búlgara en Banco',
          sets: 3, minReps: 8, maxReps: 10, restSec: 120, stepKg: 2,
          note: 'Por pierna',
          alternatives: catAlts('Sentadilla Búlgara en Banco')
        }),
        ex({
          id: 'd4_e3', name: 'Press Militar Sentado en Banco',
          sets: 3, minReps: 8, maxReps: 10, restSec: 120, stepKg: 2,
          alternatives: catAlts('Press Militar Sentado en Banco')
        }),
        ex({
          id: 'd4_e4', name: 'Curl Martillo con Mancuernas',
          sets: 3, minReps: 10, maxReps: 12, restSec: 15, stepKg: 1,
          superset: 'SUPERSERIE A',
          alternatives: catAlts('Curl Martillo con Mancuernas')
        }),
        ex({
          id: 'd4_e5', name: 'Press Francés con Mancuernas en Banco',
          sets: 3, minReps: 10, maxReps: 12, restSec: 75, stepKg: 1,
          superset: 'SUPERSERIE A',
          alternatives: catAlts('Press Francés con Mancuernas en Banco')
        }),
        ex({
          id: 'd4_e6', name: 'Hip Thrust en Banco con Mancuernas',
          sets: 3, minReps: 10, maxReps: 15, restSec: 90,
          bilateral: false, stepKg: 2,
          alternatives: catAlts('Hip Thrust en Banco con Mancuernas')
        })
      ]
    }
  ];
}

function ctxEquipment(ctx, overrides = {}) {
  return { ...(ctx?.equipment || {}), ...overrides };
}

function ctxSpace(ctx) {
  return ctx?.space || ctx?.equipment?.space || { hasHallway: false };
}

function useWalkingLunges(day, enabled) {
  if (!enabled) return day;
  return {
    ...day,
    exercises: day.exercises.map((item) => {
      if (item.name !== 'Zancadas Atrás con Mancuernas') return item;
      return {
        ...item,
        name: 'Zancadas Caminando con Mancuernas',
        note: 'Por pierna',
        alternatives: catAlts('Zancadas Caminando con Mancuernas')
      };
    })
  };
}

function coreExercise(id, decline) {
  if (decline) {
    return ex({
      id,
      name: 'Crunch Declinado en Banco',
      sets: 3, minReps: 12, maxReps: 20, restSec: 60,
      equipment: 'bodyweight', stepKg: 0,
      alternatives: catAlts('Crunch Declinado en Banco')
    });
  }
  return ex({
    id,
    name: 'Plancha Frontal',
    sets: 3, minReps: 20, maxReps: 40, restSec: 45,
    equipment: 'bodyweight', stepKg: 0, note: 'Segundos',
    alternatives: catAlts('Plancha Frontal')
  });
}

export function applyGoalRepRanges(routines, goal) {
  if (goal !== 'strength') return routines;
  return (routines || []).map((day) => ({
    ...day,
    exercises: (day.exercises || []).map((item) => {
      if (getExerciseRole(item) !== 'compound') return item;
      const minReps = Math.max(4, item.minReps - 2);
      const maxReps = Math.max(minReps + 1, Math.min(8, item.maxReps - 2));
      return {
        ...item,
        minReps,
        maxReps,
        restSec: Math.min(180, (item.restSec || 90) + 15)
      };
    })
  }));
}

export function suggestTemplateId(profile = {}, equipment = {}) {
  const days = Number(profile.daysPerWeek) === 3 ? 3 : 4;
  if (days === 3) return 'fullbody_3d';
  if (profile.goal === 'glute') return 'glute_lower_4d';
  if (equipment.hasPullupBar) return 'alphahome_4d';
  return 'strength_nobar_4d';
}

export const ROUTINE_TEMPLATES = [
  {
    id: 'alphahome_4d',
    name: 'Torso / Extremidades (4 Días)',
    badge: 'Clásica AlphaHome',
    summary: 'Lun y Jue torso, Mar y Vie pierna y brazos. Mancuernas, banco, bandas y barra.',
    requiresPullupBar: true,
    build() {
      return buildAlphaHomeDays();
    }
  },
  {
    id: 'glute_lower_4d',
    name: 'Glúteo, Pierna y Torso (4 Días)',
    badge: 'Énfasis Tren Inferior',
    summary: 'Dos días de glúteo y pierna con core, y dos de torso. Zancada caminando solo si hay pasillo.',
    requiresPullupBar: false,
    build(ctx = {}) {
      const decline = Boolean(ctxEquipment(ctx).hasDeclineBench);
      const hallway = Boolean(ctxSpace(ctx).hasHallway);
      const pulldown = Boolean(ctxEquipment(ctx).hasPullupBar) && (ctxEquipment(ctx).hasBands || Number(ctxEquipment(ctx).bandCount) > 0);
      const days = [
        {
          id: 'day1',
          name: 'Día 1 — Glúteo y Cadena Posterior',
          focus: 'Glúteo Mayor, Isquiotibiales y Core',
          recommendedDay: 'Lunes',
          warmup: [
            { id: 'gw1_1', name: 'Puente de Glúteo en Suelo', target: '2 × 15', tip: 'Activa glúteos con pausa de 1s arriba antes de cargar el Hip Thrust.', timerSec: 45 },
            { id: 'gw1_2', name: 'Bisagra de cadera con banda (Good Mornings)', target: '2 × 12', tip: 'Practica espalda neutra y cadera atrás antes del Peso Muerto Rumano.', timerSec: 45 },
            { id: 'gw1_3', name: 'Zancada con rotación (movilidad cadera)', target: '2 × 8 / lado', tip: 'Abre flexores de cadera y estabiliza tobillos.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'gd1_e1', name: 'Hip Thrust en Banco con Mancuernas', sets: 4, minReps: 10, maxReps: 15, restSec: 90, bilateral: false, alternatives: catAlts('Hip Thrust en Banco con Mancuernas') }),
            ex({ id: 'gd1_e2', name: 'Peso Muerto Rumano con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 120, alternatives: catAlts('Peso Muerto Rumano con Mancuernas') }),
            ex({ id: 'gd1_e3', name: 'Sentadilla Búlgara en Banco', sets: 3, minReps: 8, maxReps: 12, restSec: 90, stepKg: 1, note: 'Por pierna', alternatives: catAlts('Sentadilla Búlgara en Banco') }),
            ex({ id: 'gd1_e4', name: 'Curl Femoral Acostado con Banda', sets: 3, minReps: 12, maxReps: 15, restSec: 60, equipment: 'band', stepKg: 0, alternatives: catAlts('Curl Femoral Acostado con Banda') }),
            coreExercise('gd1_e5', decline)
          ]
        },
        {
          id: 'day2',
          name: 'Día 2 — Torso y Postura A',
          focus: 'Espalda, Pecho, Dorsal y Hombros',
          recommendedDay: 'Martes',
          warmup: [
            { id: 'gw2_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Lubrica hombros con agarre cómodo y brazos estirados.', timerSec: 45 },
            { id: 'gw2_2', name: 'Band Pull-Aparts + Rotación externa', target: '2 × 12', tip: 'Activa espalda alta y manguito rotador.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'gd2_e1', name: 'Remo Pecho Apoyado en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Remo Pecho Apoyado en Banco') }),
            ex({
              id: 'gd2_e2',
              name: pulldown ? 'Jalón con Banda en Barra' : 'Pullover con Mancuerna en Banco',
              sets: 3, minReps: 10, maxReps: 12, restSec: 75,
              equipment: pulldown ? 'band' : 'dumbbell',
              bilateral: pulldown,
              stepKg: pulldown ? 0 : 1,
              alternatives: catAlts(pulldown ? 'Jalón con Banda en Barra' : 'Pullover con Mancuerna en Banco')
            }),
            ex({ id: 'gd2_e3', name: 'Press Inclinado con Mancuernas', sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Press Inclinado con Mancuernas') }),
            ex({ id: 'gd2_e4', name: 'Elevaciones Laterales con Mancuerna', sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 0.5, alternatives: catAlts('Elevaciones Laterales con Mancuerna') }),
            ex({ id: 'gd2_e5', name: 'Pájaros Sentado en Banco', sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 0.5, alternatives: catAlts('Pájaros Sentado en Banco') })
          ]
        },
        useWalkingLunges({
          id: 'day3',
          name: 'Día 3 — Cuádriceps y Glúteo',
          focus: 'Cuádriceps, Glúteo Medio y Femoral',
          recommendedDay: 'Jueves',
          warmup: [
            { id: 'gw3_1', name: 'Sentadilla al aire con pausa abajo', target: '2 × 10', tip: 'Baja profundo con pausa de 2s para lubricar rodillas.', timerSec: 45 },
            { id: 'gw3_2', name: 'Puente de Glúteo en Suelo', target: '2 × 15', tip: 'Pre-activa glúteos antes de las sentadillas.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'gd3_e1', name: 'Sentadilla Goblet Talones Elevados', sets: 4, minReps: 10, maxReps: 15, restSec: 90, bilateral: false, alternatives: catAlts('Sentadilla Goblet Talones Elevados') }),
            ex({ id: 'gd3_e2', name: 'Zancadas Atrás con Mancuernas', sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 1, note: 'Por pierna', alternatives: catAlts('Zancadas Atrás con Mancuernas') }),
            ex({ id: 'gd3_e3', name: 'Hip Thrust en Banco con Mancuernas', sets: 3, minReps: 12, maxReps: 15, restSec: 90, bilateral: false, alternatives: catAlts('Hip Thrust en Banco con Mancuernas') }),
            ex({ id: 'gd3_e4', name: 'Curl Femoral Acostado con Banda', sets: 3, minReps: 12, maxReps: 15, restSec: 60, equipment: 'band', stepKg: 0, alternatives: catAlts('Curl Femoral Acostado con Banda', ['Plancha Frontal']) })
          ]
        }, hallway),
        {
          id: 'day4',
          name: 'Día 4 — Espalda, Hombros y Brazos',
          focus: 'Espalda Unilateral, Deltoides y Superserie Brazos',
          recommendedDay: 'Viernes',
          warmup: [
            { id: 'gw4_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Abre movilidad de hombro antes del Press Militar.', timerSec: 45 },
            { id: 'gw4_2', name: 'Bombeo de codos con banda (curl + extensión)', target: '2 × 15', tip: 'Prepara codos para la superserie de brazos.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'gd4_e1', name: 'Remo Serrucho a un Brazo en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 75, bilateral: false, stepKg: 1, note: 'Por lado', alternatives: catAlts('Remo Serrucho a un Brazo en Banco') }),
            ex({ id: 'gd4_e2', name: 'Press Militar Sentado en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Press Militar Sentado en Banco') }),
            ex({ id: 'gd4_e3', name: 'Curl Martillo con Mancuernas', sets: 3, minReps: 10, maxReps: 14, restSec: 15, stepKg: 0.5, superset: 'SUPERSERIE A', alternatives: catAlts('Curl Martillo con Mancuernas') }),
            ex({ id: 'gd4_e4', name: 'Copa de Tríceps con Mancuerna', sets: 3, minReps: 10, maxReps: 14, restSec: 75, bilateral: false, stepKg: 1, superset: 'SUPERSERIE A', alternatives: catAlts('Copa de Tríceps con Mancuerna') }),
            ex({ id: 'gd4_e5', name: 'Flexiones en Suelo', sets: 3, minReps: 8, maxReps: 15, restSec: 75, equipment: 'bodyweight', stepKg: 1, alternatives: catAlts('Flexiones en Suelo') })
          ]
        }
      ];
      return days;
    }
  },
  {
    id: 'fullbody_3d',
    name: 'Full Body Equilibrado (3 Días)',
    badge: '45–50 min • Sin Barra',
    summary: 'Sesión corta Lun-Mié-Vie. Core en A y C, y pullover en un día, sin alargar la hora.',
    requiresPullupBar: false,
    build() {
      return [
        {
          id: 'day1',
          name: 'Día 1 — Full Body A',
          focus: 'Cuádriceps, Pecho, Espalda, Hombro y Core',
          recommendedDay: 'Lunes',
          warmup: [
            { id: 'fb1_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Rota hombros suave con brazos rectos.', timerSec: 45 },
            { id: 'fb1_2', name: 'Sentadilla al aire con pausa abajo', target: '2 × 10', tip: 'Lubrica rodillas y tobillos.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'f1_e1', name: 'Sentadilla Goblet Talones Elevados', sets: 3, minReps: 10, maxReps: 15, restSec: 90, bilateral: false, alternatives: catAlts('Sentadilla Goblet Talones Elevados') }),
            ex({ id: 'f1_e2', name: 'Press Inclinado con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Press Inclinado con Mancuernas') }),
            ex({ id: 'f1_e3', name: 'Remo Pecho Apoyado en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Remo Pecho Apoyado en Banco') }),
            ex({ id: 'f1_e4', name: 'Elevaciones Laterales con Mancuerna', sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 0.5, alternatives: catAlts('Elevaciones Laterales con Mancuerna') }),
            ex({ id: 'f1_e5', name: 'Plancha Frontal', sets: 2, minReps: 20, maxReps: 40, restSec: 45, equipment: 'bodyweight', stepKg: 0, note: 'Segundos', alternatives: catAlts('Plancha Frontal') })
          ]
        },
        {
          id: 'day2',
          name: 'Día 2 — Full Body B',
          focus: 'Glúteo, Isquiotibiales, Hombro y Brazos',
          recommendedDay: 'Miércoles',
          warmup: [
            { id: 'fb2_1', name: 'Puente de Glúteo en Suelo', target: '2 × 12', tip: 'Activa glúteos antes del Peso Muerto Rumano.', timerSec: 45 },
            { id: 'fb2_2', name: 'Band Pull-Aparts + Rotación externa', target: '2 × 12', tip: 'Estabiliza escápulas antes del Press Militar.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'f2_e1', name: 'Peso Muerto Rumano con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 120, alternatives: catAlts('Peso Muerto Rumano con Mancuernas') }),
            ex({ id: 'f2_e2', name: 'Press Militar Sentado en Banco', sets: 3, minReps: 8, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Press Militar Sentado en Banco') }),
            ex({ id: 'f2_e3', name: 'Remo Serrucho a un Brazo en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 75, bilateral: false, stepKg: 1, note: 'Por lado', alternatives: catAlts('Remo Serrucho a un Brazo en Banco') }),
            ex({ id: 'f2_e4', name: 'Curl Martillo con Mancuernas', sets: 3, minReps: 10, maxReps: 12, restSec: 15, stepKg: 1, superset: 'SUPERSERIE A', alternatives: catAlts('Curl Martillo con Mancuernas') }),
            ex({ id: 'f2_e5', name: 'Copa de Tríceps con Mancuerna', sets: 3, minReps: 10, maxReps: 12, restSec: 75, bilateral: false, stepKg: 1, superset: 'SUPERSERIE A', alternatives: catAlts('Copa de Tríceps con Mancuerna') })
          ]
        },
        {
          id: 'day3',
          name: 'Día 3 — Full Body C',
          focus: 'Pierna Unilateral, Glúteo, Pecho, Dorsal y Core',
          recommendedDay: 'Viernes',
          warmup: [
            { id: 'fb3_1', name: 'Zancada con rotación (movilidad cadera)', target: '2 × 8 / lado', tip: 'Prepara cadera y rodillas para la Búlgara.', timerSec: 45 },
            { id: 'fb3_2', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Abre pecho y hombros.', timerSec: 45 }
          ],
          exercises: [
            ex({ id: 'f3_e1', name: 'Sentadilla Búlgara en Banco', sets: 3, minReps: 8, maxReps: 10, restSec: 90, stepKg: 1, note: 'Por pierna', alternatives: catAlts('Sentadilla Búlgara en Banco') }),
            ex({ id: 'f3_e2', name: 'Hip Thrust en Banco con Mancuernas', sets: 3, minReps: 12, maxReps: 15, restSec: 90, bilateral: false, alternatives: catAlts('Hip Thrust en Banco con Mancuernas') }),
            ex({ id: 'f3_e3', name: 'Press Plano con Mancuernas', sets: 3, minReps: 10, maxReps: 12, restSec: 90, stepKg: 1, alternatives: catAlts('Press Plano con Mancuernas') }),
            ex({ id: 'f3_e4', name: 'Pullover con Mancuerna en Banco', sets: 2, minReps: 10, maxReps: 12, restSec: 75, bilateral: false, stepKg: 1, alternatives: catAlts('Pullover con Mancuerna en Banco') }),
            ex({ id: 'f3_e5', name: 'Pájaros Sentado en Banco', sets: 3, minReps: 12, maxReps: 15, restSec: 60, stepKg: 0.5, alternatives: catAlts('Pájaros Sentado en Banco') }),
            ex({ id: 'f3_e6', name: 'Plancha Frontal', sets: 2, minReps: 20, maxReps: 40, restSec: 45, equipment: 'bodyweight', stepKg: 0, note: 'Segundos', alternatives: catAlts('Plancha Frontal') })
          ]
        }
      ];
    }
  },
  {
    id: 'strength_nobar_4d',
    name: 'Torso / Extremidades Sin Barra (4 Días)',
    badge: 'Solo Mancuernas + Banco',
    summary: 'La misma estructura de 4 días: un remo por día de torso, pullover para dorsal y pájaros en lugar del face pull en barra.',
    requiresPullupBar: false,
    build(ctx = {}) {
      const equipment = {
        hasBench: true,
        hasDeclineBench: false,
        hasBands: true,
        bandCount: 1,
        maxDumbbellKg: 20,
        hasWeightBelt: false,
        hasVest: false,
        ...(ctx.equipment || {}),
        hasPullupBar: false
      };
      const { routines } = planRoutineAdaptation(buildAlphaHomeDays(), equipment, ctxSpace(ctx));
      for (const day of routines) {
        for (const item of day.exercises) {
          if (/remo/i.test(item.name)) {
            item.sets = 4;
            item.minReps = 8;
            item.maxReps = 12;
          }
        }
      }
      return routines;
    }
  }
];

export function getTemplateById(templateId) {
  return ROUTINE_TEMPLATES.find((t) => t.id === templateId) || ROUTINE_TEMPLATES[0];
}
