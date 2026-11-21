/**
 * AlphaHome — Vistas de Entrenamiento (Inicio de Día + Sesión Activa)
 * Incluye agrupación visual de Superseries, steppers rápidos -/+, copiar serie anterior,
 * notas por ejercicio/banda y actualización no destructiva de inputs.
 */

import {
  calculateRecommendation, getLastExerciseLog, getCurrentBodyWeight, getVestWeightKg
} from '../engine/progression.js';
import { escapeHtml, escapeAttr, formatDateShort, formatTime } from '../utils.js';

export function renderStartWorkoutView(state) {
  const routines = state.routines || [];
  const nextDayIndex = state.history.length > 0 && routines.length > 0
    ? (routines.findIndex((r) => r.id === state.history[0].dayId) + 1 + routines.length) % routines.length
    : 0;
  const suggestedDay = routines[nextDayIndex] || routines[0];
  const currentBW = getCurrentBodyWeight(state);
  const greetingName = state.profile?.name ? `Hola, ${state.profile.name}` : 'Listo para entrenar';
  const isReadapt = Boolean(state.settings?.readaptationMode);

  return `
    <div class="stack-4">
      <div class="mode-banner ${isReadapt ? 'mode-banner--amber' : 'mode-banner--accent'}">
        <div class="min-w-0">
          <p class="text-sm font-extrabold ${isReadapt ? 'text-amber' : 'text-accent'}">
            ${isReadapt ? 'Modo Readaptación Activo' : 'Modo Doble Progresión Activo'}
          </p>
          <p class="text-xs text-soft mt-1 leading-relaxed">
            ${isReadapt
              ? 'RIR objetivo 2-3 y cargas controladas para arrancar con técnica limpia sin agujetas extremas.'
              : `Progresión automática adaptada a tu equipo (mancuernas hasta ${state.equipment?.maxDumbbellKg || 24} kg).`}
          </p>
        </div>
        <button type="button" class="btn btn--surface btn--xs shrink-0" data-action="toggle-readapt">Cambiar</button>
      </div>

      ${suggestedDay ? `
        <section class="hero-card">
          <div class="row-between gap-2 mb-2">
            <span class="chip chip--accent">Siguiente recomendado</span>
            <span class="text-xs text-muted font-semibold tabular-nums">
              Meta ~${state.settings?.sessionGoalMin || 60} min${currentBW ? ` • ${currentBW.toFixed(1)} kg` : ''}
            </span>
          </div>
          <p class="text-xs text-muted font-semibold">${escapeHtml(greetingName)}</p>
          <h2 class="hero-title mt-0.5">${escapeHtml(suggestedDay.name)}</h2>
          <p class="text-xs text-soft mt-1 mb-4">${escapeHtml(suggestedDay.focus)} • ${suggestedDay.exercises.length} ejercicios</p>
          <div class="row gap-2">
            <button type="button" class="btn btn--primary flex-1" data-action="start-workout" data-day-id="${escapeAttr(suggestedDay.id)}">
              ▶ Iniciar Entrenamiento
            </button>
            <button type="button" class="btn btn--surface" data-action="preview-day" data-day-id="${escapeAttr(suggestedDay.id)}">
              Ver / Rotar
            </button>
          </div>
        </section>
      ` : ''}

      <section>
        <div class="row-between mb-2.5 px-1">
          <h3 class="section-eyebrow">Tu rutina (${routines.length} ${routines.length === 1 ? 'día' : 'días'})</h3>
          <button type="button" class="btn btn--ghost btn--xs text-accent" data-action="open-routine-manager">✎ Editar rutina</button>
        </div>

        <div class="stack-2.5">
          ${routines.map((r) => {
            const lastDone = state.history.find((h) => h.dayId === r.id);
            return `
              <article class="card row-between gap-2">
                <div class="min-w-0">
                  <div class="row gap-2">
                    <span class="text-sm font-bold text-strong truncate">${escapeHtml(r.name)}</span>
                    ${r.recommendedDay ? `<span class="chip chip--subtle shrink-0">${escapeHtml(r.recommendedDay)}</span>` : ''}
                  </div>
                  <p class="text-xs text-muted mt-0.5 truncate">${escapeHtml(r.focus)}</p>
                  <p class="text-2xs text-faint mt-1">
                    ${lastDone ? 'Última vez: ' + formatDateShort(lastDone.date) : 'Sin sesiones previas'} • ${r.exercises.length} ejercicios
                  </p>
                </div>
                <div class="row gap-1.5 shrink-0">
                  <button type="button" class="btn btn--surface btn--xs" data-action="preview-day" data-day-id="${escapeAttr(r.id)}">Ver</button>
                  <button type="button" class="btn btn--accent-soft btn--xs" data-action="start-workout" data-day-id="${escapeAttr(r.id)}">Iniciar</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>

      <div class="card card--subtle row-between gap-3">
        <div>
          <p class="text-xs font-bold text-strong">Temporizador y Alertas</p>
          <p class="text-2xs text-muted">Auto-descanso: ${state.settings.autoRest ? 'Sí' : 'No'} • Sonido: ${state.settings.soundEnabled ? 'Sí' : 'No'}</p>
        </div>
        <button type="button" class="btn btn--surface btn--xs text-accent" data-action="test-rest">Probar 15s</button>
      </div>
    </div>
  `;
}

function renderExerciseCard(ex, exIdx, state, tutTimer, partnerIdx = null) {
  const rec = calculateRecommendation(ex, state);
  const last = getLastExerciseLog(ex.name, state);
  const isTutRunning = tutTimer.active && tutTimer.exerciseIdx === exIdx;
  const currentBW = getCurrentBodyWeight(state);
  const vestKg = getVestWeightKg(state);
  const stepKg = Math.max(0.5, Number(ex.stepKg) || Number(state.equipment?.dumbbellStepKg) || 1);

  let bodyweightBadgeHtml = '';
  if (ex.equipment === 'bodyweight' && currentBW) {
    const maxAdded = Math.max(0, ...ex.sets.map((s) => (Number(s.weight) || 0) + (s.mods?.vest ? vestKg : 0)));
    const totalEstimated = currentBW + maxAdded;
    bodyweightBadgeHtml = `
      <div class="bw-banner mt-2.5">
        <span class="text-accent font-semibold">⚖ Carga total est.</span>
        <span class="text-emerald font-extrabold tabular-nums">
          ${totalEstimated.toFixed(1)} kg <span class="text-muted font-medium">(${currentBW.toFixed(1)} + ${maxAdded.toFixed(1)})</span>
        </span>
      </div>
    `;
  }

  const lastSummary = last && last.sets.length
    ? last.sets.map((s) => `${s.weight || 0}kg×${s.reps}${s.rir !== '' && s.rir !== undefined ? '@R' + s.rir : ''}`).join(' • ')
    : 'Sin registro previo';

  const modDefs = [];
  if (state.equipment?.hasVest) modDefs.push({ key: 'vest', label: `Chaleco ${vestKg}kg` });
  if (state.equipment?.hasBands !== false) modDefs.push({ key: 'band', label: 'Banda' });
  modDefs.push({ key: 'pause', label: 'Pausa 2s' });
  if (state.equipment?.hasPullupBar) modDefs.push({ key: 'chain', label: 'Cadena' });

  const weightLabel = ex.equipment === 'bodyweight'
    ? 'Lastre (kg)'
    : ex.equipment === 'band'
      ? 'Extra (kg)'
      : ex.bilateral === false
        ? 'Peso (kg)'
        : 'Peso c/u';

  return `
    <section id="ex-card-${exIdx}" class="exercise-card ${ex.superset ? 'exercise-card--superset' : ''}">
      <div class="exercise-card__head">
        <div class="row-between align-start gap-2">
          <div class="min-w-0">
            <div class="row gap-1.5 flex-wrap mb-1">
              ${ex.superset ? `<span class="chip chip--accent">${escapeHtml(ex.superset)}</span>` : ''}
              <span class="chip chip--${rec.tone}">${escapeHtml(rec.badge)}</span>
              ${ex.note ? `<span class="text-2xs text-muted font-semibold">• ${escapeHtml(ex.note)}</span>` : ''}
            </div>
            <h3 class="text-base font-extrabold text-strong leading-snug">${escapeHtml(ex.name)}</h3>
          </div>

          <div class="row gap-1.5 shrink-0">
            <button type="button" class="btn btn--accent-soft btn--xs" data-action="open-tech" data-ex-name="${escapeAttr(ex.name)}">▶ Técnica</button>
            <button type="button" class="btn btn--surface btn--xs" data-action="swap-ex" data-ex-idx="${exIdx}">↻</button>
          </div>
        </div>

        ${bodyweightBadgeHtml}

        <div class="row flex-wrap gap-1.5 mt-3">
          <button type="button" class="btn btn--surface btn--xs text-accent" data-action="edit-rest" data-ex-idx="${exIdx}">
            ⏱ Descanso: ${formatTime(ex.restSec)}
          </button>
          <button type="button" class="btn btn--accent-soft btn--xs" data-action="start-rest" data-rest-sec="${ex.restSec}" data-ex-name="${escapeAttr(ex.name)}">
            ▶ Descansar
          </button>
          <button type="button" class="btn ${isTutRunning ? 'btn--danger-soft' : 'btn--surface'} btn--xs" data-action="toggle-tut" data-ex-idx="${exIdx}">
            <span>${isTutRunning ? '⏹ Parar:' : '⚡ TUT'}</span>
            <span id="tut-display-${exIdx}" class="tabular-nums font-bold">${isTutRunning ? tutTimer.elapsedSec + 's' : (ex.tutSeconds ? ex.tutSeconds + 's' : '')}</span>
          </button>
          ${partnerIdx !== null ? `
            <button type="button" class="btn btn--surface btn--xs text-accent" data-action="jump-ex" data-target-idx="${partnerIdx}">
              ${partnerIdx > exIdx ? 'Ir a B ↓' : 'Volver a A ↑'}
            </button>
          ` : ''}
        </div>

        <div class="rec-box mt-3">
          <div class="row-between align-start gap-2 text-xs">
            <span class="text-muted font-semibold shrink-0">Meta hoy:</span>
            <span class="text-emerald font-bold text-right">${escapeHtml(rec.summary)}</span>
          </div>
          <p class="text-2xs text-muted mt-1 leading-snug">${escapeHtml(rec.detail)}</p>
          <div class="rec-box__footer">
            <span class="text-faint shrink-0">Última vez:</span>
            <span class="text-soft truncate">${escapeHtml(lastSummary)}</span>
          </div>
        </div>

        <div class="mt-2.5">
          <input
            type="text"
            class="note-input"
            data-ex-note="${exIdx}"
            value="${escapeAttr(ex.sessionNote || '')}"
            placeholder="${ex.equipment === 'band' ? 'Nota rápida (ej. banda verde, 2 pasos atrás...)' : 'Nota rápida (ej. banco hueco 3, sensación...)'}"
          />
        </div>
      </div>

      <div class="exercise-card__body">
        <div class="set-grid-head">
          <div class="text-center">#</div>
          <div class="text-center">${weightLabel}</div>
          <div class="text-center">Reps</div>
          <div class="text-center">RIR</div>
          <div class="text-center">Listo</div>
        </div>

        <div class="stack-2">
          ${ex.sets.map((s, setIdx) => {
            const mods = s.mods || {};
            return `
              <div class="set-row ${s.done ? 'is-done' : ''}" data-set-row="${exIdx}-${setIdx}">
                <div class="set-grid">
                  <div class="set-num ${s.done ? 'text-emerald' : 'text-muted'}">${setIdx + 1}</div>

                  <div class="stepper-field">
                    <button type="button" class="step-btn" data-action="step-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" data-field="weight" data-delta="${-stepKg}" aria-label="Restar peso">−</button>
                    <input
                      type="number" inputmode="decimal" step="0.5" min="0"
                      value="${s.weight}"
                      placeholder="0"
                      data-set-input="${exIdx}:${setIdx}:weight"
                      class="set-input tabular-nums"
                    />
                    <button type="button" class="step-btn" data-action="step-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" data-field="weight" data-delta="${stepKg}" aria-label="Sumar peso">+</button>
                  </div>

                  <div class="stepper-field">
                    <button type="button" class="step-btn" data-action="step-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" data-field="reps" data-delta="-1" aria-label="Restar rep">−</button>
                    <input
                      type="number" inputmode="numeric" min="0"
                      value="${s.reps}"
                      placeholder="0"
                      data-set-input="${exIdx}:${setIdx}:reps"
                      class="set-input tabular-nums"
                    />
                    <button type="button" class="step-btn" data-action="step-set" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" data-field="reps" data-delta="1" aria-label="Sumar rep">+</button>
                  </div>

                  <div>
                    <input
                      type="number" inputmode="numeric" min="0" max="5"
                      value="${s.rir}"
                      placeholder="2"
                      data-set-input="${exIdx}:${setIdx}:rir"
                      class="set-input set-input--rir tabular-nums"
                    />
                  </div>

                  <div class="flex-center">
                    <button
                      type="button"
                      class="done-btn ${s.done ? 'is-done' : ''}"
                      data-action="toggle-set-done"
                      data-ex-idx="${exIdx}"
                      data-set-idx="${setIdx}"
                      aria-label="Completar serie ${setIdx + 1}"
                    >✓</button>
                  </div>
                </div>

                <div class="set-mods">
                  ${modDefs.map((m) => `
                    <button
                      type="button"
                      class="mod-chip ${mods[m.key] ? 'is-active' : ''}"
                      data-action="toggle-mod"
                      data-ex-idx="${exIdx}"
                      data-set-idx="${setIdx}"
                      data-mod-key="${m.key}"
                    >${mods[m.key] ? '✓ ' : '+ '}${m.label}</button>
                  `).join('')}
                  ${setIdx > 0 ? `
                    <button
                      type="button"
                      class="mod-chip mod-chip--copy"
                      data-action="copy-prev-set"
                      data-ex-idx="${exIdx}"
                      data-set-idx="${setIdx}"
                    >⧉ Igual a S${setIdx}</button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="row-between gap-2 pt-2.5">
          <button type="button" class="btn btn--surface btn--xs text-muted" data-action="remove-set" data-ex-idx="${exIdx}">− Quitar serie</button>
          <button type="button" class="btn btn--surface btn--xs text-accent" data-action="add-set" data-ex-idx="${exIdx}">+ Añadir serie</button>
        </div>
      </div>
    </section>
  `;
}

export function renderActiveWorkoutView(state, tutTimer) {
  const aw = state.activeWorkout;
  const warmup = Array.isArray(aw.warmup) ? aw.warmup : [];
  const warmupTotal = warmup.length;
  const warmupDone = warmup.filter((w) => w.done).length;
  const allWarmupDone = warmupTotal > 0 && warmupDone === warmupTotal;

  const warmupHtml = warmupTotal > 0 ? `
    <section class="warmup-card ${allWarmupDone ? 'is-done' : ''}">
      <button type="button" class="warmup-card__head" data-action="toggle-warmup-collapse">
        <div class="min-w-0 text-left">
          <div class="row gap-2">
            <span class="text-sm font-extrabold ${allWarmupDone ? 'text-emerald' : 'text-amber'}">
              ${allWarmupDone ? '✓ Calentamiento completado' : '🔥 Calentamiento del Día (5–7 min)'}
            </span>
            <span class="chip ${allWarmupDone ? 'chip--emerald' : 'chip--amber'} tabular-nums">${warmupDone}/${warmupTotal}</span>
          </div>
          <p class="text-2xs text-soft mt-0.5">Prepara hombros, codos y articulaciones antes de cargar peso</p>
        </div>
        <span class="text-xs font-bold text-soft shrink-0">${aw.warmupCollapsed ? 'Mostrar ▼' : 'Ocultar ▲'}</span>
      </button>

      ${!aw.warmupCollapsed ? `
        <div class="warmup-card__body">
          ${warmup.map((w, wIdx) => `
            <div class="warmup-item ${w.done ? 'is-done' : ''}">
              <button type="button" class="check-sm ${w.done ? 'is-done' : ''}" data-action="toggle-warmup" data-w-idx="${wIdx}" aria-label="Completar calentamiento">✓</button>
              <div class="min-w-0 flex-1">
                <div class="row gap-1.5 flex-wrap">
                  <p class="text-xs font-bold ${w.done ? 'text-muted line-through' : 'text-strong'}">${escapeHtml(w.name)}</p>
                  <span class="chip chip--amber">${escapeHtml(w.target)}</span>
                </div>
                <p class="text-2xs text-muted mt-0.5 leading-snug">${escapeHtml(w.tip)}</p>
              </div>
              <div class="row gap-1 shrink-0">
                <button type="button" class="btn btn--accent-soft btn--xs" data-action="open-tech" data-ex-name="${escapeAttr(w.name)}" title="Ver técnica 3D">▶</button>
                <button type="button" class="btn btn--surface btn--xs text-accent" data-action="start-rest" data-rest-sec="${w.timerSec || 45}" data-ex-name="${escapeAttr('Calentamiento: ' + w.name)}">⏱ ${w.timerSec || 45}s</button>
              </div>
            </div>
          `).join('')}

          ${!allWarmupDone ? `
            <div class="flex-end pt-1">
              <button type="button" class="btn btn--surface btn--xs text-emerald" data-action="complete-all-warmup">✓ Marcar todo listo y ocultar</button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </section>
  ` : '';

  // Agrupar visualmente pares SUPERSERIE A + SUPERSERIE B
  const exerciseBlocks = [];
  for (let i = 0; i < aw.exercises.length; i++) {
    const curr = aw.exercises[i];
    const next = aw.exercises[i + 1];
    if (curr.superset === 'SUPERSERIE A' && next && next.superset === 'SUPERSERIE B') {
      exerciseBlocks.push(`
        <div class="superset-group">
          <div class="superset-group__label">⚡ SUPERSERIE — Alterna A y B con descanso corto entre ambos</div>
          <div class="stack-3">
            ${renderExerciseCard(curr, i, state, tutTimer, i + 1)}
            ${renderExerciseCard(next, i + 1, state, tutTimer, i)}
          </div>
        </div>
      `);
      i++; // Saltar B ya incluido
    } else {
      exerciseBlocks.push(renderExerciseCard(curr, i, state, tutTimer, null));
    }
  }

  return `
    <div class="stack-4">
      ${state.settings.readaptationMode ? `
        <div class="mode-strip">
          <span class="text-xs font-semibold text-amber">⚡ Readaptación activa: mantén RIR 2-3 hoy.</span>
          <button type="button" class="text-2xs font-bold text-amber underline" data-action="toggle-readapt">Desactivar</button>
        </div>
      ` : ''}

      ${warmupHtml}
      ${exerciseBlocks.join('')}

      <div class="pt-2">
        <button type="button" class="btn btn--emerald btn--block btn--lg" data-action="open-finish-modal">
          🏆 Finalizar y Guardar Entrenamiento
        </button>
      </div>
    </div>
  `;
}
