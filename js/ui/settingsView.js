/**
 * AlphaHome — Vista de Ajustes, Perfil Personalizable, Equipo en Casa y PWA
 */

import {
  THEMES, escapeHtml, isWakeLockPreferred, wakeLockSupported
} from '../utils.js';
import { planRoutineAdaptation } from '../engine/adapt.js';
import { getReturnBlock, describeReturnBlock } from '../engine/progression.js';

const GOAL_LABELS = {
  hypertrophy: 'Hipertrofia',
  strength: 'Fuerza',
  glute: 'Glúteo',
  general: 'General'
};
const LEVEL_LABELS = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado'
};

function isRunningStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function isIosDevice() {
  try {
    const ua = window.navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOS || iPadOS;
  } catch {
    return false;
  }
}

export function renderSettingsView(state, deferredInstallPrompt) {
  const notifSupported = 'Notification' in window;
  const notifPerm = notifSupported ? Notification.permission : 'unsupported';
  const heightM = (state.bodyMetrics?.heightMeters || 1.70).toFixed(2);
  const eq = state.equipment || {};
  const space = state.space || {};
  const prof = state.profile || { name: '', theme: 'cyan', goal: 'general', level: 'intermediate', daysPerWeek: 4 };
  const themeList = Object.values(THEMES);
  const adaptPlan = planRoutineAdaptation(state.routines, eq, space);
  const returnBlock = getReturnBlock(state);
  const returnCopy = describeReturnBlock(returnBlock);

  const installed = isRunningStandalone();
  let installAction = '';
  if (installed) {
    installAction = '<p class="text-xs text-emerald font-semibold">AlphaHome ya está instalada en este dispositivo.</p>';
  } else if (deferredInstallPrompt) {
    installAction = `<button type="button" data-action="pwa-install" class="btn btn--primary btn--block btn--sm">Instalar app en tu teléfono</button>`;
  } else if (isIosDevice()) {
    installAction = '<p class="text-xs text-soft">En iPhone: <strong>Compartir &gt; Agregar a inicio</strong>.</p>';
  } else {
    installAction = '<p class="text-xs text-muted">En Chrome: menú <strong>⋮ → Agregar a pantalla principal</strong>.</p>';
  }

  return `
    <div class="stack-4">
      <div class="row-between">
        <h2 class="text-lg font-extrabold text-strong">Ajustes y Perfil</h2>
        <button type="button" class="btn btn--surface btn--xs text-accent" data-action="reopen-onboarding">✨ Asistente inicial</button>
      </div>

      <!-- Perfil y Tema de Color -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">Perfil y Apariencia</h3>

        <div class="grid-2 gap-3">
          <div>
            <label class="field-label" for="set-profile-name">Tu nombre</label>
            <input id="set-profile-name" type="text" maxlength="32" value="${escapeHtml(prof.name || '')}" placeholder="Tu nombre" class="input" />
          </div>
          <div>
            <label class="field-label" for="set-height">Estatura (m)</label>
            <input id="set-height" type="number" step="0.01" min="1.20" max="2.30" value="${heightM}" class="input tabular-nums" />
          </div>
        </div>

        <div>
          <span class="field-label">Objetivo</span>
          <div class="chip-row mt-1">
            ${Object.entries(GOAL_LABELS).map(([id, label]) => `
              <button type="button" class="pill-choice ${prof.goal === id ? 'is-active' : ''}" data-action="set-goal" data-goal="${id}">${label}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <span class="field-label">Nivel</span>
          <div class="chip-row mt-1">
            ${Object.entries(LEVEL_LABELS).map(([id, label]) => `
              <button type="button" class="pill-choice ${prof.level === id ? 'is-active' : ''}" data-action="set-level" data-level="${id}">${label}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <span class="field-label">Días por semana</span>
          <div class="grid-2 gap-2 mt-1">
            ${[3, 4].map((d) => `
              <button type="button" class="pill-choice ${Number(prof.daysPerWeek) === d ? 'is-active' : ''}" data-action="set-days" data-days="${d}">${d} días</button>
            `).join('')}
          </div>
        </div>
        <div>
          <label class="field-label" for="set-session-min">Duración objetivo (min)</label>
          <input id="set-session-min" type="number" min="20" max="180" step="5" value="${state.settings?.sessionGoalMin || 60}" class="input tabular-nums" />
        </div>

        <button type="button" class="btn btn--accent-soft btn--xs align-self-end" data-action="save-profile">Guardar perfil</button>

        <div class="divider"></div>
        <div>
          <span class="field-label">Color de acento</span>
          <div class="theme-picker mt-2">
            ${themeList.map((t) => `
              <button type="button" class="theme-swatch ${prof.theme === t.id ? 'is-active' : ''}" data-action="set-theme" data-theme-id="${t.id}">
                <span class="theme-dot" style="background:${t.swatch}"></span>
                <span class="text-2xs font-bold">${t.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Equipo en Casa -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">Mi Equipo en Casa</h3>
        <p class="text-xs text-muted">Ajusta los límites de tu equipo para que las sugerencias de carga sean realistas para ti.</p>

        <div class="grid-2 gap-3">
          <div>
            <label class="field-label" for="set-maxdb">Tope mancuerna (kg)</label>
            <input id="set-maxdb" type="number" min="2" max="80" step="1" value="${eq.maxDumbbellKg ?? 24}" class="input tabular-nums" />
          </div>
          <div>
            <label class="field-label" for="set-stepdb">Incremento mín. (kg)</label>
            <input id="set-stepdb" type="number" min="0.5" max="5" step="0.5" value="${eq.dumbbellStepKg ?? 1}" class="input tabular-nums" />
          </div>
        </div>
        <p class="text-2xs text-muted">El salto sirve para las sugerencias. En la sesión puedes anotar 8, 13.5 o 18.1 kg.</p>

        <div>
          <label class="field-label" for="set-bands">Número de bandas</label>
          <input id="set-bands" type="number" min="0" max="12" step="1" value="${eq.bandCount ?? (eq.hasBands ? 1 : 0)}" class="input tabular-nums" />
        </div>

        <div class="stack-2">
          ${[
            { key: 'hasBench', label: 'Banco (plano / inclinado)' },
            { key: 'hasDeclineBench', label: 'Banco declinado' },
            { key: 'hasPullupBar', label: 'Barra de dominadas' },
            { key: 'hasWeightBelt', label: 'Cinturón para colgar mancuerna' },
            { key: 'hasVest', label: 'Chaleco lastrado' }
          ].map((item) => `
            <div class="row-between gap-3 py-1">
              <span class="text-sm font-semibold text-strong">${item.label}</span>
              <button type="button" class="switch ${eq[item.key] ? 'is-on' : ''}" data-action="toggle-equipment" data-eq-key="${item.key}" aria-pressed="${eq[item.key] ? 'true' : 'false'}" aria-label="${item.label}">
                <span class="switch__thumb"></span>
              </button>
            </div>
          `).join('')}
        </div>

        ${eq.hasVest ? `
          <div class="row-between gap-3 pt-1">
            <label class="text-sm font-semibold text-strong" for="set-vestkg">Peso del chaleco (kg)</label>
            <input id="set-vestkg" type="number" min="1" max="40" step="1" value="${eq.vestKg ?? 10}" class="input input--sm tabular-nums text-center" />
          </div>
        ` : ''}

        <div class="divider"></div>
        <h3 class="section-eyebrow">Espacio</h3>
        <label class="toggle-row">
          <span class="text-sm font-semibold">Tengo un cuarto</span>
          <button type="button" class="switch ${space.hasRoom !== false ? 'is-on' : ''}" data-action="toggle-space" data-space-key="hasRoom" aria-pressed="${space.hasRoom !== false ? 'true' : 'false'}">
            <span class="switch__thumb"></span>
          </button>
        </label>
        <div class="grid-2 gap-3">
          <div>
            <label class="field-label" for="set-room-w">Ancho (m)</label>
            <input id="set-room-w" type="number" min="0" max="30" step="0.1" value="${space.roomWidthM || ''}" placeholder="0" class="input tabular-nums" />
          </div>
          <div>
            <label class="field-label" for="set-room-l">Largo (m)</label>
            <input id="set-room-l" type="number" min="0" max="30" step="0.1" value="${space.roomLengthM || ''}" placeholder="0" class="input tabular-nums" />
          </div>
        </div>
        <label class="toggle-row">
          <span class="text-sm font-semibold">Tengo pasillo</span>
          <button type="button" class="switch ${space.hasHallway ? 'is-on' : ''}" data-action="toggle-space" data-space-key="hasHallway" aria-pressed="${space.hasHallway ? 'true' : 'false'}">
            <span class="switch__thumb"></span>
          </button>
        </label>
        ${space.hasHallway ? `
          <div class="grid-2 gap-3">
            <div>
              <label class="field-label" for="set-hall-l">Largo pasillo (m)</label>
              <input id="set-hall-l" type="number" min="0" max="30" step="0.1" value="${space.hallwayLengthM || ''}" class="input tabular-nums" />
            </div>
            <div>
              <label class="field-label" for="set-hall-w">Ancho pasillo (m)</label>
              <input id="set-hall-w" type="number" min="0" max="30" step="0.1" value="${space.hallwayWidthM || ''}" class="input tabular-nums" />
            </div>
          </div>
        ` : ''}
        <p class="text-2xs text-muted">Sin pasillo no se sugieren zancadas caminando, paseo del granjero ni gateo del oso.</p>

        ${adaptPlan.changes.length ? `
          <div class="warn-box">
            <p class="text-xs font-bold">Hay ${adaptPlan.changes.length} ejercicio${adaptPlan.changes.length === 1 ? '' : 's'} que no caben en este equipo o espacio.</p>
            <p class="text-2xs mt-1">La rutina no se cambia sola. Revísala y confírmala si quieres adaptarla.</p>
            <button type="button" class="btn btn--primary btn--xs mt-2" data-action="review-routine-fit">Revisar adaptación</button>
          </div>
        ` : ''}

        <button type="button" class="btn btn--accent-soft btn--xs align-self-end" data-action="save-equipment">Guardar equipo y espacio</button>
      </section>

      <!-- Rutinas y Plantillas -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">Rutinas y Plantillas</h3>
        <p class="text-xs text-muted">Edita tus días, añade ejercicios del catálogo 3D o comparte tu rutina con otra persona sin mezclar historiales.</p>
        <div class="grid-2 gap-2">
          <button type="button" class="btn btn--primary btn--sm" data-action="open-routine-manager">✎ Editar días y ejercicios</button>
          <button type="button" class="btn btn--surface btn--sm" data-action="open-template-picker">📋 Cambiar plantilla</button>
        </div>
      </section>

      <!-- Algoritmo de Progresión -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">Vuelta al entrenamiento</h3>
        ${returnCopy ? `
          <div class="mode-banner mode-banner--amber">
            <div>
              <p class="text-sm font-extrabold text-amber">${returnCopy.title}</p>
              <p class="text-xs text-soft mt-1">${returnCopy.detail}</p>
            </div>
          </div>
        ` : `
          <p class="text-xs text-muted">Si vuelves de un parón: semanas 1-2 con 2 series y RIR 3-4, semana 3 con la 3.ª serie de básicos y RIR 2-3, y desde la semana 4 el plan completo. No sube kilos durante el bloque.</p>
        `}
        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">${state.settings.returningFromBreak ? 'Bloque activo' : 'Empezar bloque de 4 semanas'}</p>
            <p class="text-xs text-muted mt-0.5">Se cuenta con el calendario y con las sesiones que hagas desde hoy.</p>
          </div>
          <button type="button" class="switch switch--amber ${state.settings.returningFromBreak ? 'is-on' : ''}" data-action="toggle-return-block" aria-pressed="${state.settings.returningFromBreak ? 'true' : 'false'}" aria-label="Vuelta al entrenamiento">
            <span class="switch__thumb"></span>
          </button>
        </div>
        ${state.settings.returningFromBreak ? '' : `
          <div class="row-between gap-3">
            <div>
              <p class="text-sm font-bold text-strong">Readaptación suave</p>
              <p class="text-xs text-muted mt-0.5">RIR 2-3 sin recortar series. Independiente del bloque de vuelta.</p>
            </div>
            <button type="button" class="switch ${state.settings.readaptationMode ? 'is-on' : ''}" data-action="toggle-readapt" aria-pressed="${state.settings.readaptationMode ? 'true' : 'false'}" aria-label="Modo Readaptación">
              <span class="switch__thumb"></span>
            </button>
          </div>
        `}
      </section>

      <!-- Temporizadores y Alertas -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">Tiempos y Alertas</h3>

        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">Auto-iniciar descanso</p>
            <p class="text-xs text-muted">Empieza la cuenta regresiva al completar cada serie.</p>
          </div>
          <button type="button" class="switch ${state.settings.autoRest ? 'is-on' : ''}" data-action="toggle-setting" data-key="autoRest" aria-pressed="${state.settings.autoRest}">
            <span class="switch__thumb"></span>
          </button>
        </div>

        <div class="divider"></div>
        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">Sonido al terminar descanso</p>
            <p class="text-xs text-muted">Beep doble sintetizado (funciona offline).</p>
          </div>
          <div class="row gap-2 shrink-0">
            <button type="button" class="btn btn--surface btn--xs text-accent" data-action="test-beep">Probar</button>
            <button type="button" class="switch ${state.settings.soundEnabled ? 'is-on' : ''}" data-action="toggle-setting" data-key="soundEnabled" aria-pressed="${state.settings.soundEnabled}">
              <span class="switch__thumb"></span>
            </button>
          </div>
        </div>

        <div class="divider"></div>
        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">Vibración en móvil</p>
            <p class="text-xs text-muted">Vibra cuando el descanso llega a 00:00.</p>
          </div>
          <button type="button" class="switch ${state.settings.vibrationEnabled ? 'is-on' : ''}" data-action="toggle-setting" data-key="vibrationEnabled" aria-pressed="${state.settings.vibrationEnabled}">
            <span class="switch__thumb"></span>
          </button>
        </div>

        <div class="divider"></div>
        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">Pantalla siempre encendida</p>
            <p class="text-xs text-muted">Mantiene la pantalla activa mientras entrenas.</p>
            ${wakeLockSupported() ? '' : '<p class="text-2xs text-amber mt-1">Este navegador no soporta Wake Lock.</p>'}
          </div>
          <button type="button" class="switch ${isWakeLockPreferred() ? 'is-on' : ''}" data-action="toggle-wakelock" aria-pressed="${isWakeLockPreferred()}">
            <span class="switch__thumb"></span>
          </button>
        </div>

        <div class="divider"></div>
        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">Notificaciones del sistema</p>
            <p class="text-xs text-muted">
              Permiso: <strong class="${notifPerm === 'granted' ? 'text-emerald' : 'text-amber'}">
                ${notifPerm === 'granted' ? 'Permitidas' : notifPerm === 'denied' ? 'Bloqueadas' : notifPerm === 'unsupported' ? 'No soportado' : 'Sin solicitar'}
              </strong>
            </p>
          </div>
          <div class="row gap-2 shrink-0">
            ${notifPerm === 'granted' ? `
              <button type="button" class="btn btn--surface btn--xs text-accent" data-action="request-notif">Probar</button>
              <button type="button" class="switch ${state.settings.notificationsEnabled ? 'is-on' : ''}" data-action="toggle-setting" data-key="notificationsEnabled" aria-pressed="${state.settings.notificationsEnabled}">
                <span class="switch__thumb"></span>
              </button>
            ` : `
              <button type="button" class="btn btn--primary btn--xs" data-action="request-notif">Activar</button>
            `}
          </div>
        </div>
      </section>

      <!-- Respaldo Completo -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">Almacenamiento Local y Respaldo</h3>
        <p class="text-xs text-muted">Tus datos viven 100% en tu teléfono. Exporta un respaldo JSON completo cuando quieras.</p>
        <div class="grid-2 gap-2.5">
          <button type="button" class="btn btn--surface btn--sm text-emerald" data-action="export-backup">⬇ Respaldo completo</button>
          <label class="btn btn--surface btn--sm text-accent cursor-pointer text-center">
            ⬆ Importar JSON
            <input id="import-backup-input" type="file" accept=".json,application/json" class="hidden" />
          </label>
        </div>
        <div class="grid-2 gap-2.5">
          <button type="button" class="btn btn--surface btn--sm" data-action="export-routines">Compartir rutina</button>
          <button type="button" class="btn btn--surface btn--sm" data-action="export-setup">Rutina + configuración</button>
        </div>
        <p class="text-2xs text-muted">Compartir rutina o configuración no incluye tu historial. Quien importe elige si se queda solo con la rutina o también con equipo, espacio, objetivo, nivel y días.</p>
        <button type="button" class="btn btn--danger-soft btn--block btn--sm" data-action="open-reset-modal">
          Reiniciar todos los datos de fábrica
        </button>
      </section>

      <!-- Tarjeta de Instalación PWA -->
      <section class="card card--lg stack-3">
        <h3 class="section-eyebrow">App en tu Teléfono</h3>
        <div class="row gap-3">
          <div class="brand-badge brand-badge--lg shrink-0">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-strong">Instálala y úsala sin conexión</p>
            <p class="text-xs text-muted mt-0.5">Funciona a pantalla completa y 100% offline con tus animaciones 3D incluidas.</p>
          </div>
        </div>
        ${installAction}
      </section>
    </div>
  `;
}
