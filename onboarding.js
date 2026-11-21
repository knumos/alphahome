/**
 * AlphaHome — Onboarding Personalizable en 3 Pasos (por dispositivo)
 * Permite que cualquier persona (tú o tu novia en su teléfono) configure su nombre,
 * tema de color, medidas, equipo en casa y plantilla inicial en ~30 segundos.
 */

import { ROUTINE_TEMPLATES } from '../data/templates.js';
import { state, saveState, applyRoutineTemplate } from '../state.js';
import { THEMES, applyTheme, escapeHtml, getTodayDateString, openModal, closeModal, showToast } from '../utils.js';

let draft = null;

function initDraft() {
  draft = {
    step: 1,
    name: state.profile?.name || '',
    theme: state.profile?.theme || 'cyan',
    heightMeters: state.bodyMetrics?.heightMeters || 1.68,
    initialWeight: '',
    maxDumbbellKg: state.equipment?.maxDumbbellKg || 16,
    dumbbellStepKg: state.equipment?.dumbbellStepKg || 1,
    hasBench: state.equipment?.hasBench ?? true,
    hasBands: state.equipment?.hasBands ?? true,
    hasPullupBar: state.equipment?.hasPullupBar ?? false,
    hasVest: state.equipment?.hasVest ?? false,
    vestKg: state.equipment?.vestKg || 10,
    readaptationMode: state.settings?.readaptationMode ?? true,
    templateId: 'glute_lower_4d'
  };
}

function renderStepHtml() {
  const step = draft.step;
  const themeList = Object.values(THEMES);

  let bodyHtml = '';
  if (step === 1) {
    bodyHtml = `
      <div class="stack-3">
        <div>
          <label class="field-label" for="ob-name">¿Cómo te llamas? (opcional)</label>
          <input id="ob-name" type="text" maxlength="32" value="${escapeHtml(draft.name)}" placeholder="Ej. Sofía, Alex..." class="input" />
        </div>

        <div class="grid-2 gap-3">
          <div>
            <label class="field-label" for="ob-height">Estatura (m)</label>
            <input id="ob-height" type="number" step="0.01" min="1.20" max="2.30" value="${Number(draft.heightMeters).toFixed(2)}" class="input tabular-nums" />
          </div>
          <div>
            <label class="field-label" for="ob-weight">Peso inicial kg (opcional)</label>
            <input id="ob-weight" type="number" step="0.1" min="30" max="250" value="${escapeHtml(draft.initialWeight)}" placeholder="Ej. 62.5" class="input tabular-nums" />
          </div>
        </div>

        <div>
          <span class="field-label">Elige tu color de acento</span>
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
        <p class="text-xs text-muted">El algoritmo de progresión y las rutinas sugeridas se adaptarán a tu equipo real.</p>

        <div>
          <label class="field-label" for="ob-maxdb">Peso máx. por mancuerna (kg)</label>
          <div class="chip-row mb-2">
            ${[8, 10, 12, 16, 20, 24].map((kg) => `
              <button type="button" class="pill-choice ${Number(draft.maxDumbbellKg) === kg ? 'is-active' : ''}" data-ob-maxdb="${kg}">${kg} kg</button>
            `).join('')}
          </div>
          <input id="ob-maxdb" type="number" min="2" max="80" step="1" value="${draft.maxDumbbellKg}" class="input tabular-nums" />
        </div>

        <div>
          <span class="field-label">Salto mínimo entre cargas de mancuerna</span>
          <div class="grid-3 gap-2 mt-1">
            ${[0.5, 1, 2].map((st) => `
              <button type="button" class="pill-choice ${Number(draft.dumbbellStepKg) === st ? 'is-active' : ''}" data-ob-step="${st}">+${st} kg</button>
            `).join('')}
          </div>
        </div>

        <div class="stack-2 pt-1">
          ${[
            { key: 'hasBench', label: 'Banco inclinable / plano' },
            { key: 'hasBands', label: 'Bandas de resistencia' },
            { key: 'hasPullupBar', label: 'Barra de dominadas' },
            { key: 'hasVest', label: 'Chaleco lastrado' }
          ].map((item) => `
            <label class="toggle-row">
              <span class="text-sm font-semibold">${item.label}</span>
              <input type="checkbox" class="toggle-check" data-ob-eq="${item.key}" ${draft[item.key] ? 'checked' : ''} />
            </label>
          `).join('')}
        </div>

        ${draft.hasVest ? `
          <div>
            <label class="field-label" for="ob-vestkg">Peso del chaleco (kg)</label>
            <input id="ob-vestkg" type="number" min="1" max="40" step="1" value="${draft.vestKg}" class="input tabular-nums" />
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // Sugerir plantilla acorde a si tiene barra o no
    if (!draft.hasPullupBar && draft.templateId === 'alphahome_4d') {
      draft.templateId = 'glute_lower_4d';
    }
    bodyHtml = `
      <div class="stack-3">
        <p class="text-xs text-muted">Elige una rutina base. Después podrás editar días, ejercicios, series y repeticiones libremente.</p>
        <div class="stack-2">
          ${ROUTINE_TEMPLATES.map((tpl) => `
            <button type="button" class="tpl-card ${draft.templateId === tpl.id ? 'is-active' : ''}" data-ob-tpl="${tpl.id}">
              <div class="row-between gap-2">
                <strong class="text-sm text-strong">${escapeHtml(tpl.name)}</strong>
                <span class="chip chip--subtle">${escapeHtml(tpl.badge)}</span>
              </div>
              <p class="text-xs text-muted mt-1 text-left">${escapeHtml(tpl.summary)}</p>
              ${tpl.requiresPullupBar && !draft.hasPullupBar ? '<p class="text-2xs text-amber mt-1 text-left">Requiere barra de dominadas</p>' : ''}
            </button>
          `).join('')}
        </div>

        <label class="toggle-row">
          <div>
            <span class="text-sm font-semibold block">Comenzar en Modo Readaptación</span>
            <span class="text-2xs text-muted">RIR 2-3 las primeras 2 semanas para arrancar sin agujetas extremas</span>
          </div>
          <input type="checkbox" class="toggle-check" id="ob-readapt" ${draft.readaptationMode ? 'checked' : ''} />
        </label>
      </div>
    `;
  }

  return `
    <div class="modal-header">
      <div>
        <span class="chip chip--accent">Paso ${step} de 3</span>
        <h3 class="modal-title mt-1">
          ${step === 1 ? 'Personaliza tu AlphaHome' : step === 2 ? 'Tu equipo en casa' : 'Elige tu rutina inicial'}
        </h3>
      </div>
      <button type="button" class="btn btn--ghost btn--xs" id="ob-skip">Omitir</button>
    </div>

    <div class="step-dots mt-3 mb-4">
      <span class="step-dot ${step >= 1 ? 'is-active' : ''}"></span>
      <span class="step-dot ${step >= 2 ? 'is-active' : ''}"></span>
      <span class="step-dot ${step >= 3 ? 'is-active' : ''}"></span>
    </div>

    ${bodyHtml}

    <div class="row-between gap-2 mt-5">
      ${step > 1
        ? '<button type="button" class="btn btn--surface" id="ob-prev">← Atrás</button>'
        : '<span></span>'}
      ${step < 3
        ? '<button type="button" class="btn btn--primary flex-1" id="ob-next">Continuar →</button>'
        : '<button type="button" class="btn btn--emerald flex-1" id="ob-finish">¡Listo para entrenar!</button>'}
    </div>
  `;
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
    const vestEl = document.getElementById('ob-vestkg');
    if (maxEl) draft.maxDumbbellKg = Math.max(2, Math.min(80, Number(maxEl.value) || 16));
    if (vestEl) draft.vestKg = Math.max(1, Math.min(40, Number(vestEl.value) || 10));
  } else if (draft.step === 3) {
    const rEl = document.getElementById('ob-readapt');
    if (rEl) draft.readaptationMode = rEl.checked;
  }
}

export function openOnboardingWizard(onDone, { isReconfigure = false } = {}) {
  initDraft();
  if (!isReconfigure && state.equipment?.hasPullupBar) {
    draft.templateId = 'alphahome_4d';
  }

  const mount = () => {
    openModal(renderStepHtml(), { lockDismiss: !isReconfigure });
    const root = document.getElementById('modal-content');
    if (!root) return;

    root.querySelector('#ob-skip')?.addEventListener('click', () => {
      state.profile.onboardingCompleted = true;
      saveState();
      closeModal(true);
      onDone();
    });

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
        draft.maxDumbbellKg = Number(btn.dataset.obMaxdb);
        mount();
      });
    });

    root.querySelectorAll('[data-ob-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.dumbbellStepKg = Number(btn.dataset.obStep);
        mount();
      });
    });

    root.querySelectorAll('[data-ob-eq]').forEach((chk) => {
      chk.addEventListener('change', () => {
        captureCurrentStep();
        draft[chk.dataset.obEq] = chk.checked;
        mount();
      });
    });

    root.querySelectorAll('[data-ob-tpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        captureCurrentStep();
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
      draft.step = Math.min(3, draft.step + 1);
      mount();
    });

    root.querySelector('#ob-finish')?.addEventListener('click', () => {
      captureCurrentStep();
      state.profile = {
        name: draft.name,
        theme: draft.theme,
        onboardingCompleted: true
      };
      state.equipment = {
        maxDumbbellKg: draft.maxDumbbellKg,
        dumbbellStepKg: draft.dumbbellStepKg,
        hasBench: draft.hasBench,
        hasBands: draft.hasBands,
        hasPullupBar: draft.hasPullupBar,
        hasVest: draft.hasVest,
        vestKg: draft.vestKg
      };
      state.settings.readaptationMode = draft.readaptationMode;
      state.bodyMetrics.heightMeters = draft.heightMeters;

      const initW = parseFloat(draft.initialWeight);
      if (Number.isFinite(initW) && initW >= 30 && initW <= 250) {
        state.bodyMetrics.logs.push({
          id: 'bw_' + Date.now(),
          date: getTodayDateString(),
          weight: Math.round(initW * 10) / 10,
          note: 'Peso inicial'
        });
      }

      applyTheme(draft.theme);
      applyRoutineTemplate(draft.templateId);
      saveState();
      closeModal(true);
      showToast(draft.name ? `¡Bienvenido/a, ${draft.name}!` : '¡Perfil configurado!', 'success');
      onDone();
    });
  };

  mount();
}
