/**
 * AlphaHome — Plantillas de Rutina Precargadas (Personalizables por Persona)
 * Incluye la rutina original de AlphaHome más opciones sin barra de dominadas,
 * foco en glúteo/pierna + torso y Full Body de 3 días.
 */

export const ROUTINE_TEMPLATES = [
  {
    id: 'alphahome_4d',
    name: 'Torso / Extremidades (4 Días)',
    badge: 'Clásica AlphaHome',
    summary: 'Fuerza e hipertrofia completa con mancuernas, banco, bandas y barra de dominadas.',
    requiresPullupBar: true,
    build() {
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
            {
              id: 'd1_e1', name: 'Press Inclinado con Mancuernas',
              sets: 3, minReps: 8, maxReps: 10, restSec: 120,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Press inclinado con pausa 2s', 'Flexiones declinadas con chaleco']
            },
            {
              id: 'd1_e2', name: 'Dominadas Pronas/Neutras en Barra',
              sets: 3, minReps: 6, maxReps: 10, restSec: 120,
              equipment: 'bodyweight', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Dominadas con chaleco', 'Dominadas lastradas con cadena', 'Remo Pecho Apoyado en Banco']
            },
            {
              id: 'd1_e3', name: 'Remo Pecho Apoyado en Banco',
              sets: 3, minReps: 8, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Remo Serrucho a un Brazo en Banco', 'Remo con banda + mancuernas']
            },
            {
              id: 'd1_e4', name: 'Aperturas Inclinadas con Mancuernas',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Aperturas con Banda de Resistencia', 'Flexiones con banda']
            },
            {
              id: 'd1_e5', name: 'Face Pull con Banda en Barra',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'band', bilateral: true, stepKg: 0, superset: null,
              alternatives: ['Pájaros Sentado en Banco']
            }
          ]
        },
        {
          id: 'day2',
          name: 'Día 2 — Extremidades A',
          focus: 'Hombro, Brazos y Cuádriceps',
          recommendedDay: 'Martes',
          warmup: [
            { id: 'w2_1', name: 'Rotación externa con banda + círculos de hombro', target: '2 × 12', tip: 'Calienta deltoides antes de abrir con Elevaciones Laterales.', timerSec: 45 },
            { id: 'w2_2', name: 'Bombeo de codos con banda (extensión + curl suave)', target: '2 × 15', tip: 'Prepara los codos para la superserie de bíceps y tríceps sin dolor.', timerSec: 45 },
            { id: 'w2_3', name: 'Movilidad de tobillo y cadera (zancada con rotación)', target: '2 × 8 / lado', tip: 'Mejora profundidad y estabilidad para Búlgara y Goblet.', timerSec: 60 },
            { id: 'w2_4', name: 'Sentadilla al aire con pausa abajo', target: '2 × 10', tip: 'Pausa de 2s abajo para lubricar rodillas y activar cuádriceps.', timerSec: 45 }
          ],
          exercises: [
            {
              id: 'd2_e1', name: 'Elevaciones Laterales con Mancuerna',
              sets: 4, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Elevaciones laterales con banda', 'Laterales recostado en banco inclinado']
            },
            {
              id: 'd2_e2', name: 'Sentadilla Búlgara en Banco',
              sets: 3, minReps: 8, maxReps: 10, restSec: 120,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null, note: 'Por pierna',
              alternatives: ['Sentadilla búlgara con chaleco', 'Zancadas Atrás con Mancuernas']
            },
            {
              id: 'd2_e3', name: 'Curl Inclinado en Banco 45°',
              sets: 3, minReps: 10, maxReps: 12, restSec: 15,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: 'SUPERSERIE A',
              alternatives: ['Curl Martillo con Mancuernas', 'Curl con banda']
            },
            {
              id: 'd2_e4', name: 'Extensión de Tríceps con Banda en Barra',
              sets: 3, minReps: 10, maxReps: 12, restSec: 75,
              equipment: 'band', bilateral: true, stepKg: 0, superset: 'SUPERSERIE B',
              alternatives: ['Copa de Tríceps con Mancuerna', 'Patada de Tríceps con Mancuerna']
            },
            {
              id: 'd2_e5', name: 'Sentadilla Goblet Talones Elevados',
              sets: 3, minReps: 10, maxReps: 15, restSec: 90,
              equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null,
              alternatives: ['Sentadilla Goblet con chaleco', 'Sentadilla con pausa 2s']
            }
          ]
        },
        {
          id: 'day3',
          name: 'Día 3 — Torso B',
          focus: 'Pecho, Espalda y Hombro Posterior (Hipertrofia)',
          recommendedDay: 'Jueves',
          warmup: [
            { id: 'w3_1', name: 'Círculos escapulares + retracciones con banda', target: '2 × 12', tip: 'Despierta espalda media y hombros antes de empujar y jalar.', timerSec: 45 },
            { id: 'w3_2', name: 'Rotación externa a 90° con banda (posición L)', target: '2 × 12 / lado', tip: 'Protege el manguito rotador y la cápsula anterior para el Press Plano.', timerSec: 45 },
            { id: 'w3_3', name: 'Bombeo de codos con banda (curl + extensión)', target: '2 × 15', tip: 'Clave antes de las Dominadas Supinas para proteger tendón de bíceps y codo.', timerSec: 45 },
            { id: 'w3_4', name: 'Movilidad de muñecas + 1 serie ligera de aproximación', target: '1 min', tip: 'Círculos y apoyos suaves de muñeca + 10 reps ligeras de Press Plano.', timerSec: 60 }
          ],
          exercises: [
            {
              id: 'd3_e1', name: 'Press Plano con Mancuernas',
              sets: 3, minReps: 10, maxReps: 12, restSec: 120,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Flexiones en Suelo', 'Press plano con banda en espalda']
            },
            {
              id: 'd3_e2', name: 'Dominadas Supinas en Barra',
              sets: 3, minReps: 6, maxReps: 10, restSec: 120,
              equipment: 'bodyweight', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Dominadas supinas con chaleco', 'Remo Serrucho a un Brazo en Banco']
            },
            {
              id: 'd3_e3', name: 'Remo Serrucho a un Brazo en Banco',
              sets: 3, minReps: 10, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null, note: 'Por lado',
              alternatives: ['Remo con banda a un brazo', 'Remo Pecho Apoyado en Banco']
            },
            {
              id: 'd3_e4', name: 'Aperturas con Banda de Resistencia',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'band', bilateral: true, stepKg: 0, superset: null,
              alternatives: ['Press cerrado con mancuernas', 'Aperturas Inclinadas con Mancuernas']
            },
            {
              id: 'd3_e5', name: 'Pájaros Sentado en Banco',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Face Pull con Banda en Barra']
            }
          ]
        },
        {
          id: 'day4',
          name: 'Día 4 — Extremidades B',
          focus: 'Hombro, Brazos y Cadena Posterior',
          recommendedDay: 'Viernes',
          warmup: [
            { id: 'w4_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Abre el rango de movimiento vertical antes del Press Militar Sentado.', timerSec: 45 },
            { id: 'w4_2', name: 'Rotación externa + extensiones ligeras de tríceps con banda', target: '2 × 15', tip: 'Indispensable para lubricar codos antes del Press Francés con mancuernas.', timerSec: 45 },
            { id: 'w4_3', name: 'Bisagra de cadera con banda (Good Mornings)', target: '2 × 12', tip: 'Activa isquiotibiales y espalda baja para el Peso Muerto Rumano.', timerSec: 45 },
            { id: 'w4_4', name: 'Puente de Glúteo en Suelo', target: '2 × 12', tip: 'Despierta glúteos sin fatiga antes de pasar a la carga en banco.', timerSec: 45 }
          ],
          exercises: [
            {
              id: 'd4_e1', name: 'Press Militar Sentado en Banco',
              sets: 3, minReps: 8, maxReps: 10, restSec: 120,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Press Arnold sentado', 'Press militar a un brazo de pie']
            },
            {
              id: 'd4_e2', name: 'Peso Muerto Rumano con Mancuernas',
              sets: 3, minReps: 8, maxReps: 12, restSec: 120,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Peso muerto rumano B-stance', 'Curl Femoral Acostado con Banda']
            },
            {
              id: 'd4_e3', name: 'Curl Martillo con Mancuernas',
              sets: 3, minReps: 10, maxReps: 12, restSec: 15,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: 'SUPERSERIE A',
              alternatives: ['Curl Zottman', 'Curl martillo con banda']
            },
            {
              id: 'd4_e4', name: 'Press Francés con Mancuernas en Banco',
              sets: 3, minReps: 10, maxReps: 12, restSec: 75,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: 'SUPERSERIE B',
              alternatives: ['Copa de Tríceps con Mancuerna']
            },
            {
              id: 'd4_e5', name: 'Hip Thrust en Banco con Mancuernas',
              sets: 3, minReps: 12, maxReps: 15, restSec: 90,
              equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null,
              alternatives: ['Curl Femoral Acostado con Banda', 'Puente de Glúteo en Suelo']
            }
          ]
        }
      ];
    }
  },

  {
    id: 'glute_lower_4d',
    name: 'Glúteo, Pierna y Torso (4 Días)',
    badge: 'Énfasis Tren Inferior',
    summary: 'Ideal en casa sin barra de dominadas: 2 días fuertes de glúteo/pierna y 2 de torso equilibrado.',
    requiresPullupBar: false,
    build() {
      return [
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
            {
              id: 'gd1_e1', name: 'Hip Thrust en Banco con Mancuernas',
              sets: 4, minReps: 10, maxReps: 15, restSec: 90,
              equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null,
              alternatives: ['Puente de Glúteo en Suelo']
            },
            {
              id: 'gd1_e2', name: 'Peso Muerto Rumano con Mancuernas',
              sets: 3, minReps: 8, maxReps: 12, restSec: 120,
              equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
              alternatives: ['Peso muerto rumano B-stance']
            },
            {
              id: 'gd1_e3', name: 'Sentadilla Búlgara en Banco',
              sets: 3, minReps: 8, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, note: 'Por pierna',
              alternatives: ['Zancadas Atrás con Mancuernas']
            },
            {
              id: 'gd1_e4', name: 'Curl Femoral Acostado con Banda',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'band', bilateral: true, stepKg: 0, superset: null,
              alternatives: ['Puente de Glúteo en Suelo']
            }
          ]
        },
        {
          id: 'day2',
          name: 'Día 2 — Torso y Postura A',
          focus: 'Espalda, Pecho y Hombros',
          recommendedDay: 'Martes',
          warmup: [
            { id: 'gw2_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Lubrica hombros con agarre cómodo y brazos estirados.', timerSec: 45 },
            { id: 'gw2_2', name: 'Band Pull-Aparts + Rotación externa', target: '2 × 12', tip: 'Activa espalda alta y manguito rotador.', timerSec: 45 }
          ],
          exercises: [
            {
              id: 'gd2_e1', name: 'Remo Pecho Apoyado en Banco',
              sets: 3, minReps: 10, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Remo Serrucho a un Brazo en Banco']
            },
            {
              id: 'gd2_e2', name: 'Press Inclinado con Mancuernas',
              sets: 3, minReps: 10, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Flexiones en Suelo', 'Press Plano con Mancuernas']
            },
            {
              id: 'gd2_e3', name: 'Elevaciones Laterales con Mancuerna',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'dumbbell', bilateral: true, stepKg: 0.5, superset: null,
              alternatives: ['Elevaciones laterales con banda']
            },
            {
              id: 'gd2_e4', name: 'Pájaros Sentado en Banco',
              sets: 3, minReps: 12, maxReps: 15, restSec: 60,
              equipment: 'dumbbell', bilateral: true, stepKg: 0.5, superset: null,
              alternatives: ['Face Pull con Banda en Barra']
            }
          ]
        },
        {
          id: 'day3',
          name: 'Día 3 — Cuádriceps y Glúteo',
          focus: 'Cuádriceps, Glúteo Medio y Estabilidad',
          recommendedDay: 'Jueves',
          warmup: [
            { id: 'gw3_1', name: 'Sentadilla al aire con pausa abajo', target: '2 × 10', tip: 'Baja profundo con pausa de 2s para lubricar rodillas.', timerSec: 45 },
            { id: 'gw3_2', name: 'Puente de Glúteo en Suelo', target: '2 × 15', tip: 'Pre-activa glúteos antes de las sentadillas.', timerSec: 45 }
          ],
          exercises: [
            {
              id: 'gd3_e1', name: 'Sentadilla Goblet Talones Elevados',
              sets: 4, minReps: 10, maxReps: 15, restSec: 90,
              equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null,
              alternatives: ['Sentadilla con pausa 2s']
            },
            {
              id: 'gd3_e2', name: 'Zancadas Atrás con Mancuernas',
              sets: 3, minReps: 10, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, note: 'Por pierna',
              alternatives: ['Sentadilla Búlgara en Banco']
            },
            {
              id: 'gd3_e3', name: 'Hip Thrust en Banco con Mancuernas',
              sets: 3, minReps: 12, maxReps: 15, restSec: 90,
              equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null,
              alternatives: ['Puente de Glúteo en Suelo']
            },
            {
              id: 'gd3_e4', name: 'Puente de Glúteo en Suelo',
              sets: 3, minReps: 15, maxReps: 20, restSec: 60,
              equipment: 'bodyweight', bilateral: true, stepKg: 1, superset: null, note: 'Pausa 1s arriba',
              alternatives: ['Curl Femoral Acostado con Banda']
            }
          ]
        },
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
            {
              id: 'gd4_e1', name: 'Remo Serrucho a un Brazo en Banco',
              sets: 3, minReps: 10, maxReps: 12, restSec: 75,
              equipment: 'dumbbell', bilateral: false, stepKg: 1, superset: null, note: 'Por lado',
              alternatives: ['Remo Pecho Apoyado en Banco']
            },
            {
              id: 'gd4_e2', name: 'Press Militar Sentado en Banco',
              sets: 3, minReps: 10, maxReps: 12, restSec: 90,
              equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Press Arnold sentado']
            },
            {
              id: 'gd4_e3', name: 'Curl Martillo con Mancuernas',
              sets: 3, minReps: 10, maxReps: 14, restSec: 15,
              equipment: 'dumbbell', bilateral: true, stepKg: 0.5, superset: 'SUPERSERIE A',
              alternatives: ['Curl Inclinado en Banco 45°']
            },
            {
              id: 'gd4_e4', name: 'Copa de Tríceps con Mancuerna',
              sets: 3, minReps: 10, maxReps: 14, restSec: 60,
              equipment: 'dumbbell', bilateral: false, stepKg: 1, superset: 'SUPERSERIE B',
              alternatives: ['Patada de Tríceps con Mancuerna', 'Press Francés con Mancuernas en Banco']
            },
            {
              id: 'gd4_e5', name: 'Flexiones en Suelo',
              sets: 3, minReps: 8, maxReps: 15, restSec: 75,
              equipment: 'bodyweight', bilateral: true, stepKg: 1, superset: null,
              alternatives: ['Press Plano con Mancuernas', 'Aperturas con Banda de Resistencia']
            }
          ]
        }
      ];
    }
  },

  {
    id: 'fullbody_3d',
    name: 'Full Body Equilibrado (3 Días)',
    badge: '45–50 min • Sin Barra',
    summary: 'Entrenamiento integral Lunes-Miércoles-Viernes solo con mancuernas, banco y bandas.',
    requiresPullupBar: false,
    build() {
      return [
        {
          id: 'day1',
          name: 'Día 1 — Full Body A',
          focus: 'Cuádriceps, Pecho, Espalda y Hombro',
          recommendedDay: 'Lunes',
          warmup: [
            { id: 'fb1_1', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Rota hombros suave con brazos rectos.', timerSec: 45 },
            { id: 'fb1_2', name: 'Sentadilla al aire con pausa abajo', target: '2 × 10', tip: 'Lubrica rodillas y tobillos.', timerSec: 45 }
          ],
          exercises: [
            { id: 'f1_e1', name: 'Sentadilla Goblet Talones Elevados', sets: 3, minReps: 10, maxReps: 15, restSec: 90, equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null, alternatives: ['Zancadas Atrás con Mancuernas'] },
            { id: 'f1_e2', name: 'Press Inclinado con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 90, equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, alternatives: ['Flexiones en Suelo'] },
            { id: 'f1_e3', name: 'Remo Pecho Apoyado en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 90, equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, alternatives: ['Remo Serrucho a un Brazo en Banco'] },
            { id: 'f1_e4', name: 'Elevaciones Laterales con Mancuerna', sets: 3, minReps: 12, maxReps: 15, restSec: 60, equipment: 'dumbbell', bilateral: true, stepKg: 0.5, superset: null, alternatives: ['Pájaros Sentado en Banco'] }
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
            { id: 'f2_e1', name: 'Peso Muerto Rumano con Mancuernas', sets: 3, minReps: 8, maxReps: 12, restSec: 120, equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null, alternatives: ['Curl Femoral Acostado con Banda'] },
            { id: 'f2_e2', name: 'Press Militar Sentado en Banco', sets: 3, minReps: 8, maxReps: 12, restSec: 90, equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, alternatives: ['Elevaciones Laterales con Mancuerna'] },
            { id: 'f2_e3', name: 'Remo Serrucho a un Brazo en Banco', sets: 3, minReps: 10, maxReps: 12, restSec: 75, equipment: 'dumbbell', bilateral: false, stepKg: 1, superset: null, note: 'Por lado', alternatives: ['Remo Pecho Apoyado en Banco'] },
            { id: 'f2_e4', name: 'Curl Martillo con Mancuernas', sets: 3, minReps: 10, maxReps: 12, restSec: 15, equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: 'SUPERSERIE A', alternatives: ['Curl Inclinado en Banco 45°'] },
            { id: 'f2_e5', name: 'Copa de Tríceps con Mancuerna', sets: 3, minReps: 10, maxReps: 12, restSec: 60, equipment: 'dumbbell', bilateral: false, stepKg: 1, superset: 'SUPERSERIE B', alternatives: ['Press Francés con Mancuernas en Banco'] }
          ]
        },
        {
          id: 'day3',
          name: 'Día 3 — Full Body C',
          focus: 'Pierna Unilateral, Glúteo, Pecho y Espalda Alta',
          recommendedDay: 'Viernes',
          warmup: [
            { id: 'fb3_1', name: 'Zancada con rotación (movilidad cadera)', target: '2 × 8 / lado', tip: 'Prepara cadera y rodillas para la Búlgara.', timerSec: 45 },
            { id: 'fb3_2', name: 'Dislocaciones / Pases con Banda', target: '2 × 10', tip: 'Abre pecho y hombros.', timerSec: 45 }
          ],
          exercises: [
            { id: 'f3_e1', name: 'Sentadilla Búlgara en Banco', sets: 3, minReps: 8, maxReps: 10, restSec: 90, equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, note: 'Por pierna', alternatives: ['Zancadas Atrás con Mancuernas'] },
            { id: 'f3_e2', name: 'Hip Thrust en Banco con Mancuernas', sets: 3, minReps: 12, maxReps: 15, restSec: 90, equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null, alternatives: ['Puente de Glúteo en Suelo'] },
            { id: 'f3_e3', name: 'Press Plano con Mancuernas', sets: 3, minReps: 10, maxReps: 12, restSec: 90, equipment: 'dumbbell', bilateral: true, stepKg: 1, superset: null, alternatives: ['Flexiones en Suelo'] },
            { id: 'f3_e4', name: 'Pájaros Sentado en Banco', sets: 3, minReps: 12, maxReps: 15, restSec: 60, equipment: 'dumbbell', bilateral: true, stepKg: 0.5, superset: null, alternatives: ['Face Pull con Banda en Barra'] }
          ]
        }
      ];
    }
  },

  {
    id: 'strength_nobar_4d',
    name: 'Torso / Extremidades Sin Barra (4 Días)',
    badge: 'Solo Mancuernas + Banco',
    summary: 'La misma estructura de 4 días de AlphaHome sustituyendo dominadas por remos y copa de tríceps.',
    requiresPullupBar: false,
    build() {
      const base = ROUTINE_TEMPLATES[0].build();
      // Día 1: reemplazar dominadas + colgadas escapulares
      base[0].warmup[3] = { id: 'w1_4b', name: 'Círculos escapulares + retracciones con banda', target: '2 × 12', tip: 'Activa espalda media antes de los remos.', timerSec: 40 };
      base[0].exercises[1] = {
        id: 'd1_e2', name: 'Remo Serrucho a un Brazo en Banco',
        sets: 3, minReps: 8, maxReps: 12, restSec: 90,
        equipment: 'dumbbell', bilateral: false, stepKg: 2, superset: null, note: 'Por lado',
        alternatives: ['Remo Pecho Apoyado en Banco']
      };
      // Día 2: reemplazar extensión banda en barra por Copa de Tríceps
      base[1].exercises[3] = {
        id: 'd2_e4', name: 'Copa de Tríceps con Mancuerna',
        sets: 3, minReps: 10, maxReps: 12, restSec: 75,
        equipment: 'dumbbell', bilateral: false, stepKg: 1, superset: 'SUPERSERIE B',
        alternatives: ['Press Francés con Mancuernas en Banco', 'Patada de Tríceps con Mancuerna']
      };
      // Día 3: reemplazar dominadas supinas por Remo Pecho Apoyado
      base[2].exercises[1] = {
        id: 'd3_e2', name: 'Remo Pecho Apoyado en Banco',
        sets: 3, minReps: 10, maxReps: 12, restSec: 90,
        equipment: 'dumbbell', bilateral: true, stepKg: 2, superset: null,
        alternatives: ['Remo Serrucho a un Brazo en Banco']
      };
      return base;
    }
  }
];

export function getTemplateById(templateId) {
  return ROUTINE_TEMPLATES.find((t) => t.id === templateId) || ROUTINE_TEMPLATES[0];
}
