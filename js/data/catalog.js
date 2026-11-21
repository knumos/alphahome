/**
 * AlphaHome — Catálogo Maestro de Ejercicios y Guías Técnicas
 * Cada ejercicio está enlazado a su arquetipo 3D exacto en js/svg/poses.js.
 */

export const EXERCISE_CATALOG = [
  // ---- PECHO ----
  {
    id: 'incline_press',
    name: 'Press Inclinado con Mancuernas',
    group: 'Pecho',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 10, restSec: 120,
    archetype: 'incline_press',
    muscles: 'Pectoral superior • Deltoide anterior • Tríceps',
    alternatives: ['Press inclinado con pausa 2s', 'Flexiones declinadas con chaleco'],
    cues: [
      ['Postura', 'Banco a 30°, omóplatos retraídos y pies firmes en el suelo sin despegar glúteos.'],
      ['Recorrido', 'Baja en 2 segundos con codos a ~45° del torso hasta rozar la línea clavicular; sube convergiendo suavemente.'],
      ['Error común', 'Abrir los codos a 90° en forma de T o arquear en exceso la zona lumbar.']
    ]
  },
  {
    id: 'flat_press',
    name: 'Press Plano con Mancuernas',
    group: 'Pecho',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 10, maxReps: 12, restSec: 120,
    archetype: 'flat_press',
    muscles: 'Pectoral mayor • Deltoide anterior • Tríceps',
    alternatives: ['Press Declinado con Mancuernas', 'Flexiones con chaleco y pies en banco', 'Press plano con banda en espalda'],
    cues: [
      ['Postura', 'Acostado en banco horizontal, escápulas juntas hacia atrás y abajo, pies firmes.'],
      ['Recorrido', 'Baja con codos a ~45° hasta que las mancuernas queden al nivel del pecho y empuja en arco sutil.'],
      ['Error común', 'Rebotar abajo o abrir los codos a 90° cargando el hombro anterior.']
    ]
  },
  {
    id: 'decline_press',
    name: 'Press Declinado con Mancuernas',
    group: 'Pecho',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 12, restSec: 120,
    archetype: 'decline_press',
    muscles: 'Pectoral inferior (costal) • Pectoral esternal • Tríceps',
    alternatives: ['Press Plano con Mancuernas', 'Aperturas Declinadas con Mancuernas', 'Flexiones en Suelo'],
    cues: [
      ['Postura', 'Banco declinado (−15° a −20°), tobillos bien sujetos en los rodillos y escápulas retraídas.'],
      ['Recorrido', 'Baja controlado con codos a ~45° hacia la línea inferior del pecho y empuja verticalmente arriba.'],
      ['Error común', 'Bajar las mancuernas hacia el cuello en vez del pecho inferior o rebotar abajo.']
    ]
  },
  {
    id: 'incline_fly',
    name: 'Aperturas Inclinadas con Mancuernas',
    group: 'Pecho',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'incline_fly',
    muscles: 'Pectoral superior • Pectoral esternal',
    alternatives: ['Aperturas Declinadas con Mancuernas', 'Aperturas con Banda de Resistencia', 'Flexiones con banda'],
    cues: [
      ['Postura', 'Banco a 30° con ligera flexión fija en los codos (~15–20°) durante toda la serie.'],
      ['Recorrido', 'Abre en arco amplio hasta sentir estiramiento cómodo en el pecho y cierra como en un abrazo.'],
      ['Error común', 'Bajar demasiado forzando la cápsula anterior del hombro o convertirlo en un press.']
    ]
  },
  {
    id: 'decline_fly',
    name: 'Aperturas Declinadas con Mancuernas',
    group: 'Pecho',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'decline_fly',
    muscles: 'Pectoral inferior • Pectoral esternal',
    alternatives: ['Aperturas Inclinadas con Mancuernas', 'Aperturas con Banda de Resistencia'],
    cues: [
      ['Postura', 'Banco declinado (−15° a −20°), piernas aseguradas en los rodillos y leve flexión fija de codos (~18°).'],
      ['Recorrido', 'Abre en arco controlado hasta sentir estiramiento suave y cierra arriba sobre el pecho inferior.'],
      ['Error común', 'Extender por completo los codos o bajar demasiado cargando la articulación del hombro.']
    ]
  },
  {
    id: 'band_fly',
    name: 'Aperturas con Banda de Resistencia',
    group: 'Pecho',
    equipment: 'band',
    bilateral: true,
    stepKg: 0,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'band_fly',
    muscles: 'Pectoral mayor • Deltoide anterior',
    alternatives: ['Aperturas Inclinadas con Mancuernas', 'Press cerrado con mancuernas'],
    cues: [
      ['Postura', 'Rodea tu espalda con la banda, da un paso adelante para estabilidad y semiflexiona codos.'],
      ['Recorrido', 'Junta las manos frente al esternón apretando el pecho 1 segundo y controla el retorno.'],
      ['Error común', 'Encorvar los hombros hacia adelante al cerrar o perder tensión atrás.']
    ]
  },
  {
    id: 'pushup',
    name: 'Flexiones en Suelo',
    group: 'Pecho',
    equipment: 'bodyweight',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 15, restSec: 90,
    archetype: 'pushup',
    muscles: 'Pectoral mayor • Tríceps • Core',
    alternatives: ['Flexiones declinadas con chaleco', 'Flexiones con banda', 'Press Plano con Mancuernas'],
    cues: [
      ['Postura', 'Cuerpo rígido en plancha de cabeza a tobillos, abdomen y glúteos firmes.'],
      ['Recorrido', 'Baja el pecho cerca del suelo con codos a ~45° hacia atrás y empuja sin hundir la cadera.'],
      ['Error común', 'Dejar caer la zona lumbar o abrir los codos completamente hacia los lados.']
    ]
  },

  // ---- ESPALDA ----
  {
    id: 'pullup',
    name: 'Dominadas Pronas/Neutras en Barra',
    group: 'Espalda',
    equipment: 'bodyweight',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 6, maxReps: 10, restSec: 120,
    archetype: 'pullup',
    muscles: 'Dorsal ancho • Espalda media • Bíceps',
    alternatives: ['Dominadas con chaleco', 'Dominadas lastradas con cadena', 'Remo Pecho Apoyado en Banco'],
    cues: [
      ['Postura', 'Agarre ligeramente más ancho que hombros, abdomen activo y piernas estables sin balanceo.'],
      ['Recorrido', 'Inicia deprimiendo escápulas y lleva el pecho hacia la barra; controla la bajada hasta extender codos.'],
      ['Error común', 'Dar tirones con las piernas o encoger los hombros hacia las orejas arriba.']
    ]
  },
  {
    id: 'chinup',
    name: 'Dominadas Supinas en Barra',
    group: 'Espalda',
    equipment: 'bodyweight',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 6, maxReps: 10, restSec: 120,
    archetype: 'chinup',
    muscles: 'Dorsal ancho • Bíceps braquial • Core',
    alternatives: ['Dominadas supinas con chaleco', 'Dominadas isométricas arriba', 'Remo Serrucho a un Brazo en Banco'],
    cues: [
      ['Postura', 'Palmas mirando hacia ti al ancho de los hombros, torso estable y abdomen contraído.'],
      ['Recorrido', 'Sube llevando la barbilla por encima de la barra con codos apuntando hacia adelante/abajo y baja controlado.'],
      ['Error común', 'Hacer medias repeticiones sin bajar del todo o abrir los codos hacia los costados.']
    ]
  },
  {
    id: 'chest_row',
    name: 'Remo Pecho Apoyado en Banco',
    group: 'Espalda',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 12, restSec: 90,
    archetype: 'chest_row',
    muscles: 'Dorsal • Romboides • Trapecio medio',
    alternatives: ['Remo Serrucho a un Brazo en Banco', 'Remo con banda + mancuernas'],
    cues: [
      ['Postura', 'Banco a 30–40°, pecho pegado al respaldo todo el tiempo y cuello neutro.'],
      ['Recorrido', 'Jala las mancuernas hacia la cadera en arco ligero, apretando escápulas 1 segundo arriba.'],
      ['Error común', 'Despegar el pecho del banco o jalar verticalmente encogiendo trapecios.']
    ]
  },
  {
    id: 'one_arm_row',
    name: 'Remo Serrucho a un Brazo en Banco',
    group: 'Espalda',
    equipment: 'dumbbell',
    bilateral: false,
    stepKg: 2,
    sets: 3, minReps: 10, maxReps: 12, restSec: 90,
    note: 'Por lado',
    archetype: 'one_arm_row',
    muscles: 'Dorsal ancho • Romboides • Core antirotación',
    alternatives: ['Remo con banda a un brazo', 'Remo Pecho Apoyado en Banco'],
    cues: [
      ['Postura', 'Mano y rodilla apoyadas en el banco horizontal, pie externo firme en suelo y espalda paralela al piso.'],
      ['Recorrido', 'Lleva la mancuerna en trayectoria curva hacia la cadera rozando el costado; estira abajo sin redondear lumbar.'],
      ['Error común', 'Rotar el torso para jalar más peso o subir el codo hacia el hombro.']
    ]
  },

  // ---- HOMBROS ----
  {
    id: 'overhead_press',
    name: 'Press Militar Sentado en Banco',
    group: 'Hombros',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 10, restSec: 120,
    archetype: 'overhead_press',
    muscles: 'Deltoide anterior y lateral • Tríceps',
    alternatives: ['Press Arnold sentado', 'Press militar a un brazo de pie'],
    cues: [
      ['Postura', 'Respaldo casi vertical (80°), glúteos y espalda apoyados, codos ~30° por delante del torso.'],
      ['Recorrido', 'Empuja verticalmente sobre la coronilla sin chocar mancuernas y baja controlado hasta la altura de las orejas.'],
      ['Error común', 'Arquear excesivamente la espalda baja o abrir los codos completamente a los lados.']
    ]
  },
  {
    id: 'lateral_raise',
    name: 'Elevaciones Laterales con Mancuerna',
    group: 'Hombros',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 4, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'lateral_raise',
    muscles: 'Deltoide lateral • Supraespinoso',
    alternatives: ['Elevaciones laterales con banda', 'Laterales recostado en banco inclinado'],
    cues: [
      ['Postura', 'Torso firme o ligeramente inclinado al frente, codos con leve flexión (~15°) y hombros abajo.'],
      ['Recorrido', 'Eleva en el plano escapular (~30° adelante) liderando con los codos hasta la altura del hombro.'],
      ['Error común', 'Subir con impulso lumbar o elevar los trapecios hacia las orejas.']
    ]
  },
  {
    id: 'face_pull',
    name: 'Face Pull con Banda en Barra',
    group: 'Hombros',
    equipment: 'band',
    bilateral: true,
    stepKg: 0,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'face_pull',
    muscles: 'Deltoide posterior • Manguito rotador • Trapecio medio',
    alternatives: ['Pájaros Sentado en Banco', 'Band Pull-Aparts'],
    cues: [
      ['Postura', 'Ancla la banda a la altura de la cara o ligeramente arriba, da un paso atrás con base estable.'],
      ['Recorrido', 'Jala hacia la frente separando las manos y rotando externamente (pose de doble bíceps) al final.'],
      ['Error común', 'Tirar hacia el pecho con codos caídos o inclinarse hacia atrás con el peso corporal.']
    ]
  },
  {
    id: 'rear_delt',
    name: 'Pájaros Sentado en Banco',
    group: 'Hombros',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'rear_delt',
    muscles: 'Deltoide posterior • Romboides',
    alternatives: ['Face Pull con Banda en Barra', 'Band Pull-Aparts'],
    cues: [
      ['Postura', 'Siéntate al borde del banco e inclina el pecho cerca de los muslos manteniendo la espalda neutra.'],
      ['Recorrido', 'Abre los brazos hacia los lados y ligeramente atrás (~45°) liderando con codos, sin encoger trapecios.'],
      ['Error común', 'Usar demasiado peso y balancear el torso hacia arriba en cada repetición.']
    ]
  },

  // ---- PIERNA Y GLÚTEO ----
  {
    id: 'bulgarian',
    name: 'Sentadilla Búlgara en Banco',
    group: 'Pierna / Glúteo',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 10, restSec: 120,
    note: 'Por pierna',
    archetype: 'bulgarian',
    muscles: 'Cuádriceps • Glúteo mayor • Estabilizadores de cadera',
    alternatives: ['Sentadilla búlgara con chaleco', 'Zancadas Atrás con Mancuernas'],
    cues: [
      ['Postura', 'Empeine trasero apoyado plano sobre el banco, pies al ancho de cadera (no en línea recta) y leve inclinación frontal.'],
      ['Recorrido', 'Baja la cadera y rodilla trasera hacia el suelo manteniendo la rodilla delantera alineada con la punta del pie.'],
      ['Error común', 'Dejar colapsar la rodilla delantera hacia adentro o empujar con la pierna trasera.']
    ]
  },
  {
    id: 'goblet_squat',
    name: 'Sentadilla Goblet Talones Elevados',
    group: 'Pierna / Glúteo',
    equipment: 'dumbbell',
    bilateral: false,
    stepKg: 2,
    sets: 3, minReps: 10, maxReps: 15, restSec: 90,
    archetype: 'goblet_squat',
    muscles: 'Cuádriceps • Glúteos • Core',
    alternatives: ['Sentadilla Goblet con chaleco', 'Sentadilla con pausa 2s'],
    cues: [
      ['Postura', 'Talones sobre una cuña o libro firme (2–3 cm), mancuerna vertical pegada al pecho y codos abajo.'],
      ['Recorrido', 'Desciende profundo manteniendo el torso erguido y las rodillas viajando sobre las puntas.'],
      ['Error común', 'Dejar caer el pecho hacia adelante o meter las rodillas hacia adentro al subir.']
    ]
  },
  {
    id: 'rdl',
    name: 'Peso Muerto Rumano con Mancuernas',
    group: 'Pierna / Glúteo',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 8, maxReps: 12, restSec: 120,
    archetype: 'rdl',
    muscles: 'Isquiotibiales • Glúteo mayor • Erectores espinales',
    alternatives: ['Peso muerto rumano B-stance', 'Peso muerto rumano a una pierna'],
    cues: [
      ['Postura', 'Pies al ancho de cadera, rodillas con leve flexión fija (~15°) y espalda completamente neutra.'],
      ['Recorrido', 'Empuja la cadera hacia atrás deslizando mancuernas pegadas a muslos hasta mitad de espinilla y sube apretando glúteos.'],
      ['Error común', 'Flexionar demasiado las rodillas (convertirlo en sentadilla) o redondear la lumbar.']
    ]
  },
  {
    id: 'hip_thrust',
    name: 'Hip Thrust en Banco con Mancuernas',
    group: 'Pierna / Glúteo',
    equipment: 'dumbbell',
    bilateral: false,
    stepKg: 2,
    sets: 3, minReps: 12, maxReps: 15, restSec: 90,
    archetype: 'hip_thrust',
    muscles: 'Glúteo mayor • Isquiotibiales',
    alternatives: ['Puente de Glúteo en Suelo', 'Curl Femoral Acostado con Banda'],
    cues: [
      ['Postura', 'Borde inferior de escápulas apoyado en el banco, mancuerna estable en cadera y mentón recogido.'],
      ['Recorrido', 'Empuja con los talones hasta alinear hombros, cadera y rodillas (espinillas verticales arriba) apretando glúteos 1s.'],
      ['Error común', 'Hiperextender la zona lumbar arriba o colocar los pies demasiado cerca/lejos del banco.']
    ]
  },
  {
    id: 'glute_bridge',
    name: 'Puente de Glúteo en Suelo',
    group: 'Pierna / Glúteo',
    equipment: 'bodyweight',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 12, maxReps: 18, restSec: 60,
    archetype: 'glute_bridge',
    muscles: 'Glúteo mayor • Isquiotibiales • Core',
    alternatives: ['Puente de glúteo a una pierna', 'Hip Thrust en Banco con Mancuernas'],
    cues: [
      ['Postura', 'Acostado boca arriba con rodillas flexionadas, pies al ancho de cadera y talones firmes.'],
      ['Recorrido', 'Eleva la pelvis apretando glúteos hasta alinear rodillas, cadera y hombros; pausa 1s arriba.'],
      ['Error común', 'Arquear la espalda baja en lugar de hacer retroversión pélvica arriba.']
    ]
  },
  {
    id: 'leg_curl_band',
    name: 'Curl Femoral Acostado con Banda',
    group: 'Pierna / Glúteo',
    equipment: 'band',
    bilateral: true,
    stepKg: 0,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'leg_curl_band',
    muscles: 'Isquiotibiales • Gemelos',
    alternatives: ['Peso Muerto Rumano con Mancuernas', 'Puente de Glúteo en Suelo'],
    cues: [
      ['Postura', 'Boca abajo con la banda anclada detrás y sujeta en tobillos; pelvis pegada al suelo.'],
      ['Recorrido', 'Flexiona rodillas llevando talones hacia glúteos manteniendo tensión constante y baja en 2s.'],
      ['Error común', 'Despegar la cadera del suelo para compensar la falta de fuerza femoral.']
    ]
  },
  {
    id: 'lunge_rotation',
    name: 'Zancadas Atrás con Mancuernas',
    group: 'Pierna / Glúteo',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 10, maxReps: 12, restSec: 90,
    note: 'Por pierna',
    archetype: 'lunge_rotation',
    muscles: 'Glúteos • Cuádriceps • Equilibrio',
    alternatives: ['Sentadilla Búlgara en Banco', 'Sentadilla Goblet Talones Elevados'],
    cues: [
      ['Postura', 'De pie con mancuernas a los costados, pies separados al ancho de cadera y abdomen firme.'],
      ['Recorrido', 'Da un paso largo atrás bajando la rodilla suavemente cerca del suelo y regresa empujando con el talón delantero.'],
      ['Error común', 'Colocar un pie exactamente detrás del otro perdiendo el equilibrio lateral.']
    ]
  },

  // ---- BRAZOS ----
  {
    id: 'incline_curl',
    name: 'Curl Inclinado en Banco 45°',
    group: 'Brazos',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 10, maxReps: 12, restSec: 60,
    archetype: 'incline_curl',
    muscles: 'Bíceps braquial (cabeza larga) • Braquial',
    alternatives: ['Curl Martillo con Mancuernas', 'Curl concentrado', 'Curl con banda'],
    cues: [
      ['Postura', 'Espalda y cabeza apoyadas en banco a 45°, brazos colgando perpendiculares al suelo detrás del torso.'],
      ['Recorrido', 'Flexiona los codos sin adelantarlos, supina la muñeca al subir y controla 2s la bajada completa.'],
      ['Error común', 'Adelantar los codos al subir o despegar la espalda para ayudarte con inercia.']
    ]
  },
  {
    id: 'hammer_curl',
    name: 'Curl Martillo con Mancuernas',
    group: 'Brazos',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 10, maxReps: 12, restSec: 60,
    archetype: 'hammer_curl',
    muscles: 'Braquial • Braquiorradial • Bíceps',
    alternatives: ['Curl Zottman', 'Curl martillo con banda', 'Curl Inclinado en Banco 45°'],
    cues: [
      ['Postura', 'De pie o sentado, palmas enfrentadas (agarre neutro) y codos pegados a los costados.'],
      ['Recorrido', 'Sube las mancuernas hacia los hombros manteniendo muñecas firmes y frena el descenso 2 segundos.'],
      ['Error común', 'Impulsarse con la espalda baja o girar las muñecas perdiendo el agarre neutro.']
    ]
  },
  {
    id: 'french_press',
    name: 'Press Francés con Mancuernas en Banco',
    group: 'Brazos',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 10, maxReps: 12, restSec: 75,
    archetype: 'french_press',
    muscles: 'Tríceps braquial (énfasis cabeza larga)',
    alternatives: ['Press Francés Declinado con Mancuernas', 'Copa de Tríceps con Mancuerna', 'Extensión de Tríceps con Banda en Barra'],
    cues: [
      ['Postura', 'Acostado en banco horizontal, brazos extendidos con ligera inclinación hacia atrás (~15°) para mantener tensión.'],
      ['Recorrido', 'Flexiona solo los codos bajando las mancuernas a los lados de la cabeza y extiende sin bloquear bruscamente.'],
      ['Error común', 'Abrir los codos hacia afuera o balancear los hombros en cada repetición.']
    ]
  },
  {
    id: 'band_tricep',
    name: 'Extensión de Tríceps con Banda en Barra',
    group: 'Brazos',
    equipment: 'band',
    bilateral: true,
    stepKg: 0,
    sets: 3, minReps: 10, maxReps: 15, restSec: 60,
    archetype: 'band_tricep',
    muscles: 'Tríceps (cabeza lateral y medial)',
    alternatives: ['Copa de Tríceps con Mancuerna', 'Patada de Tríceps con Mancuerna'],
    cues: [
      ['Postura', 'Cuelga la banda de la barra, pega los codos a los costados e inclina ligeramente el torso.'],
      ['Recorrido', 'Extiende por completo los codos apretando el tríceps 1s abajo y sube controlado hasta 90°+.'],
      ['Error común', 'Balancear los hombros o abrir los codos hacia afuera al empujar.']
    ]
  },
  {
    id: 'overhead_tricep',
    name: 'Copa de Tríceps con Mancuerna',
    group: 'Brazos',
    equipment: 'dumbbell',
    bilateral: false,
    stepKg: 1,
    sets: 3, minReps: 10, maxReps: 14, restSec: 60,
    archetype: 'overhead_tricep',
    muscles: 'Tríceps braquial (cabeza larga)',
    alternatives: ['Press Francés con Mancuernas en Banco', 'Patada de Tríceps con Mancuerna'],
    cues: [
      ['Postura', 'Sentado o de pie con abdomen firme, sujeta una mancuerna sobre la cabeza con codos apuntando arriba.'],
      ['Recorrido', 'Baja la mancuerna controlada detrás de la nuca sin abrir los codos y extiende arriba suavemente.'],
      ['Error común', 'Arquear la espalda baja o dejar que los codos se separen hacia los costados.']
    ]
  },
  {
    id: 'tricep_kickback',
    name: 'Patada de Tríceps con Mancuerna',
    group: 'Brazos',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 12, maxReps: 15, restSec: 60,
    archetype: 'tricep_kickback',
    muscles: 'Tríceps braquial',
    alternatives: ['Copa de Tríceps con Mancuerna', 'Extensión de Tríceps con Banda en Barra'],
    cues: [
      ['Postura', 'Torso inclinado estable y codos altos fijados junto a las costillas.'],
      ['Recorrido', 'Extiende los antebrazos completamente hacia atrás apretando el tríceps 1s sin dejar caer el codo.'],
      ['Error común', 'Balancear los hombros o usar mancuernas demasiado pesadas recortando la extensión.']
    ]
  },
  {
    id: 'decline_french_press',
    name: 'Press Francés Declinado con Mancuernas',
    group: 'Brazos',
    equipment: 'dumbbell',
    bilateral: true,
    stepKg: 1,
    sets: 3, minReps: 10, maxReps: 12, restSec: 75,
    archetype: 'decline_french_press',
    muscles: 'Tríceps braquial (máximo estiramiento cabeza larga)',
    alternatives: ['Press Francés con Mancuernas en Banco', 'Copa de Tríceps con Mancuerna'],
    cues: [
      ['Postura', 'Banco declinado (−15° a −20°), tobillos sujetos y brazos inclinados ~15° hacia atrás.'],
      ['Recorrido', 'Flexiona solo los codos bajando las mancuernas a los lados de la cabeza y extiende sin bloquear bruscamente.'],
      ['Error común', 'Abrir los codos hacia los lados o mover los hombros para ayudarte con impulso.']
    ]
  },

  // ---- CORE / ABDOMEN ----
  {
    id: 'decline_crunch',
    name: 'Crunch Declinado en Banco',
    group: 'Core',
    equipment: 'bodyweight',
    bilateral: true,
    stepKg: 2,
    sets: 3, minReps: 12, maxReps: 20, restSec: 60,
    archetype: 'decline_crunch',
    muscles: 'Recto abdominal • Oblicuos • Core anterior',
    alternatives: ['Crunch declinado con mancuerna al pecho'],
    cues: [
      ['Postura', 'Engancha los tobillos en los rodillos del banco declinado y apoya las manos suavemente sobre el pecho.'],
      ['Recorrido', 'Exhala enrollando las costillas hacia la pelvis (sin jalar el cuello), pausa 1s arriba y baja lento en 2–3s.'],
      ['Error común', 'Subir con tirón de cadera manteniendo la espalda completamente rígida o jalar la nuca con las manos.']
    ]
  },

  // ---- CALENTAMIENTO / MOVILIDAD ----
  {
    id: 'scapular_hang',
    name: 'Colgadas Escapulares en Barra',
    group: 'Calentamiento',
    equipment: 'bodyweight',
    bilateral: true,
    stepKg: 0,
    sets: 2, minReps: 8, maxReps: 10, restSec: 30,
    archetype: 'scapular_hang',
    muscles: 'Trapecio inferior • Serrato • Escápulas',
    alternatives: ['Dislocaciones / Pases con banda'],
    cues: [
      ['Postura', 'Cuélgate de la barra con los codos 100% extendidos y bloqueados.'],
      ['Recorrido', 'Aleja los hombros de las orejas deprimiendo y juntando escápulas, pausa 1s y relaja controlado.'],
      ['Error común', 'Flexionar los codos convirtiéndolo en media dominada.']
    ]
  },
  {
    id: 'band_dislocation',
    name: 'Dislocaciones / Pases con Banda',
    group: 'Calentamiento',
    equipment: 'band',
    bilateral: true,
    stepKg: 0,
    sets: 2, minReps: 10, maxReps: 12, restSec: 30,
    archetype: 'band_dislocation',
    muscles: 'Movilidad de hombro • Cápsula articular • Pectoral',
    alternatives: ['Face Pull con Banda en Barra'],
    cues: [
      ['Postura', 'Sujeta una banda ligera con agarre ancho y brazos estirados frente a la cadera.'],
      ['Recorrido', 'Pasa la banda sobre la cabeza hacia la espalda baja en arco continuo sin doblar codos ni arquear lumbar.'],
      ['Error común', 'Usar agarre demasiado cerrado provocando pinzamiento en el hombro.']
    ]
  }
];

export const CATALOG_BY_NAME = new Map(
  EXERCISE_CATALOG.map((item) => [item.name.toLowerCase(), item])
);

export const CATALOG_BY_ARCHETYPE = new Map(
  EXERCISE_CATALOG.map((item) => [item.archetype, item])
);

/**
 * Resuelve cualquier nombre de ejercicio, calentamiento o alternativa hacia
 * su guía técnica + arquetipo 3D exacto (sin mapeos contradictorios).
 */
export function resolveExerciseGuide(name) {
  const raw = String(name || '').trim();
  const exact = CATALOG_BY_NAME.get(raw.toLowerCase());
  if (exact) return exact;

  const n = raw.toLowerCase();
  const byArch = (arch) => CATALOG_BY_ARCHETYPE.get(arch);

  // Calentamientos específicos primero
  if (n.includes('colgada') && n.includes('escapular')) return byArch('scapular_hang');
  if (n.includes('dislocac') || n.includes('pases con banda')) return byArch('band_dislocation');
  if (n.includes('bombeo de codo')) {
    return {
      ...byArch('band_tricep'),
      name: raw,
      muscles: 'Tendones de codo • Bíceps y Tríceps (activación)',
      cues: [
        ['Postura', 'De pie con banda ligera, codos pegados a los costados y hombros relajados.'],
        ['Recorrido', 'Alterna extensiones suaves hacia abajo y curls ligeros con tensión continua sin fatiga.'],
        ['Error común', 'Usar demasiada tensión en el calentamiento o acelerar sin control.']
      ]
    };
  }
  if (n.includes('muñeca') || n.includes('aproximación') || n.includes('aproximacion')) {
    return byArch('flat_press');
  }

  // Core / Abdomen
  if (n.includes('crunch') || n.includes('abdom')) return byArch('decline_crunch');

  // Pierna / glúteo (antes que curl para no confundir curl femoral con bíceps!)
  if (n.includes('femoral')) return byArch('leg_curl_band');
  if (n.includes('búlgara') || n.includes('bulgara')) return byArch('bulgarian');
  if (n.includes('zancada') || n.includes('desplante') || n.includes('tobillo')) return byArch('lunge_rotation');
  if (n.includes('puente') && (n.includes('glúteo') || n.includes('gluteo'))) return byArch('glute_bridge');
  if (n.includes('hip thrust') || n.includes('glúteo') || n.includes('gluteo')) return byArch('hip_thrust');
  if (n.includes('rumano') || n.includes('bisagra') || n.includes('good morning')) return byArch('rdl');
  if (n.includes('sentadilla') || n.includes('goblet')) return byArch('goblet_squat');

  // Empuje pecho / hombro (respetar variantes declinadas!)
  if (n.includes('flexion') || n.includes('lagartija')) return byArch('pushup');
  if (n.includes('declinad') && (n.includes('francés') || n.includes('frances'))) return byArch('decline_french_press');
  if (n.includes('declinad') && n.includes('apertura')) return byArch('decline_fly');
  if (n.includes('declinad') && n.includes('press')) return byArch('decline_press');
  if (n.includes('inclinado') && n.includes('press')) return byArch('incline_press');
  if (n.includes('press plano') || n.includes('press cerrado') || n.includes('pecho')) return byArch('flat_press');
  if (n.includes('militar') || n.includes('arnold') || n.includes('wall slide')) return byArch('overhead_press');
  if (n.includes('apertura') && n.includes('banda')) return byArch('band_fly');
  if (n.includes('apertura')) return byArch('incline_fly');

  // Tracción espalda / hombro posterior
  if (n.includes('supina')) return byArch('chinup');
  if (n.includes('dominada')) return byArch('pullup');
  if (n.includes('serrucho') || (n.includes('un brazo') && n.includes('remo'))) return byArch('one_arm_row');
  if (n.includes('remo')) return byArch('chest_row');
  if (n.includes('lateral')) return byArch('lateral_raise');
  if (n.includes('face pull') || n.includes('rotación externa') || n.includes('rotacion externa') || n.includes('pull-apart') || n.includes('escapular')) {
    return byArch('face_pull');
  }
  if (n.includes('pájaro') || n.includes('pajaro')) return byArch('rear_delt');

  // Brazos
  if (n.includes('patada') && (n.includes('tríceps') || n.includes('triceps'))) return byArch('tricep_kickback');
  if (n.includes('copa') || n.includes('sobre cabeza')) return byArch('overhead_tricep');
  if (n.includes('francés') || n.includes('frances')) return byArch('french_press');
  if (n.includes('tríceps') || n.includes('triceps')) return byArch('band_tricep');
  if (n.includes('martillo') || n.includes('zottman')) return byArch('hammer_curl');
  if (n.includes('curl')) return byArch('incline_curl');

  // Fallback genérico controlado
  return {
    name: raw || 'Técnica de Ejercicio',
    archetype: 'flat_press',
    muscles: 'Técnica controlada y rango completo',
    cues: [
      ['Postura', 'Mantén la columna neutra, escápulas estables y base firme antes de iniciar.'],
      ['Recorrido', 'Controla 2 segundos la fase excéntrica y sube con potencia sin perder técnica.'],
      ['Error común', 'Usar impulso excesivo o acortar el rango de movimiento por cargar demasiado peso.']
    ]
  };
}

export function getCatalogGroups() {
  const seen = [];
  for (const item of EXERCISE_CATALOG) {
    if (!seen.includes(item.group)) seen.push(item.group);
  }
  return seen;
}
