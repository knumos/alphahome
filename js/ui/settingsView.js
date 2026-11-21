/**
 * AlphaHome — Vista de Ajustes, Perfil Personalizable, Equipo en Casa y PWA
 */

import {
  THEMES, escapeHtml, isWakeLockPreferred, wakeLockSupported
} from '../utils.js';

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
  const prof = state.profile || { name: '', theme: 'cyan' };
  const themeList = Object.values(THEMES);

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
            <input id="set-profile-name" type="text" maxlength="32" value="${escapeHtml(prof.name || '')}" placeholder="Ej. Sofía, Alex..." class="input" />
          </div>
          <div>
            <label class="field-label" for="set-height">Estatura (m)</label>
            <input id="set-height" type="number" step="0.01" min="1.20" max="2.30" value="${heightM}" class="input tabular-nums" />
          </div>
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
            <select id="set-stepdb" class="input">
              ${[0.5, 1, 2].map((v) => `<option value="${v}" ${Number(eq.dumbbellStepKg) === v ? 'selected' : ''}>+${v} kg</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="stack-2">
          ${[
            { key: 'hasBench', label: 'Banco inclinable / plano' },
            { key: 'hasBands', label: 'Bandas de resistencia' },
            { key: 'hasPullupBar', label: 'Barra de dominadas' },
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

        <button type="button" class="btn btn--accent-soft btn--xs align-self-end" data-action="save-equipment">Guardar equipo</button>
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
        <h3 class="section-eyebrow">Algoritmo de Progresión</h3>
        <div class="row-between gap-3">
          <div>
            <p class="text-sm font-bold text-strong">Modo Readaptación (Semanas 1-2)</p>
            <p class="text-xs text-muted mt-0.5">Establece RIR 2-3 y cargas conservadoras. Desactívalo para doble progresión.</p>
          </div>
          <button type="button" class="switch switch--amber ${state.settings.readaptationMode ? 'is-on' : ''}" data-action="toggle-readapt" aria-pressed="${state.settings.readaptationMode ? 'true' : 'false'}" aria-label="Modo Readaptación">
            <span class="switch__thumb"></span>
          </button>
        </div>
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
          <button type="button" class="btn btn--surface btn--sm text-emerald" data-action="export-backup">⬇ Exportar JSON</button>
          <label class="btn btn--surface btn--sm text-accent cursor-pointer text-center">
            ⬆ Importar JSON
            <input id="import-backup-input" type="file" accept=".json,application/json" class="hidden" />
          </label>
        </div>
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
