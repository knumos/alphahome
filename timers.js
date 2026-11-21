/**
 * AlphaHome — Temporizadores Persistentes (Sesión, Descanso y TUT)
 *
 * El temporizador de descanso persiste endTime en state.activeRest (localStorage)
 * para sobrevivir a suspensiones y recargas de la PWA en iOS/Android.
 */

import {
  formatTime, ensureAudioContext, playRestBeep, triggerVibration,
  sendSystemNotification, updateWakeLockIndicator, showToast
} from '../utils.js';

export const restTimer = {
  active: false,
  endTime: 0,
  totalSec: 0,
  remainingSec: 0,
  exerciseName: '',
  intervalId: null
};

export const tutTimer = {
  active: false,
  exerciseIdx: null,
  startTime: 0,
  elapsedSec: 0,
  intervalId: null
};

let sessionTickerId = null;

// ---------------------------------------------------------------------------
// Temporizador de Sesión
// ---------------------------------------------------------------------------
export function getSessionElapsedSeconds(activeWorkout) {
  if (!activeWorkout) return 0;
  if (activeWorkout.paused) return activeWorkout.accumulatedSec || 0;
  return (activeWorkout.accumulatedSec || 0) + Math.floor((Date.now() - activeWorkout.lastResumeAt) / 1000);
}

export function startSessionTicker(getState) {
  stopSessionTicker();
  sessionTickerId = setInterval(() => {
    const st = getState();
    if (st.activeWorkout) {
      updateSessionTimerUI(st);
    }
  }, 1000);
}

export function stopSessionTicker() {
  if (sessionTickerId) {
    clearInterval(sessionTickerId);
    sessionTickerId = null;
  }
}

export function updateSessionTimerUI(state) {
  const aw = state.activeWorkout;
  if (!aw) return;
  const elapsed = getSessionElapsedSeconds(aw);
  const goalMin = state.settings?.sessionGoalMin || 60;
  const goalSec = goalMin * 60;
  const pct = Math.min(100, (elapsed / goalSec) * 100);

  const labelEl = document.getElementById('session-timer-label');
  const fillEl = document.getElementById('session-progress-fill');
  const setsEl = document.getElementById('session-sets-progress');

  if (labelEl) {
    labelEl.textContent = `${formatTime(elapsed)} / ${goalMin}:00${aw.paused ? ' (Pausa)' : ''}`;
  }
  if (fillEl) {
    fillEl.style.width = `${pct}%`;
    fillEl.classList.toggle('is-overtime', elapsed > goalSec);
  }
  if (setsEl) {
    const totalSets = aw.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const doneSets = aw.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).length, 0);
    setsEl.textContent = `${doneSets} / ${totalSets} series`;
  }
  updateWakeLockIndicator(!aw.paused);
}

// ---------------------------------------------------------------------------
// Temporizador de Descanso (Persistente en localStorage)
// ---------------------------------------------------------------------------
function clearRestInterval() {
  if (restTimer.intervalId) {
    clearInterval(restTimer.intervalId);
    restTimer.intervalId = null;
  }
}

export function dismissRestAlert() {
  const banner = document.getElementById('rest-alert-banner');
  if (!banner) return;
  banner.classList.add('hidden');
  banner.firstElementChild?.classList.remove('rest-complete-flash');
}

export function updateRestWidgetUI() {
  const widget = document.getElementById('rest-timer-widget');
  if (!widget) return;
  if (!restTimer.active) {
    widget.classList.add('hidden');
    return;
  }
  widget.classList.remove('hidden');
  const exEl = document.getElementById('rest-widget-exercise');
  const cdEl = document.getElementById('rest-widget-countdown');
  const barEl = document.getElementById('rest-widget-bar');
  if (exEl) exEl.textContent = restTimer.exerciseName;
  if (cdEl) cdEl.textContent = formatTime(restTimer.remainingSec);
  if (barEl) {
    const pct = restTimer.totalSec > 0 ? Math.max(0, (restTimer.remainingSec / restTimer.totalSec) * 100) : 0;
    barEl.style.width = `${pct}%`;
  }
}

function tickRest(getState, saveState) {
  const rem = Math.max(0, Math.ceil((restTimer.endTime - Date.now()) / 1000));
  restTimer.remainingSec = rem;
  updateRestWidgetUI();
  if (rem <= 0) {
    completeRestTimer(getState, saveState);
  }
}

export function startRestTimer(seconds, exerciseName, getState, saveState) {
  ensureAudioContext();
  dismissRestAlert();
  const sec = Math.max(5, Number(seconds) || 60);
  const now = Date.now();
  restTimer.active = true;
  restTimer.totalSec = sec;
  restTimer.remainingSec = sec;
  restTimer.endTime = now + sec * 1000;
  restTimer.exerciseName = exerciseName || 'Descanso';

  const st = getState();
  st.activeRest = {
    endTime: restTimer.endTime,
    totalSec: restTimer.totalSec,
    exerciseName: restTimer.exerciseName
  };
  saveState();

  clearRestInterval();
  updateRestWidgetUI();
  restTimer.intervalId = setInterval(() => tickRest(getState, saveState), 250);
}

export function restoreRestTimer(getState, saveState) {
  const st = getState();
  const saved = st.activeRest;
  if (!saved || !saved.endTime) return;

  const remainingMs = saved.endTime - Date.now();
  if (remainingMs > 0) {
    restTimer.active = true;
    restTimer.endTime = saved.endTime;
    restTimer.totalSec = Math.max(5, Number(saved.totalSec) || 60);
    restTimer.remainingSec = Math.ceil(remainingMs / 1000);
    restTimer.exerciseName = saved.exerciseName || 'Descanso';
    clearRestInterval();
    updateRestWidgetUI();
    restTimer.intervalId = setInterval(() => tickRest(getState, saveState), 250);
  } else if (remainingMs > -5 * 60 * 1000) {
    // Expiró hace menos de 5 min mientras la app estaba suspendida
    restTimer.exerciseName = saved.exerciseName || 'Descanso';
    completeRestTimer(getState, saveState);
  } else {
    st.activeRest = null;
    saveState();
  }
}

export function adjustRestTimer(deltaSec, getState, saveState) {
  if (!restTimer.active) return;
  const newEnd = restTimer.endTime + deltaSec * 1000;
  const newRem = Math.max(1, Math.ceil((newEnd - Date.now()) / 1000));
  restTimer.endTime = Date.now() + newRem * 1000;
  restTimer.remainingSec = newRem;
  if (newRem > restTimer.totalSec) restTimer.totalSec = newRem;

  const st = getState();
  st.activeRest = {
    endTime: restTimer.endTime,
    totalSec: restTimer.totalSec,
    exerciseName: restTimer.exerciseName
  };
  saveState();
  updateRestWidgetUI();
}

export function skipRestTimer(getState, saveState) {
  clearRestInterval();
  restTimer.active = false;
  const st = getState();
  if (st.activeRest) {
    st.activeRest = null;
    saveState();
  }
  updateRestWidgetUI();
}

export function completeRestTimer(getState, saveState) {
  clearRestInterval();
  restTimer.active = false;
  const st = getState();
  st.activeRest = null;
  saveState();
  updateRestWidgetUI();

  playRestBeep(st.settings?.soundEnabled);
  triggerVibration(st.settings?.vibrationEnabled);
  sendSystemNotification(
    '¡Descanso terminado!',
    `Siguiente serie: ${restTimer.exerciseName}`,
    Boolean(st.settings?.notificationsEnabled)
  );

  const banner = document.getElementById('rest-alert-banner');
  const sub = document.getElementById('rest-alert-subtitle');
  if (banner && sub) {
    sub.textContent = `Siguiente serie: ${restTimer.exerciseName}`;
    banner.classList.remove('hidden');
    banner.firstElementChild?.classList.add('rest-complete-flash');
  }
}

// ---------------------------------------------------------------------------
// Cronómetro de Serie (TUT) — limpieza segura al finalizar/descartar
// ---------------------------------------------------------------------------
export function stopTutTimer() {
  if (tutTimer.intervalId) {
    clearInterval(tutTimer.intervalId);
    tutTimer.intervalId = null;
  }
  tutTimer.active = false;
  tutTimer.exerciseIdx = null;
  tutTimer.elapsedSec = 0;
}

export function toggleTutTimer(exIdx, getState, saveState, onRender) {
  ensureAudioContext();
  const st = getState();
  if (tutTimer.active && tutTimer.exerciseIdx === exIdx) {
    const elapsed = Math.floor((Date.now() - tutTimer.startTime) / 1000);
    stopTutTimer();
    if (st.activeWorkout && st.activeWorkout.exercises[exIdx]) {
      st.activeWorkout.exercises[exIdx].tutSeconds = elapsed;
      saveState();
    }
    showToast(`Serie cronometrada: ${elapsed}s bajo tensión`, 'info');
    onRender();
    return;
  }

  stopTutTimer();
  tutTimer.active = true;
  tutTimer.exerciseIdx = exIdx;
  tutTimer.startTime = Date.now();
  tutTimer.elapsedSec = 0;

  tutTimer.intervalId = setInterval(() => {
    tutTimer.elapsedSec = Math.floor((Date.now() - tutTimer.startTime) / 1000);
    const el = document.getElementById(`tut-display-${exIdx}`);
    if (el) el.textContent = `${tutTimer.elapsedSec}s`;
  }, 250);

  onRender();
}
