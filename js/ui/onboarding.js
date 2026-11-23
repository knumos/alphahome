/**
 * AlphaHome — Onboarding obligatorio en el primer arranque.
 * Nombre, equipo, espacio, objetivo y plantilla. No se puede omitir.
 */

import { ROUTINE_TEMPLATES, suggestTemplateId } from '../data/templates.js';
import { state, saveState, applyRoutineTemplate } from '../state.js';
import { THEMES, applyTheme, escapeHtml, getTodayDateString, openModal, closeModal, showToast } from '../utils.js';

let draft = null;

const GOAL_OPTIONS = [
  { id: 'hypertrophy', label: 'Hipertrofia' },
  { id: 'strength', label: 'Fuerza' },
  { id: 'glute', label: 'Glúteo' },
  { id: 'general', label: 'General' }
];

const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Principiante' },
  { id: 'intermediate', label: 'Intermedio' },
  { id: 'advanced', label: 'Avanzado' }
];

function initDraft(isReconfigure) {
  const eq = state.equipment || {};
  const space = state.space || {};
  const fresh = !state.profile?.onboardingCompleted;
  draft = {
    step: 1,
    isReconfigure,
    replaceRoutine: !isReconfigure,
    templateManual: false,
    name: state.profile?.name || '',
    theme: state.profile?.theme || 'cyan',
    heightMeters: state.bodyMetrics?.heightMeters || 1.70,
    initialWeight: '',
    maxDumbbellKg: eq.maxDumbbellKg ?? 12,
    dumbbellStepKg: eq.dumbbellStepKg ?? 1,
    hasBench: eq.hasBench ?? false,
    hasDeclineBench: eq.hasDeclineBench ?? false,
    bandCount: Number.isFinite(Number(eq.bandCount)) ? Number(eq.bandCount) : (eq.hasBands ? 1 : 0),
    hasPullupBar: eq.hasPullupBar ?? false,
    hasWeightBelt: eq.hasWeightBelt ?? false,
    hasVest: eq.hasVest ?? false,
    vestKg: eq.vestKg || 10,
    hasRoom: space.hasRoom !== false,
    roomWidthM: space.roomWidthM || '',
    roomLengthM: space.roomLengthM || '',
    hasHallway: Boolean(space.hasHallway),
    hallwayLengthM: space.hallwayLengthM || '',
    hallwayWidthM: space.hallwayWidthM || '',
    goal: state.profile?.goal || 'general',
    level: state.profile?.level || 'beginner',
    daysPerWeek: state.profile?.daysPerWeek === 3 ? 3 : 4,
    sessionGoalMin: state.settings?.sessionGoalMin || 60,
    returningFromBreak: fresh
      ? ((state.profile?.level || 'beginner') === 'beginner')
      : Boolean(state.settings?.returningFromBreak),
    returnTouched: Boolean(isReconfigure),
    templateId: 'fullbody_3d'
  };
  draft.templateId = suggestTemplateId(draft, draftEquipment());
}

function draftEquipment() {
  return {
    maxDumbbellKg: Number(draft.maxDumbbellKg) || 12,
    dumbbellStepKg: Number(draft.dumbbellStepKg) || 1,
    hasBench: Boolean(draft.hasBench),
    hasDeclineBench: Boolean(draft.hasBench && draft.hasDeclineBench),
    bandCount: Math.max(0, Number(draft.bandCount) || 0),
    hasBands: Number(draft.bandCount) > 0,
    hasPullupBar: Boolean(draft.hasPullupBar),
    hasWeightBelt: Boolean(draft.hasWeightBelt),
    hasVest: Boolean(draft.hasVest),
    vestKg: Number(draft.vestKg) || 10
  };
}

function draftSpace() {
  return {
    hasRoom: Boolean(draft.hasRoom),
    roomWidthM: Number(draft.roomWidthM) || 0,
    roomLengthM: Number(draft.roomLengthM) || 0,
    hasHallway: Boolean(draft.hasHallway),
    hallwayLengthM: Number(draft.hallwayLengthM) || 0,
    hallwayWidthM: Number(draft.hallwayWidthM) || 0
  };
}

function syncSuggestion() {
  if (draft.templateManual) return;
  draft.templateId = suggestTemplateId(
    { goal: draft.goal, daysPerWeek: draft.daysPerWeek },
    draftEquipment()
  );
}

function renderStepHtml() {
  const step = draft.step;
  const themeList = Object.values(THEMES);
  let bodyHtml = '';

  if (step === 1) {
    bodyHtml = `
      <div class="stack-3">
        <div>
          <label class="field-label" for="ob-name">¿Cómo te llamas?</label>
          <input id="ob-name" type="text" maxlength="32" value="${escapeHtml(draft.name)}" placeholder="Tu nombre" class="input" />
        </div>
        <div class="grid-2 gap-3">
          <div>
            <label class="field-label" for="ob-height">Estatura (m)</label>
            <input id="ob-height" type="number" step="0.01" min="1.20" max="2.30" value="${Number(draft.heightMeters).toFixed(2)}" class="input tabular-nums" />
          </div>
          <div>
            <label class="field-label" for="ob-weight">Peso inicial kg (opcional)</label>
            <input id="ob-weight" type="number" step="0.1" min="30" max="250" value="${escapeHtml(String(draft.initialWeight))}" placeholder="Ej. 70.5" class="input tabular-nums" />
          </div>
        </div>
        <div>
          <span class="field-label">Color de acento</span>
          <div class="theme-picker mt-1.5">
            ${themeList.map((t) => `
              <button type="button" class="theme-swatch ${draft.theme === t.id ? 'is-active' : ''}" data-ob-theme="${t.id}" aria-label="Tema ${t.name}">
                <span class="theme-dot" style="background:${t.swatch}"></span>
                <span class="text-2xs font-bold">${t.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (step === 2) {
    bodyHtml = `
      <div class="stack-3">
        <p class="text-xs text-muted">Estos datos quedan en este teléfono. No asumimos el gimnasio de nadie más.</p>
        <div>
          <label class="field-label" for="ob-maxdb">Peso máximo por mancuerna (kg)</label>
          <div class="chip-row mb-2">
            ${[8, 10, 12, 16, 20, 24].map((kg) => `
              <button type="button" class="pill-choice ${Number(draft.maxDumbbellKg) === kg ? 'is-active' : ''}" data-ob-maxdb="${kg}">${kg} kg</button>
            `).join('')}
          </div>
          <input id="ob-maxdb" type="number" min="2" max="80" step="0.5" value="${draft.maxDumbbellKg}" class="input tabular-nums" />
        </div>
        <div>
          <span class="field-label">Salto entre cargas (también puedes anotar 13.5 o 18.1)</span>
          <div class="grid-3 gap-2 mt-1">
            ${[0.5, 1, 2].map((st) => `
              <button type="button" class="pill-choice ${Number(draft.dumbbellStepKg) === st ? 'is-active' : ''}" data-ob-step="${st}">+${st} kg</button>
            `).join('')}
          </div>
        </div>
        <div>
          <label class="field-label" for="ob-bands">¿Cuántas bandas de distinta resistencia tienes?</label>
          <input id="ob-bands" type="number" min="0" max="12" step="1" value="${draft.bandCount}" class="input tabular-nums" />
        </div>
        <div class="stack-2 pt-1">
          ${[
            ['hasBench', 'Banco (plano / inclinado)'],
            ['hasDeclineBench', 'Ese banco también declina'],
            ['hasPullupBar', 'Barra de dominadas (sin espacio para muscle-up)'],
            ['hasWeightBelt', 'Cinturón o cadena para colgar una mancuerna'],
            ['hasVest', 'Chaleco lastrado']
          ].map(([key, label]) => `
            <label class="toggle-row">
              <span class="text-sm font-semibold">${label}</span>
              <input type="checkbox" class="toggle-check" data-ob-eq="${key}" ${draft[key] ? 'checked' : ''} />
            </label>
          `).join('')}
        </div>
        <p class="text-2xs text-muted">La cadena solo sujeta la mancuerna o sirve para un curl ligero. No se guarda como kilos.</p>
        ${draft.hasVest ? `
          <div>
            <label class="field-label" for="ob-vestkg">Peso del chaleco (kg)</label>
            <input id="ob-vestkg" type="number" min="1" max="40" step="0.5" value="${draft.vestKg}" class="input tabular-nums" />
          </div>
        ` : ''}
      </div>
    `;
  } else if (step === 3) {
    bodyHtml = `
      <div class="stack-3">
        <p class="text-xs text-muted">El pasillo habilita zancadas caminando, paseo del granjero y gateo del oso. Si no lo marcas, no se sugieren.</p>
        <label class="toggle-row">
          <span class="text-sm font-semibold">Tengo un cuarto para entrenar</span>
          <input type="checkbox" class="toggle-check" data-ob-space="hasRoom" ${draft.hasRoom ? 'checked' : ''} />
        </label>
        <div class="grid-2 gap-3">
          <div>
            <label class="field-label" for="ob-room-w">Ancho del cuarto (m)</label>
            <input id="ob-room-w" type="number" min="0" max="30" step="0.1" value="${draft.roomWidthM}" placeholder="Ej. 3" class="input tabular-nums" />
          </div>
          <div>
            <label class="field-label" for="ob-room-l">Largo del cuarto (m)</label>
            <input id="ob-room-l" type="number" min="0" max="30" step="0.1" value="${draft.roomLengthM}" placeholder="Ej. 4" class="input tabular-nums" />
          </div>
        </div>
        <label class="toggle-row">
          <span class="text-sm font-semibold">Tengo un pasillo</span>
          <input type="checkbox" class="toggle-check" data-ob-space="hasHallway" ${draft.hasHallway ? 'checked' : ''} />
        </label>
        ${draft.hasHallway ? `
          <div class="grid-2 gap-3">
            <div>
              <label class="field-label" for="ob-hall-l">Largo del pasillo (m)</label>
              <input id="ob-hall-l" type="number" min="0" max="30" step="0.1" value="${draft.hallwayLengthM}" placeholder="Ej. 6.5" class="input tabular-nums" />
            </div>
            <div>
              <label class="field-label" for="ob-hall-w">Ancho del pasillo (m)</label>
              <input id="ob-hall-w" type="number" min="0" max="30" step="0.1" value="${draft.hallwayWidthM}" placeholder="Ej. 2" class="input tabular-nums" />
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    syncSuggestion();
    const suggested = suggestTemplateId(
      { goal: draft.goal, daysPerWeek: draft.daysPerWeek },
      draftEquipment()
    );
    bodyHtml = `
      <div class="stack-3">
        <div>
          <span class="field-label">Objetivo</span>
          <div class="chip-row mt-1">
            ${GOAL_OPTIONS.map((g) => `
              <button type="button" class="pill-choice ${draft.goal === g.id ? 'is-active' : ''}" data-ob-goal="${g.id}">${g.label}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <span class="field-label">Nivel</span>
          <div class="chip-row mt-1">
            ${LEVEL_OPTIONS.map((g) => `
              <button type="button" class="pill-choice ${draft.level === g.id ? 'is-active' : ''}" data-ob-level="${g.id}">${g.label}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <span class="field-label">Días por semana</span>
          <div class="grid-2 gap-2 mt-1">
            ${[3, 4].map((d) => `
              <button type="button" class="pill-choice ${Number(draft.daysPerWeek) === d ? 'is-active' : ''}" data-ob-days="${d}">${d} días</button>
            `).join('')}
          </div>
        </div>
        <div>
          <span class="field-label">Duración objetivo de la sesión</span>
          <div class="chip-row mt-1">
            ${[45, 50, 60, 75].map((m) => `
              <button type="button" class="pill-choice ${Number(draft.sessionGoalMin) === m ? 'is-active' : ''}" data-ob-min="${m}">${m} min</button>
            `).join('')}
          </div>
        </div>
        <label class="toggle-row">
          <div>
            <span class="text-sm font-semibold block">Vuelvo de un descanso</span>
            <span class="text-2xs text-muted">4 semanas: menos series, RIR alto y sin subir kilos. Se activa solo si eres principiante o marcas esto.</span>
          </div>
          <input type="checkbox" class="toggle-check" id="ob-return" ${draft.returningFromBreak ? 'checked' : ''} />
        </label>
        <p class="text-xs text-muted">Hipertrofia y fuerza usan la misma estructura; la fuerza solo acorta el rango de repeticiones.</p>
        <div class="stack-2">
          ${ROUTINE_TEMPLATES.map((tpl) => `
            <button type="button" class="tpl-card ${draft.templateId === tpl.id ? 'is-active' : ''}" data-ob-tpl="${tpl.id}">
              <div class="row-between gap-2">
                <strong class="text-sm text-strong">${escapeHtml(tpl.name)}</strong>
                <span class="chip ${tpl.id === suggested ? 'chip--accent' : 'chip--subtle'}">${tpl.id === suggested ? 'Sugerida' : escapeHtml(tpl.badge)}</span>
              </div>
              <p class="text-xs text-muted mt-1 text-left">${escapeHtml(tpl.summary)}</p>
              ${tpl.requiresPullupBar && !draft.hasPullupBar ? '<p class="text-2xs text-amber mt-1 text-left">Sin barra se cambian dominadas por remo o pullover al aplicarla.</p>' : ''}
            </button>
          `).join('')}
        </div>
        ${draft.isReconfigure ? `
          <label class="toggle-row">
            <div>
              <span class="text-sm font-semibold block">Reemplazar mi rutina actual</span>
              <span class="text-2xs text-muted">Si lo dejas apagado, solo se guarda equipo, espacio y perfil.</span>
            </div>
            <input type="checkbox" class="toggle-check" id="ob-replace" ${draft.replaceRoutine ? 'checked' : ''} />
          </label>
        ` : ''}
      </div>
    `;
  }

  const titles = {
    1: 'Personaliza tu AlphaHome',
    2: 'Tu equipo en casa',
    3: 'Tu espacio',
    4: 'Meta y rutina inicial'
  };

  return `
    <div class="modal-header">
      <div>
        <span class="chip chip--accent">Paso ${step} de 4</span>
        <h3 class="modal-title mt-1">${titles[step]}</h3>
      </div>
      ${draft.isReconfigure ? '<button type="button" class="btn btn--ghost btn--xs" id="ob-close">Cerrar</button>' : ''}
    </div>
    <div class="step-dots mt-3 mb-4">
      ${[1, 2, 3, 4].map((n) => `<span class="step-dot ${step >= n ? 'is-active' : ''}"></span>`).join('')}
    </div>
    ${bodyHtml}
    <div class="row-between gap-2 mt-5">
      ${step > 1 ? '<button type="button" class="btn btn--surface" id="ob-prev">← Atrás</button>' : '<span></span>'}
      ${step < 4
        ? '<button type="button" class="btn btn--primary flex-1" id="ob-next">Continuar →</button>'
        : '<button type="button" class="btn btn--emerald flex-1" id="ob-finish">Guardar y entrenar</button>'}
    </div>
  `;
}

function numOrBlank(el) {
  if (!el) return '';
  return el.value.trim();
}

function captureCurrentStep() {
  if (draft.step === 1) {
    const nameEl = document.getElementById('ob-name');
    const hEl = document.getElementById('ob-height');
    const wEl = document.getElementById('ob-weight');
    if (nameEl) draft.name = nameEl.value.trim().slice(0, 32);
    if (hEl) {
      const hv = parseFloat(hEl.value);
      if (Number.isFinite(hv) && hv >= 1.2 && hv <= 2.3) draft.heightMeters = Math.round(hv * 100) / 100;
    }
    if (wEl) draft.initialWeight = wEl.value.trim();
  } else if (draft.step === 2) {
    const maxEl = document.getElementById('ob-maxdb');
    const bandsEl = document.getElementById('ob-bands');
    const vestEl = document.getElementById('ob-vestkg');
    if (maxEl) draft.maxDumbbellKg = Math.max(2, Math.min(80, Number(maxEl.value) || 12));
    if (bandsEl) draft.bandCount = Math.max(0, Math.min(12, Math.round(Number(bandsEl.value) || 0)));
    if (vestEl) draft.vestKg = Math.max(1, Math.min(40, Number(vestEl.value) || 10));
    if (!draft.hasBench) draft.hasDeclineBench = false;
  } else if (draft.step === 3) {
    draft.roomWidthM = numOrBlank(document.getElementById('ob-room-w'));
    draft.roomLengthM = numOrBlank(document.getElementById('ob-room-l'));
    draft.hallwayLengthM = numOrBlank(document.getElementById('ob-hall-l'));
    draft.hallwayWidthM = numOrBlank(document.getElementById('ob-hall-w'));
  } else if (draft.step === 4) {
    const ret = document.getElementById('ob-return');
    const rep = document.getElementById('ob-replace');
    if (ret) draft.returningFromBreak = ret.checked;
    if (rep) draft.replaceRoutine = rep.checked;
  }
}

export function openOnboardingWizard(onDone, { isReconfigure = false } = {}) {
  initDraft(isReconfigure);

  const mount = () => {
    openModal(renderStepHtml(), { lockDismiss: !isReconfigure });
    const root = document.getElementById('modal-content');
    if (!root) return;

    root.querySelector('#ob-close')?.addEventListener('click', () => closeModal(true));

    root.querySelectorAll('[data-ob-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.theme = btn.dataset.obTheme;
        applyTheme(draft.theme);
        mount();
      });
    });

    root.querySelectorAll('[data-ob-maxdb]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.maxDumbbellKg = Number(btn.dataset.obMaxdb);
        mount();
      });
    });

    root.querySelectorAll('[data-ob-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.dumbbellStepKg = Number(btn.dataset.obStep);
        mount();
      });
    });

    root.querySelectorAll('[data-ob-eq]').forEach((chk) => {
      chk.addEventListener('change', () => {
        captureCurrentStep();
        draft[chk.dataset.obEq] = chk.checked;
        if (chk.dataset.obEq === 'hasBench' && !chk.checked) draft.hasDeclineBench = false;
        if (chk.dataset.obEq === 'hasDeclineBench' && chk.checked) draft.hasBench = true;
        mount();
      });
    });

    root.querySelectorAll('[data-ob-space]').forEach((chk) => {
      chk.addEventListener('change', () => {
        captureCurrentStep();
        draft[chk.dataset.obSpace] = chk.checked;
        mount();
      });
    });

    root.querySelectorAll('[data-ob-goal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.goal = btn.dataset.obGoal;
        syncSuggestion();
        mount();
      });
    });

    root.querySelector('#ob-return')?.addEventListener('change', () => {
      draft.returningFromBreak = document.getElementById('ob-return').checked;
      draft.returnTouched = true;
    });

    root.querySelectorAll('[data-ob-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.level = btn.dataset.obLevel;
        if (!draft.returnTouched) draft.returningFromBreak = draft.level === 'beginner';
        mount();
      });
    });

    root.querySelectorAll('[data-ob-days]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.daysPerWeek = Number(btn.dataset.obDays);
        syncSuggestion();
        mount();
      });
    });

    root.querySelectorAll('[data-ob-min]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.sessionGoalMin = Number(btn.dataset.obMin);
        mount();
      });
    });

    root.querySelectorAll('[data-ob-tpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
        draft.templateManual = true;
        draft.templateId = btn.dataset.obTpl;
        mount();
      });
    });

    root.querySelector('#ob-prev')?.addEventListener('click', () => {
      captureCurrentStep();
      draft.step = Math.max(1, draft.step - 1);
      mount();
    });

    root.querySelector('#ob-next')?.addEventListener('click', () => {
      captureCurrentStep();
      draft.step = Math.min(4, draft.step + 1);
      mount();
    });

    root.querySelector('#ob-finish')?.addEventListener('click', () => {
      captureCurrentStep();
      const returning = Boolean(draft.returningFromBreak);
      state.profile = {
        name: draft.name,
        theme: draft.theme,
        onboardingCompleted: true,
        goal: draft.goal,
        level: draft.level,
        daysPerWeek: draft.daysPerWeek === 3 ? 3 : 4
      };
      state.equipment = draftEquipment();
      state.space = draftSpace();
      state.settings.sessionGoalMin = draft.sessionGoalMin || 60;
      state.settings.returningFromBreak = returning;
      state.settings.readaptationMode = returning;
      state.settings.returnBlockStartedAt = returning ? Date.now() : state.settings.returnBlockStartedAt;
      state.bodyMetrics.heightMeters = draft.heightMeters;

      const initW = parseFloat(draft.initialWeight);
      if (Number.isFinite(initW) && initW >= 30 && initW <= 250) {
        const sameDay = (state.bodyMetrics.logs || []).some((l) => l.date === getTodayDateString() && l.note === 'Peso inicial');
        if (!sameDay) {
          state.bodyMetrics.logs.push({
            id: 'bw_' + Date.now(),
            date: getTodayDateString(),
            weight: Math.round(initW * 10) / 10,
            note: 'Peso inicial'
          });
        }
      }

      applyTheme(draft.theme);
      if (draft.replaceRoutine) applyRoutineTemplate(draft.templateId);
      else saveState();
      closeModal(true);
      showToast(draft.name ? `Listo, ${draft.name}.` : 'Perfil guardado.', 'success');
      onDone();
    });
  };

  mount();
}
