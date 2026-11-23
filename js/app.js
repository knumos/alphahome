/**
 * AlphaHome — Orquestador Principal (ES Modules nativos para GitHub Pages)
 */

import {
  state, saveState, replaceState, normalizeState, getDefaultState, exportFullBackup,
  exportRoutinesOnly, exportSetup, classifyImport, applySharedPayload
} from './state.js';
import {
  applyTheme, escapeHtml, escapeAttr, formatTime, getTodayDateString,
  showToast, openModal, closeModal, initModalDismissHandlers,
  ensureAudioContext, playRestBeep, sendSystemNotification,
  isWakeLockPreferred, setWakeLockPreferred, syncWakeLock,
  WAKE_LOCK_PREF_KEY, setSwRegistration
} from './utils.js';
import {
  calculateRecommendation, getLastExerciseLog, getCurrentBodyWeight,
  computeWorkoutVolume, getVestWeightKg, getReturnBlock, advanceReturnBlock,
  getWorkingSetCount, describeReturnBlock
} from './engine/progression.js';
import { planRoutineAdaptation, adaptationKey, movementFits } from './engine/adapt.js';
import {
  tutTimer, getSessionElapsedSeconds, startSessionTicker, stopSessionTicker,
  updateSessionTimerUI, startRestTimer, restoreRestTimer, adjustRestTimer,
  skipRestTimer, dismissRestAlert, toggleTutTimer, stopTutTimer
} from './engine/timers.js';
import { renderStartWorkoutView, renderActiveWorkoutView } from './ui/trainView.js';
import { renderProgressView } from './ui/progressView.js';
import { renderWeightView } from './ui/weightView.js';
import { renderSettingsView } from './ui/settingsView.js';
import { openOnboardingWizard } from './ui/onboarding.js';
import { openRoutineManagerModal, openDayEditorModal, openTemplatePickerModal, openShareImportModal } from './ui/routineEditor.js';

let deferredInstallPrompt = null;
let swRegistration = null;
let appUpdateReady = false;
const SW_RELOAD_FLAG = 'alphahome_sw_reload';

const getState = () => state;

// ---------------------------------------------------------------------------
// Carga bajo demanda del Modal 3D de Técnica
// ---------------------------------------------------------------------------
let techModalPromise = null;
async function openTechnique(exerciseName) {
  try {
    if (!techModalPromise) {
      techModalPromise = import('./svg/modal.js');
    }
    const mod = await techModalPromise;
    mod.openTechniqueModal(exerciseName, state.profile?.theme || 'cyan');
  } catch (err) {
    console.error('Error abriendo guía 3D:', err);
    showToast('No se pudo cargar la guía técnica 3D.', 'error');
  }
}

// ---------------------------------------------------------------------------
// Renderizado principal (Header, Nav y Vista activa)
// ---------------------------------------------------------------------------
function renderHeader() {
  const right = document.getElementById('header-right');
  const titleEl = document.getElementById('header-title');
  const sub = document.getElementById('header-subtitle');
  const barWrap = document.getElementById('session-progress-bar-wrap');
  if (!right || !sub || !barWrap) return;

  if (titleEl) {
    titleEl.textContent = state.profile?.name ? `AlphaHome • ${state.profile.name}` : 'AlphaHome';
  }

  if (state.activeWorkout) {
    sub.textContent = state.activeWorkout.dayName;
    barWrap.classList.remove('hidden');
    right.innerHTML = `
      <button type="button" class="btn btn--surface btn--xs" data-action="toggle-pause">
        ${state.activeWorkout.paused ? '▶ Reanudar' : '⏸ Pausa'}
      </button>
      <button type="button" class="btn btn--emerald btn--xs" data-action="open-finish-modal">
        Finalizar
      </button>
    `;
    updateSessionTimerUI(state);
  } else {
    const block = getReturnBlock(state);
    const copy = describeReturnBlock(block);
    sub.textContent = copy ? copy.title : (state.settings.readaptationMode ? 'Modo Readaptación' : 'Modo Doble Progresión');
    barWrap.classList.add('hidden');
    if (block.active) {
      right.innerHTML = `
        <button type="button" class="btn btn--xs btn--amber-soft" data-action="end-return-block">
          Vuelta S${block.week}
        </button>
      `;
    } else {
      right.innerHTML = `
        <button type="button" class="btn btn--xs ${state.settings.readaptationMode ? 'btn--amber-soft' : 'btn--emerald-soft'}" data-action="toggle-readapt">
          ${state.settings.readaptationMode ? '⚡ Readaptación' : '📈 Progresión'}
        </button>
      `;
    }
  }
}

function renderNav() {
  ['train', 'progress', 'weight', 'settings'].forEach((t) => {
    const btn = document.getElementById(`nav-${t}`);
    if (btn) btn.classList.toggle('is-active', state.ui.activeTab === t);
  });
}

function render() {
  const advance = advanceReturnBlock(state);
  if (advance.changed) saveState();
  if (advance.completed) {
    showToast('Terminó el bloque de vuelta. Sigues con el plan completo y la doble progresión.', 'success');
  }
  applyTheme(state.profile?.theme || 'cyan');
  renderHeader();
  renderNav();
  const main = document.getElementById('app-main');
  if (!main) return;

  if (state.ui.activeTab === 'train') {
    main.innerHTML = state.activeWorkout
      ? renderActiveWorkoutView(state, tutTimer)
      : renderStartWorkoutView(state);
    if (state.activeWorkout) updateSessionTimerUI(state);
  } else if (state.ui.activeTab === 'progress') {
    main.innerHTML = renderProgressView(state);
  } else if (state.ui.activeTab === 'weight') {
    main.innerHTML = renderWeightView(state);
  } else if (state.ui.activeTab === 'settings') {
    main.innerHTML = renderSettingsView(state, deferredInstallPrompt);
  }
}

function switchTab(tab) {
  state.ui.activeTab = tab;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------------------------------------------------------------------
// Flujo de Entrenamiento Activo
// ---------------------------------------------------------------------------
function startWorkout(dayId) {
  ensureAudioContext();
  const routine = state.routines.find((r) => r.id === dayId);
  if (!routine) return;
  if (!routine.exercises || routine.exercises.length === 0) {
    showToast('Este día no tiene ejercicios. Añade algunos primero.', 'warning');
    openDayEditorModal(dayId, render, openTechnique);
    return;
  }

  const exercises = routine.exercises.map((ex) => {
    const rec = calculateRecommendation(ex, state);
    const last = getLastExerciseLog(ex.name, state);
    const workingSets = getWorkingSetCount(ex, state);
    const setsArr = [];
    for (let i = 0; i < workingSets; i++) {
      const prevSet = last && last.sets[i] ? last.sets[i] : (last && last.sets[0] ? last.sets[0] : null);
      // Check explícito (no truthy ||) para no perder el 0 en ejercicios sin peso externo
      const hasSuggested = rec.suggestedWeight !== '' && rec.suggestedWeight !== null && rec.suggestedWeight !== undefined;
      const initialWeight = hasSuggested
        ? rec.suggestedWeight
        : (prevSet && prevSet.weight !== undefined ? prevSet.weight : '');
      const mods = {
        vest: false,
        band: false,
        pause: false,
        chain: false,
        belt: false,
        bandLevel: ex.equipment === 'band' ? 1 : 0,
        ...(prevSet && prevSet.mods ? prevSet.mods : {})
      };
      if (rec.suggestedVest) mods.vest = true;
      if (rec.suggestedBelt) mods.belt = true;
      if (rec.suggestedBandLevel) {
        mods.band = true;
        mods.bandLevel = rec.suggestedBandLevel;
      }
      setsArr.push({
        weight: initialWeight,
        reps: rec.suggestedReps || ex.minReps,
        rir: rec.suggestedRir,
        done: false,
        mods
      });
    }
    return {
      ...JSON.parse(JSON.stringify(ex)),
      plannedSets: ex.sets,
      sets: setsArr,
      tutSeconds: 0,
      sessionNote: ''
    };
  });

  const warmupItems = (routine.warmup || []).map((w) => ({ ...w, done: false }));

  state.activeWorkout = {
    dayId: routine.id,
    dayName: routine.name,
    focus: routine.focus,
    startedAt: Date.now(),
    accumulatedSec: 0,
    lastResumeAt: Date.now(),
    paused: false,
    warmupCollapsed: false,
    warmup: warmupItems,
    exercises
  };

  state.ui.activeTab = 'train';
  saveState();
  startSessionTicker(getState);
  showToast(`Sesión iniciada: ${routine.name}`, 'success');
  render();
  syncWakeLock(state.activeWorkout);
}

function toggleSessionPause() {
  const aw = state.activeWorkout;
  if (!aw) return;
  if (aw.paused) {
    aw.paused = false;
    aw.lastResumeAt = Date.now();
    showToast('Entrenamiento reanudado', 'info');
  } else {
    aw.accumulatedSec = getSessionElapsedSeconds(aw);
    aw.paused = true;
    showToast('Entrenamiento en pausa', 'warning');
  }
  saveState();
  renderHeader();
  syncWakeLock(aw);
}

function updateLiveSetRowDOM(exIdx, setIdx) {
  const aw = state.activeWorkout;
  if (!aw) return;
  const ex = aw.exercises[exIdx];
  const s = ex?.sets[setIdx];
  if (!s) return;

  const row = document.querySelector(`[data-set-row="${exIdx}-${setIdx}"]`);
  if (!row) return;
  const wEl = row.querySelector(`[data-set-input="${exIdx}:${setIdx}:weight"]`);
  const rEl = row.querySelector(`[data-set-input="${exIdx}:${setIdx}:reps"]`);
  const rirEl = row.querySelector(`[data-set-input="${exIdx}:${setIdx}:rir"]`);
  if (wEl && document.activeElement !== wEl) wEl.value = s.weight;
  if (rEl && document.activeElement !== rEl) rEl.value = s.reps;
  if (rirEl && document.activeElement !== rirEl) rirEl.value = s.rir;

  // Actualizar badge de peso corporal si aplica sin re-renderizar toda la pantalla
  if (ex.equipment === 'bodyweight') {
    const bw = getCurrentBodyWeight(state);
    if (bw) {
      const vestKg = getVestWeightKg(state);
      const maxAdded = Math.max(0, ...ex.sets.map((x) => (Number(x.weight) || 0) + (x.mods?.vest ? vestKg : 0)));
      const card = document.getElementById(`ex-card-${exIdx}`);
      const bwSpan = card?.querySelector('.bw-banner .text-emerald');
      if (bwSpan) {
        bwSpan.innerHTML = `${(bw + maxAdded).toFixed(1)} kg <span class="text-muted font-medium">(${bw.toFixed(1)} + ${maxAdded.toFixed(1)})</span>`;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Modales de Vista Previa, Cambio de Ejercicio, Descanso y Cierre de Sesión
// ---------------------------------------------------------------------------
function openDayPreviewModal(dayId) {
  const day = state.routines.find((r) => r.id === dayId);
  if (!day) return;

  openModal(`
    <div class="modal-header">
      <div class="min-w-0">
        <h3 class="modal-title">${escapeHtml(day.name)}</h3>
        <p class="text-xs text-muted mt-0.5">${escapeHtml(day.focus)}</p>
      </div>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    ${Array.isArray(day.warmup) && day.warmup.length ? `
      <div class="warmup-preview mt-3">
        <p class="text-2xs font-extrabold uppercase text-amber mb-2">🔥 Calentamiento del día (5–7 min)</p>
        <ul class="stack-1.5">
          ${day.warmup.map((w) => `
            <li class="row-between gap-2 text-xs text-soft">
              <span>• ${escapeHtml(w.name)}</span>
              <span class="text-2xs font-bold text-amber shrink-0">${escapeHtml(w.target)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="stack-2 mt-4 mb-4">
      ${day.exercises.map((ex, idx) => `
        <div class="list-card row-between gap-2">
          <div class="min-w-0">
            <div class="row gap-1.5 flex-wrap">
              ${ex.superset ? `<span class="chip chip--accent">${escapeHtml(ex.superset)}</span>` : ''}
              <p class="text-sm font-bold text-strong truncate">${escapeHtml(ex.name)}</p>
            </div>
            <p class="text-xs text-muted mt-0.5">
              ${ex.sets} × ${ex.minReps === ex.maxReps ? ex.minReps : `${ex.minReps}-${ex.maxReps}`} reps ${ex.note ? `(${escapeHtml(ex.note)})` : ''} • Descanso ${formatTime(ex.restSec)}
            </p>
          </div>
          <div class="row gap-1.5 shrink-0">
            <button type="button" class="btn btn--accent-soft btn--xs" data-m-tech="${escapeAttr(ex.name)}">▶</button>
            <button type="button" class="btn btn--surface btn--xs" data-m-swap="${idx}">↻</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="row gap-2">
      <button type="button" id="dp-edit" class="btn btn--surface">✎ Editar</button>
      <button type="button" id="dp-start" class="btn btn--primary flex-1">▶ Iniciar ${escapeHtml(day.name)}</button>
    </div>
  `);

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root.querySelector('#dp-edit')?.addEventListener('click', () => openDayEditorModal(dayId, render, openTechnique));
  root.querySelector('#dp-start')?.addEventListener('click', () => { closeModal(); startWorkout(dayId); });
  root.querySelectorAll('[data-m-tech]').forEach((b) => {
    b.addEventListener('click', () => openTechnique(b.dataset.mTech));
  });
  root.querySelectorAll('[data-m-swap]').forEach((b) => {
    b.addEventListener('click', () => openSwapExerciseModal(Number(b.dataset.mSwap), 'routine', dayId));
  });
}

function openSwapExerciseModal(exIdx, context = 'active', dayId = null) {
  const ex = context === 'active'
    ? state.activeWorkout?.exercises[exIdx]
    : state.routines.find((d) => d.id === dayId)?.exercises[exIdx];
  if (!ex) return;

  const alts = (ex.alternatives || []).filter((name) => movementFits(name, state.equipment, state.space));
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Cambiar Ejercicio</h3>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>
    <p class="text-xs text-muted mt-2 mb-4">
      Actual: <strong class="text-accent">${escapeHtml(ex.name)}</strong>. El historial se conserva independiente por nombre.
    </p>

    <div class="stack-2 mb-4">
      <p class="section-eyebrow">Alternativas recomendadas</p>
      ${alts.length ? alts.map((altName) => `
        <button type="button" class="list-card list-card--btn row-between gap-2" data-swap-pick="${escapeAttr(altName)}">
          <span class="text-sm font-semibold text-strong text-left">${escapeHtml(altName)}</span>
          <span class="text-xs font-bold text-accent shrink-0">Elegir →</span>
        </button>
      `).join('') : '<p class="text-xs text-muted">No hay alternativas predefinidas.</p>'}
    </div>

    <div class="divider mb-3"></div>
    <p class="field-label">O escribe un ejercicio personalizado</p>
    <div class="row gap-2 mt-1">
      <input id="custom-swap-name" type="text" placeholder="Ej. Press Arnold con mancuernas" class="input flex-1" />
      <button type="button" id="swap-custom-btn" class="btn btn--primary btn--sm">Usar</button>
    </div>
    ${context === 'active' ? `
      <label class="row gap-2 mt-3 text-xs text-soft cursor-pointer">
        <input id="swap-save-template" type="checkbox" class="toggle-check" />
        <span>Guardar también en mi plantilla de rutina</span>
      </label>
    ` : ''}
  `);

  const applySwap = (newName) => {
    const clean = String(newName || '').trim();
    if (!clean) return showToast('Escribe el nombre del ejercicio.', 'warning');

    if (context === 'active' && state.activeWorkout) {
      const targetEx = state.activeWorkout.exercises[exIdx];
      const oldName = targetEx.name;
      if (oldName !== clean) {
        const nextAlts = new Set([...(targetEx.alternatives || []), oldName]);
        nextAlts.delete(clean);
        targetEx.alternatives = Array.from(nextAlts);
        targetEx.name = clean;

        // Actualizar equipo inferido si el nombre cambia de banda/mancuerna/peso corporal
        const low = clean.toLowerCase();
        if (low.includes('banda')) targetEx.equipment = 'band';
        else if (low.includes('flexion') || low.includes('dominada') || low.includes('puente')) targetEx.equipment = 'bodyweight';
        else targetEx.equipment = 'dumbbell';

        const rec = calculateRecommendation(targetEx, state);
        targetEx.sets.forEach((s) => {
          if (!s.done) {
            s.weight = (rec.suggestedWeight !== undefined && rec.suggestedWeight !== null) ? rec.suggestedWeight : '';
            s.reps = rec.suggestedReps || targetEx.minReps;
            s.rir = rec.suggestedRir;
          }
        });

        const saveTpl = document.getElementById('swap-save-template')?.checked;
        if (saveTpl) {
          const r = state.routines.find((d) => d.id === state.activeWorkout.dayId);
          if (r && r.exercises[exIdx]) {
            r.exercises[exIdx].name = clean;
            r.exercises[exIdx].equipment = targetEx.equipment;
            r.exercises[exIdx].alternatives = targetEx.alternatives;
          }
        }
      }
    } else if (context === 'routine') {
      const r = state.routines.find((d) => d.id === dayId);
      if (r && r.exercises[exIdx]) {
        const targetEx = r.exercises[exIdx];
        const oldName = targetEx.name;
        if (oldName !== clean) {
          const nextAlts = new Set([...(targetEx.alternatives || []), oldName]);
          nextAlts.delete(clean);
          targetEx.alternatives = Array.from(nextAlts);
          targetEx.name = clean;
        }
      }
    }

    saveState();
    closeModal();
    showToast(`Ejercicio cambiado a: ${clean}`, 'success');
    render();
  };

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root.querySelectorAll('[data-swap-pick]').forEach((b) => {
    b.addEventListener('click', () => applySwap(b.dataset.swapPick));
  });
  root.querySelector('#swap-custom-btn')?.addEventListener('click', () => {
    applySwap(document.getElementById('custom-swap-name')?.value);
  });
}

function openEditRestModal(exIdx) {
  const ex = state.activeWorkout?.exercises[exIdx];
  if (!ex) return;

  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Tiempo de Descanso</h3>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>
    <p class="text-xs text-muted mt-1 mb-4">${escapeHtml(ex.name)}</p>

    <div class="grid-4 gap-2 mb-4">
      ${[15, 45, 60, 75, 90, 120, 150, 180].map((sec) => `
        <button type="button" class="pill-choice ${ex.restSec === sec ? 'is-active' : ''}" data-pick-rest="${sec}">
          ${formatTime(sec)}
        </button>
      `).join('')}
    </div>

    <div class="row gap-2">
      <input id="custom-rest-input" type="number" min="5" max="600" value="${ex.restSec}" class="input flex-1 tabular-nums" placeholder="Segundos" />
      <button type="button" id="apply-rest-btn" class="btn btn--emerald btn--sm">Aplicar</button>
    </div>
  `);

  const setRest = (sec) => {
    const val = Math.max(5, Math.min(600, Number(sec) || 60));
    ex.restSec = val;
    const r = state.routines.find((d) => d.id === state.activeWorkout.dayId);
    if (r && r.exercises[exIdx]) r.exercises[exIdx].restSec = val;
    saveState();
    closeModal();
    showToast(`Descanso actualizado a ${formatTime(val)}`, 'info');
    render();
  };

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root.querySelectorAll('[data-pick-rest]').forEach((b) => {
    b.addEventListener('click', () => setRest(b.dataset.pickRest));
  });
  root.querySelector('#apply-rest-btn')?.addEventListener('click', () => {
    setRest(document.getElementById('custom-rest-input')?.value);
  });
}

function openFinishWorkoutModal() {
  const aw = state.activeWorkout;
  if (!aw) return;
  const elapsed = getSessionElapsedSeconds(aw);
  const doneSets = aw.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).length, 0);
  const totalSets = aw.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const volume = computeWorkoutVolume(aw.exercises, state);

  openModal(`
    <div class="text-center mb-4">
      <div class="trophy-badge">🏆</div>
      <h3 class="modal-title mt-2">¿Finalizar Entrenamiento?</h3>
      <p class="text-xs text-muted mt-1">${escapeHtml(aw.dayName)}</p>
    </div>

    <div class="grid-3 gap-2 mb-4">
      <div class="kpi-card text-center">
        <p class="kpi-label">Duración</p>
        <p class="text-base font-extrabold text-strong tabular-nums mt-0.5">${formatTime(elapsed)}</p>
      </div>
      <div class="kpi-card text-center">
        <p class="kpi-label">Series</p>
        <p class="text-base font-extrabold text-emerald tabular-nums mt-0.5">${doneSets}/${totalSets}</p>
      </div>
      <div class="kpi-card text-center">
        <p class="kpi-label">Volumen</p>
        <p class="text-base font-extrabold text-accent tabular-nums mt-0.5">${volume.toLocaleString('es-MX')} kg</p>
      </div>
    </div>

    ${doneSets === 0 ? `
      <div class="warn-box mb-4">
        Aún no has marcado ninguna serie como completada. Marca al menos una para guardar progreso.
      </div>
    ` : ''}

    <div class="stack-2">
      <button type="button" id="fw-save" class="btn btn--emerald btn--block">Guardar y Terminar Sesión</button>
      <button type="button" id="fw-continue" class="btn btn--surface btn--block">Seguir Entrenando</button>
      <button type="button" id="fw-discard" class="btn btn--ghost btn--block text-rose btn--sm">Descartar sesión sin guardar</button>
    </div>
  `);

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('#fw-continue')?.addEventListener('click', () => closeModal());
  root.querySelector('#fw-save')?.addEventListener('click', () => {
    const record = {
      id: 'w_' + Date.now(),
      date: new Date().toISOString(),
      dayId: aw.dayId,
      dayName: aw.dayName,
      durationSeconds: elapsed,
      totalVolume: volume,
      mode: (() => {
        const block = getReturnBlock(state);
        if (block.active) return `Vuelta S${block.week}`;
        return state.settings.readaptationMode ? 'Readaptación' : 'Progresión';
      })(),
      exercises: aw.exercises.map((ex) => ({
        name: ex.name,
        equipment: ex.equipment,
        bilateral: ex.bilateral,
        tutSeconds: ex.tutSeconds || 0,
        sessionNote: ex.sessionNote || '',
        sets: ex.sets.filter((s) => s.done)
      })).filter((ex) => ex.sets.length > 0)
    };
    if (record.exercises.length > 0) {
      state.history.unshift(record);
    }
    stopTutTimer();
    stopSessionTicker();
    skipRestTimer(getState, saveState);
    state.activeWorkout = null;
    syncWakeLock(null);
    state.ui.activeTab = 'progress';
    saveState();
    closeModal();
    showToast('¡Entrenamiento guardado en tu historial!', 'success');
    render();
  });

  root.querySelector('#fw-discard')?.addEventListener('click', () => {
    openModal(`
      <h3 class="modal-title mb-2">¿Descartar entrenamiento?</h3>
      <p class="text-xs text-muted mb-5">Se perderán las series de esta sesión y no se guardará en el historial.</p>
      <div class="row gap-2">
        <button type="button" id="dw-cancel" class="btn btn--surface flex-1">Cancelar</button>
        <button type="button" id="dw-confirm" class="btn btn--danger flex-1">Sí, descartar</button>
      </div>
    `);
    document.getElementById('dw-cancel')?.addEventListener('click', () => closeModal());
    document.getElementById('dw-confirm')?.addEventListener('click', () => {
      stopTutTimer();
      stopSessionTicker();
      skipRestTimer(getState, saveState);
      state.activeWorkout = null;
      syncWakeLock(null);
      saveState();
      closeModal();
      showToast('Sesión descartada.', 'info');
      render();
    });
  });
}

function openEditHeightModal() {
  const h = (state.bodyMetrics?.heightMeters || 1.70).toFixed(2);
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Editar Estatura</h3>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>
    <p class="text-xs text-muted mt-1 mb-4">Se usa para calcular tu Índice de Masa Corporal (IMC).</p>
    <div class="row gap-2">
      <input id="modal-height-input" type="number" step="0.01" min="1.20" max="2.30" value="${h}" class="input flex-1 tabular-nums" />
      <button type="button" id="save-h-btn" class="btn btn--emerald btn--sm">Guardar</button>
    </div>
  `);
  document.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  document.getElementById('save-h-btn')?.addEventListener('click', () => {
    const val = parseFloat(document.getElementById('modal-height-input')?.value);
    if (isNaN(val) || val < 1.2 || val > 2.3) {
      return showToast('Ingresa una estatura válida entre 1.20 y 2.30 m.', 'warning');
    }
    state.bodyMetrics.heightMeters = Math.round(val * 100) / 100;
    saveState();
    closeModal();
    showToast(`Estatura actualizada a ${state.bodyMetrics.heightMeters.toFixed(2)} m`, 'success');
    render();
  });
}

function openAdaptOffer(plan) {
  const changes = plan?.changes || [];
  if (!changes.length) {
    showToast('Tu rutina ya cabe en este equipo y espacio.', 'info');
    return;
  }
  const items = changes.slice(0, 12).map((c) => {
    const action = c.to ? `${c.from} → ${c.to}` : `Quitar ${c.from}`;
    return `<li class="text-xs text-soft">${escapeHtml(c.dayName || 'Día')}: ${escapeHtml(action)} <span class="text-muted">(${escapeHtml(c.reason || '')})</span></li>`;
  }).join('');
  const extra = changes.length > 12 ? `<p class="text-2xs text-muted mt-2">Y ${changes.length - 12} cambios más.</p>` : '';
  openModal(`
    <h3 class="modal-title mb-2">¿Adaptar la rutina?</h3>
    <p class="text-xs text-muted mb-3">Solo se cambia la rutina activa. Tu historial se queda igual. Si cancelas, el equipo nuevo se guarda y los ejercicios siguen como están.</p>
    <ul class="stack-1 mb-4" style="padding-left:16px">${items}</ul>
    ${extra}
    <div class="row gap-2 mt-4">
      <button type="button" id="adapt-skip" class="btn btn--surface flex-1">Dejar la rutina</button>
      <button type="button" id="adapt-apply" class="btn btn--primary flex-1">Adaptar</button>
    </div>
  `);
  document.getElementById('adapt-skip')?.addEventListener('click', () => {
    state.ui.dismissedAdaptKey = adaptationKey(changes);
    saveState();
    closeModal();
  });
  document.getElementById('adapt-apply')?.addEventListener('click', () => {
    state.routines = plan.routines;
    state.ui.dismissedAdaptKey = '';
    saveState();
    closeModal();
    showToast('Rutina adaptada. El historial no se modificó.', 'success');
    render();
  });
}

function maybeOfferAdapt() {
  const plan = planRoutineAdaptation(state.routines, state.equipment, state.space);
  if (!plan.changes.length) return;
  if (state.ui.dismissedAdaptKey === adaptationKey(plan.changes)) return;
  openAdaptOffer(plan);
}

function afterOnboarding() {
  render();
  maybeOfferAdapt();
}

function openConfirmModal({ title, description, confirmLabel, onConfirm }) {
  openModal(`
    <h3 class="modal-title mb-2">${escapeHtml(title)}</h3>
    <p class="text-xs text-muted mb-5">${escapeHtml(description)}</p>
    <div class="row gap-2">
      <button type="button" id="cm-cancel" class="btn btn--surface flex-1">Cancelar</button>
      <button type="button" id="cm-ok" class="btn btn--danger flex-1">${escapeHtml(confirmLabel)}</button>
    </div>
  `);
  document.getElementById('cm-cancel')?.addEventListener('click', () => closeModal());
  document.getElementById('cm-ok')?.addEventListener('click', () => {
    onConfirm();
    closeModal();
  });
}

// ---------------------------------------------------------------------------
// Notificaciones del Sistema
// ---------------------------------------------------------------------------
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Tu navegador no soporta notificaciones del sistema.', 'warning');
    return;
  }
  if (Notification.permission === 'granted') {
    state.settings.notificationsEnabled = true;
    saveState();
    sendSystemNotification('AlphaHome', 'Las notificaciones de descanso están activas.', true);
    showToast('Notificación de prueba enviada.', 'success');
    render();
    return;
  }
  Notification.requestPermission().then((perm) => {
    state.settings.notificationsEnabled = perm === 'granted';
    saveState();
    if (perm === 'granted') {
      sendSystemNotification('AlphaHome', 'Notificaciones activadas correctamente.', true);
      showToast('Notificaciones activadas.', 'success');
    } else {
      showToast('Permiso de notificaciones denegado.', 'warning');
    }
    render();
  }).catch(() => showToast('No se pudo solicitar permiso de notificaciones.', 'error'));
}

// ---------------------------------------------------------------------------
// Delegación global de eventos (Click / Input / Change / Submit)
// ---------------------------------------------------------------------------
function bindEvents() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case 'switch-tab':
        switchTab(target.dataset.tab);
        break;
      case 'dismiss-rest-alert':
        dismissRestAlert();
        break;
      case 'adjust-rest':
        adjustRestTimer(Number(target.dataset.delta), getState, saveState);
        break;
      case 'skip-rest':
        skipRestTimer(getState, saveState);
        break;
      case 'toggle-readapt':
        state.settings.readaptationMode = !state.settings.readaptationMode;
        saveState();
        showToast(
          state.settings.readaptationMode ? 'Modo Readaptación activado (RIR 2-3)' : 'Modo Doble Progresión activado',
          'info'
        );
        render();
        break;
      case 'start-workout':
        startWorkout(target.dataset.dayId);
        break;
      case 'preview-day':
        openDayPreviewModal(target.dataset.dayId);
        break;
      case 'open-routine-manager':
        openRoutineManagerModal(render, openTechnique);
        break;
      case 'open-template-picker':
        openTemplatePickerModal(render);
        break;
      case 'test-rest':
        startRestTimer(15, 'Prueba de descanso', getState, saveState);
        break;
      case 'toggle-pause':
        toggleSessionPause();
        break;
      case 'open-finish-modal':
        openFinishWorkoutModal();
        break;
      case 'open-tech':
        openTechnique(target.dataset.exName);
        break;
      case 'swap-ex':
        openSwapExerciseModal(Number(target.dataset.exIdx), 'active');
        break;
      case 'edit-rest':
        openEditRestModal(Number(target.dataset.exIdx));
        break;
      case 'start-rest':
        startRestTimer(Number(target.dataset.restSec), target.dataset.exName, getState, saveState);
        break;
      case 'toggle-tut':
        toggleTutTimer(Number(target.dataset.exIdx), getState, saveState, render);
        break;
      case 'jump-ex': {
        const card = document.getElementById(`ex-card-${target.dataset.targetIdx}`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      case 'toggle-warmup-collapse':
        if (state.activeWorkout) {
          state.activeWorkout.warmupCollapsed = !state.activeWorkout.warmupCollapsed;
          saveState();
          render();
        }
        break;
      case 'toggle-warmup': {
        const w = state.activeWorkout?.warmup?.[Number(target.dataset.wIdx)];
        if (w) {
          w.done = !w.done;
          if (state.activeWorkout.warmup.every((item) => item.done)) {
            showToast('¡Calentamiento completado! Listo para tus series.', 'success');
          }
          saveState();
          render();
        }
        break;
      }
      case 'complete-all-warmup':
        if (state.activeWorkout?.warmup) {
          state.activeWorkout.warmup.forEach((w) => { w.done = true; });
          state.activeWorkout.warmupCollapsed = true;
          saveState();
          showToast('Calentamiento marcado como listo.', 'success');
          render();
        }
        break;
      case 'step-set': {
        const exIdx = Number(target.dataset.exIdx);
        const setIdx = Number(target.dataset.setIdx);
        const field = target.dataset.field;
        const delta = Number(target.dataset.delta);
        const s = state.activeWorkout?.exercises[exIdx]?.sets[setIdx];
        if (!s) break;
        const curr = Number(s[field]) || 0;
        const next = Math.max(0, Math.round((curr + delta) * 10) / 10);
        s[field] = next;
        saveState();
        updateLiveSetRowDOM(exIdx, setIdx);
        break;
      }
      case 'toggle-set-done': {
        const exIdx = Number(target.dataset.exIdx);
        const setIdx = Number(target.dataset.setIdx);
        const ex = state.activeWorkout?.exercises[exIdx];
        const s = ex?.sets[setIdx];
        if (!s) break;
        s.done = !s.done;
        if (s.done && state.settings.autoRest) {
          startRestTimer(ex.restSec, ex.name, getState, saveState);
        }
        saveState();
        // Actualización ligera del DOM sin destruir scroll ni inputs abiertos
        const row = document.querySelector(`[data-set-row="${exIdx}-${setIdx}"]`);
        if (row) {
          row.classList.toggle('is-done', s.done);
          row.querySelector('.done-btn')?.classList.toggle('is-done', s.done);
          const numEl = row.querySelector('.set-num');
          if (numEl) {
            numEl.classList.toggle('text-emerald', s.done);
            numEl.classList.toggle('text-muted', !s.done);
          }
          updateSessionTimerUI(state);
        } else {
          render();
        }
        break;
      }
      case 'cycle-band': {
        const exIdx = Number(target.dataset.exIdx);
        const setIdx = Number(target.dataset.setIdx);
        const count = Math.max(1, Number(target.dataset.bandCount) || 1);
        const s = state.activeWorkout?.exercises[exIdx]?.sets[setIdx];
        if (!s) break;
        if (!s.mods) s.mods = {};
        const current = Number(s.mods.bandLevel) || 1;
        s.mods.bandLevel = current >= count ? 1 : current + 1;
        s.mods.band = true;
        saveState();
        render();
        break;
      }
      case 'toggle-mod': {
        const exIdx = Number(target.dataset.exIdx);
        const setIdx = Number(target.dataset.setIdx);
        const modKey = target.dataset.modKey;
        const s = state.activeWorkout?.exercises[exIdx]?.sets[setIdx];
        if (!s) break;
        if (!s.mods) s.mods = { vest: false, band: false, pause: false, chain: false, belt: false, bandLevel: 0 };
        s.mods[modKey] = !s.mods[modKey];
        saveState();
        target.classList.toggle('is-active', s.mods[modKey]);
        target.textContent = (s.mods[modKey] ? '✓ ' : '+ ') + target.textContent.replace(/^[✓+]\s*/, '');
        updateLiveSetRowDOM(exIdx, setIdx);
        break;
      }
      case 'copy-prev-set': {
        const exIdx = Number(target.dataset.exIdx);
        const setIdx = Number(target.dataset.setIdx);
        const ex = state.activeWorkout?.exercises[exIdx];
        const prev = ex?.sets[setIdx - 1];
        const curr = ex?.sets[setIdx];
        if (!prev || !curr) break;
        curr.weight = prev.weight;
        curr.reps = prev.reps;
        curr.rir = prev.rir;
        curr.mods = { vest: false, band: false, pause: false, chain: false, belt: false, bandLevel: 0, ...(prev.mods || {}) };
        saveState();
        render();
        showToast(`Serie ${setIdx + 1} copiada desde S${setIdx}`, 'info');
        break;
      }
      case 'add-set': {
        const ex = state.activeWorkout?.exercises[Number(target.dataset.exIdx)];
        if (!ex) break;
        const lastSet = ex.sets[ex.sets.length - 1] || { weight: '', reps: ex.minReps, rir: 2, mods: {} };
        ex.sets.push({
          weight: lastSet.weight,
          reps: lastSet.reps,
          rir: lastSet.rir,
          done: false,
          mods: { ...(lastSet.mods || { vest: false, band: false, pause: false, chain: false }) }
        });
        saveState();
        render();
        break;
      }
      case 'remove-set': {
        const ex = state.activeWorkout?.exercises[Number(target.dataset.exIdx)];
        if (!ex) break;
        if (ex.sets.length <= 1) {
          showToast('Debe quedar al menos 1 serie en el ejercicio.', 'warning');
          break;
        }
        ex.sets.pop();
        saveState();
        render();
        break;
      }
      case 'select-metric':
        state.ui.selectedProgressMetric = target.dataset.metric;
        saveState();
        render();
        break;
      case 'delete-history': {
        const idx = Number(target.dataset.histIdx);
        openConfirmModal({
          title: '¿Eliminar esta sesión?',
          description: 'Se eliminará el registro de tu historial y se actualizarán tus gráficas.',
          confirmLabel: 'Eliminar',
          onConfirm: () => {
            state.history.splice(idx, 1);
            saveState();
            showToast('Sesión eliminada.', 'info');
            render();
          }
        });
        break;
      }
      case 'edit-height':
        openEditHeightModal();
        break;
      case 'step-bw': {
        const input = document.getElementById('bw-input-weight');
        if (!input) break;
        const base = parseFloat(input.value) || getCurrentBodyWeight(state) || 65;
        const next = Math.max(30, Math.min(250, Math.round((base + Number(target.dataset.delta)) * 10) / 10));
        input.value = next.toFixed(1);
        break;
      }
      case 'quick-bw-note': {
        const noteEl = document.getElementById('bw-input-note');
        if (noteEl) noteEl.value = target.dataset.note;
        break;
      }
      case 'delete-bw': {
        const id = target.dataset.logId;
        openConfirmModal({
          title: '¿Eliminar este registro de peso?',
          description: 'Se actualizarán tu gráfica, promedio móvil de 7 días e IMC.',
          confirmLabel: 'Eliminar',
          onConfirm: () => {
            state.bodyMetrics.logs = state.bodyMetrics.logs.filter((l) => l.id !== id);
            saveState();
            showToast('Registro de peso eliminado.', 'info');
            render();
          }
        });
        break;
      }
      case 'reopen-onboarding':
        openOnboardingWizard(afterOnboarding, { isReconfigure: true });
        break;
      case 'save-profile': {
        const nameVal = document.getElementById('set-profile-name')?.value.trim().slice(0, 32) || '';
        const hVal = parseFloat(document.getElementById('set-height')?.value);
        const minVal = Number(document.getElementById('set-session-min')?.value);
        if (isNaN(hVal) || hVal < 1.2 || hVal > 2.3) {
          showToast('Ingresa una estatura válida entre 1.20 y 2.30 m.', 'warning');
          break;
        }
        state.profile.name = nameVal;
        state.bodyMetrics.heightMeters = Math.round(hVal * 100) / 100;
        if (Number.isFinite(minVal)) {
          state.settings.sessionGoalMin = Math.max(20, Math.min(180, minVal));
        }
        saveState();
        showToast('Perfil actualizado.', 'success');
        render();
        break;
      }
      case 'set-goal':
        state.profile.goal = target.dataset.goal;
        saveState();
        render();
        break;
      case 'set-level':
        state.profile.level = target.dataset.level;
        saveState();
        render();
        break;
      case 'set-days':
        state.profile.daysPerWeek = Number(target.dataset.days) === 3 ? 3 : 4;
        saveState();
        render();
        break;
      case 'set-theme':
        state.profile.theme = target.dataset.themeId;
        saveState();
        applyTheme(state.profile.theme);
        render();
        break;
      case 'toggle-equipment': {
        const key = target.dataset.eqKey;
        state.equipment[key] = !state.equipment[key];
        if (key === 'hasBench' && !state.equipment.hasBench) state.equipment.hasDeclineBench = false;
        if (key === 'hasDeclineBench' && state.equipment.hasDeclineBench) state.equipment.hasBench = true;
        saveState();
        render();
        break;
      }
      case 'toggle-space': {
        const key = target.dataset.spaceKey;
        if (!state.space) state.space = { hasRoom: true, roomWidthM: 0, roomLengthM: 0, hasHallway: false, hallwayLengthM: 0, hallwayWidthM: 0 };
        state.space[key] = !state.space[key];
        saveState();
        render();
        break;
      }
      case 'save-equipment': {
        const maxDb = Math.max(2, Math.min(80, Number(document.getElementById('set-maxdb')?.value) || state.equipment.maxDumbbellKg || 12));
        const stepDb = Math.max(0.5, Math.min(5, Math.round((Number(document.getElementById('set-stepdb')?.value) || 1) * 2) / 2));
        const vestKg = Math.max(1, Math.min(40, Number(document.getElementById('set-vestkg')?.value) || state.equipment.vestKg || 10));
        const bandCount = Math.max(0, Math.min(12, Math.round(Number(document.getElementById('set-bands')?.value) || 0)));
        const dim = (id) => {
          const n = Number(document.getElementById(id)?.value);
          return Number.isFinite(n) && n > 0 ? Math.round(Math.min(30, n) * 10) / 10 : 0;
        };
        state.equipment.maxDumbbellKg = maxDb;
        state.equipment.dumbbellStepKg = stepDb;
        state.equipment.vestKg = vestKg;
        state.equipment.bandCount = bandCount;
        state.equipment.hasBands = bandCount > 0;
        state.space = {
          ...(state.space || {}),
          roomWidthM: dim('set-room-w'),
          roomLengthM: dim('set-room-l'),
          hallwayLengthM: dim('set-hall-l'),
          hallwayWidthM: dim('set-hall-w')
        };
        saveState();
        showToast('Equipo y espacio guardados. La rutina no se modificó.', 'success');
        render();
        maybeOfferAdapt();
        break;
      }
      case 'review-routine-fit': {
        const plan = planRoutineAdaptation(state.routines, state.equipment, state.space);
        openAdaptOffer(plan);
        break;
      }
      case 'toggle-return-block': {
        const on = !state.settings.returningFromBreak;
        state.settings.returningFromBreak = on;
        state.settings.readaptationMode = on ? true : state.settings.readaptationMode;
        state.settings.returnBlockStartedAt = on ? Date.now() : state.settings.returnBlockStartedAt;
        saveState();
        showToast(on ? 'Bloque de vuelta iniciado. Semanas 1-2 con menos series y sin subir kilos.' : 'Bloque de vuelta desactivado.', 'info');
        render();
        break;
      }
      case 'end-return-block':
        state.settings.returningFromBreak = false;
        state.settings.readaptationMode = false;
        saveState();
        showToast('Saliste del bloque de vuelta. El plan completo vuelve a aplicar.', 'info');
        render();
        break;
      case 'export-routines':
        exportRoutinesOnly();
        showToast('Rutina descargada, sin historial.', 'success');
        break;
      case 'export-setup':
        exportSetup();
        showToast('Rutina y configuración descargadas, sin historial.', 'success');
        break;
      case 'toggle-setting': {
        const key = target.dataset.key;
        state.settings[key] = !state.settings[key];
        saveState();
        render();
        break;
      }
      case 'test-beep':
        playRestBeep(true);
        break;
      case 'toggle-wakelock':
        setWakeLockPreferred(!isWakeLockPreferred());
        syncWakeLock(state.activeWorkout);
        render();
        break;
      case 'request-notif':
        requestNotificationPermission();
        break;
      case 'export-backup':
        exportFullBackup();
        showToast('Respaldo JSON descargado.', 'success');
        break;
      case 'open-reset-modal':
        openConfirmModal({
          title: '¿Reiniciar toda la aplicación?',
          description: 'Se borrará tu historial, perfil y rutinas locales. Exporta un respaldo JSON primero si deseas conservarlo.',
          confirmLabel: 'Sí, reiniciar',
          onConfirm: () => {
            stopTutTimer();
            stopSessionTicker();
            skipRestTimer(getState, saveState);
            try { localStorage.removeItem(WAKE_LOCK_PREF_KEY); } catch {}
            replaceState(getDefaultState(true));
            syncWakeLock(null);
            showToast('Datos reiniciados.', 'info');
            render();
            openOnboardingWizard(afterOnboarding);
          }
        });
        break;
      case 'pwa-install':
        triggerPwaInstall();
        break;
    }
  });

  // Inputs en vivo (no destructivos: guardan sin re-renderizar ni cerrar teclado!)
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.setInput) {
      const [exIdxStr, setIdxStr, field] = el.dataset.setInput.split(':');
      const exIdx = Number(exIdxStr);
      const setIdx = Number(setIdxStr);
      const s = state.activeWorkout?.exercises[exIdx]?.sets[setIdx];
      if (!s) return;
      s[field] = el.value === '' ? '' : Number(el.value);
      saveState();
      updateLiveSetRowDOM(exIdx, setIdx);
    } else if (el.dataset.exNote !== undefined) {
      const ex = state.activeWorkout?.exercises[Number(el.dataset.exNote)];
      if (!ex) return;
      ex.sessionNote = el.value;
      saveState();
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'progress-ex-select') {
      state.ui.selectedProgressExercise = el.value;
      saveState();
      render();
    } else if (el.id === 'import-backup-input') {
      const file = el.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const kind = classifyImport(parsed);
          if (kind === 'invalid') throw new Error('Formato inválido');
          if (kind === 'backup') {
            stopTutTimer();
            stopSessionTicker();
            skipRestTimer(getState, saveState);
            const next = normalizeState(parsed, { isExistingUser: true });
            replaceState(next);
            if (state.activeWorkout) startSessionTicker(getState);
            restoreRestTimer(getState, saveState);
            syncWakeLock(state.activeWorkout);
            showToast('Respaldo importado. Historial del archivo restaurado.', 'success');
            render();
            return;
          }
          openShareImportModal(parsed, () => {
            render();
          });
        } catch {
          showToast('El archivo JSON no es válido.', 'error');
        }
      };
      reader.readAsText(file);
      el.value = '';
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'bw-form') {
      e.preventDefault();
      const dateVal = document.getElementById('bw-input-date')?.value || getTodayDateString();
      const weightVal = parseFloat(document.getElementById('bw-input-weight')?.value);
      const noteVal = document.getElementById('bw-input-note')?.value.trim() || '';
      if (isNaN(weightVal) || weightVal < 30 || weightVal > 250) {
        return showToast('Ingresa un peso válido entre 30 y 250 kg.', 'warning');
      }
      state.bodyMetrics.logs.push({
        id: 'bw_' + Date.now(),
        date: dateVal,
        weight: Math.round(weightVal * 10) / 10,
        note: noteVal
      });
      saveState();
      showToast(`Pesaje guardado: ${weightVal.toFixed(1)} kg`, 'success');
      render();
    }
  });
}

// ---------------------------------------------------------------------------
// PWA: Service Worker e Instalación
// ---------------------------------------------------------------------------
function showAppUpdateToast(worker) {
  const container = document.getElementById('toast-container');
  if (!container || !worker || document.getElementById('sw-update-toast')) return;
  const el = document.createElement('button');
  el.id = 'sw-update-toast';
  el.type = 'button';
  el.className = 'toast toast--info pointer-auto';
  el.textContent = 'Nueva versión disponible • Toca para recargar';
  el.addEventListener('click', () => {
    appUpdateReady = true;
    try { sessionStorage.setItem(SW_RELOAD_FLAG, '1'); } catch {}
    try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch {}
  });
  container.appendChild(el);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    let pending = appUpdateReady;
    try {
      if (sessionStorage.getItem(SW_RELOAD_FLAG) === '1') pending = true;
      sessionStorage.removeItem(SW_RELOAD_FLAG);
    } catch {}
    if (pending) window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .then((reg) => {
      swRegistration = reg;
      setSwRegistration(reg);
      if (reg.waiting && navigator.serviceWorker.controller) {
        showAppUpdateToast(reg.waiting);
      }
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showAppUpdateToast(worker);
          }
        });
      });
    })
    .catch(() => {});
}

function triggerPwaInstall() {
  const promptEvent = deferredInstallPrompt;
  if (!promptEvent) return;
  deferredInstallPrompt = null;
  const finish = () => { if (state.ui.activeTab === 'settings') render(); };
  try {
    const res = promptEvent.prompt();
    if (promptEvent.userChoice?.then) promptEvent.userChoice.then(finish).catch(finish);
    else if (res?.then) res.then(finish).catch(finish);
    else finish();
  } catch {
    finish();
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (state.ui.activeTab === 'settings') render();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (state.ui.activeTab === 'settings') render();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncWakeLock(state.activeWorkout);
    restoreRestTimer(getState, saveState);
    if (swRegistration?.update) swRegistration.update().catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initModalDismissHandlers();
  bindEvents();
  registerServiceWorker();
  applyTheme(state.profile?.theme || 'cyan');

  if (state.activeWorkout) startSessionTicker(getState);
  restoreRestTimer(getState, saveState);
  syncWakeLock(state.activeWorkout);
  render();

  if (!state.profile?.onboardingCompleted) {
    openOnboardingWizard(afterOnboarding);
  }
});
