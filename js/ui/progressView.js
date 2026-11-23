/**
 * AlphaHome — Vista de Progreso, Gráfica SVG con Decimación e Historial
 */

import {
  calculateWeeklySessions, computeSetVolumeKg, getCurrentBodyWeight, getVestWeightKg
} from '../engine/progression.js';
import { escapeHtml, escapeAttr, formatDateShort, formatTime, getThemeInfo } from '../utils.js';

function buildExerciseChartSVG(exerciseName, metric, state) {
  const theme = getThemeInfo(state.profile?.theme);
  const vestKg = getVestWeightKg(state);
  const currentBW = getCurrentBodyWeight(state) || 0;
  const points = [];

  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    const ex = (h.exercises || []).find((e) => e.name === exerciseName && Array.isArray(e.sets) && e.sets.length > 0);
    if (!ex) continue;

    let val = 0;
    if (metric === 'maxWeight') {
      val = Math.max(...ex.sets.map((s) => {
        const added = (Number(s.weight) || 0) + (s.mods?.vest ? vestKg : 0);
        return ex.equipment === 'bodyweight' && currentBW > 0 ? Math.round((currentBW + added) * 10) / 10 : added;
      }));
    } else if (metric === 'e1rm') {
      val = Math.max(...ex.sets.map((s) => {
        const added = (Number(s.weight) || 0) + (s.mods?.vest ? vestKg : 0);
        const load = ex.equipment === 'bodyweight' && currentBW > 0 ? currentBW + added : added;
        const r = Number(s.reps) || 1;
        return Math.round(load * (1 + r / 30));
      }));
    } else {
      val = Math.round(ex.sets.reduce((acc, s) => acc + computeSetVolumeKg({ ...s, done: true }, ex, state), 0));
    }

    points.push({ date: formatDateShort(h.date), val });
  }

  if (points.length === 0) {
    return `<div class="py-8 text-center text-xs text-muted">Sin datos suficientes.</div>`;
  }

  // Mostrar últimos 20 puntos para legibilidad móvil
  const sliced = points.slice(-20);
  const width = 500;
  const height = 185;
  const padX = 40;
  const padY = 26;
  const rawMax = Math.max(...sliced.map((p) => p.val), 1);
  const rawMin = Math.min(...sliced.map((p) => p.val), 0);
  const range = Math.max(1, rawMax - rawMin);

  const coords = sliced.map((p, idx) => {
    const x = sliced.length === 1
      ? width / 2
      : padX + (idx / (sliced.length - 1)) * (width - padX * 2);
    const y = height - padY - ((p.val - rawMin) / range) * (height - padY * 2);
    return { x, y, ...p };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const unit = metric === 'volume' ? 'kg vol' : 'kg';
  const stepLabel = Math.max(1, Math.ceil(coords.length / 6));

  return `
    <div class="chart-box">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
        <line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke="#1e293b" stroke-dasharray="4 4" />
        <line x1="${padX}" y1="${height / 2}" x2="${width - padX}" y2="${height / 2}" stroke="#1e293b" stroke-dasharray="4 4" />
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#1e293b" />

        <text x="4" y="${padY + 4}" fill="#64748b" font-size="11" font-weight="600">${rawMax}</text>
        <text x="4" y="${height - padY + 4}" fill="#64748b" font-size="11" font-weight="600">${rawMin}</text>

        ${coords.length > 1 ? `<polyline fill="none" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />` : ''}

        ${coords.map((c, idx) => {
          const showLabel = coords.length <= 7 || idx === 0 || idx === coords.length - 1 || idx % stepLabel === 0;
          return `
            <g>
              <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" fill="#10b981" stroke="#070b14" stroke-width="2">
                <title>${c.date}: ${c.val} ${unit}</title>
              </circle>
              ${showLabel ? `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">${c.val}</text>` : ''}
              ${showLabel ? `<text x="${c.x.toFixed(1)}" y="${height - 4}" text-anchor="middle" fill="#94a3b8" font-size="10">${c.date}</text>` : ''}
            </g>
          `;
        }).join('')}
      </svg>
      <div class="row-between text-2xs text-muted mt-1 px-1">
        <span>Sesiones: <strong class="text-strong">${points.length}</strong></span>
        <span>Mejor marca: <strong class="text-emerald">${rawMax} ${unit}</strong></span>
      </div>
    </div>
  `;
}

export function renderProgressView(state) {
  const totalSessions = state.history.length;
  const totalVolume = state.history.reduce((sum, h) => sum + (Number(h.totalVolume) || 0), 0);
  const weeklyDone = calculateWeeklySessions(state);
  const weeklyTarget = Math.max(1, (state.routines || []).length);
  const vestKg = getVestWeightKg(state);

  const exerciseNamesSet = new Set();
  state.history.forEach((h) => (h.exercises || []).forEach((e) => exerciseNamesSet.add(e.name)));
  const loggedExercises = Array.from(exerciseNamesSet).sort();

  let selectedEx = state.ui.selectedProgressExercise;
  if (!selectedEx || !exerciseNamesSet.has(selectedEx)) {
    selectedEx = loggedExercises[0] || null;
  }

  const metric = state.ui.selectedProgressMetric || 'maxWeight';
  const chartHtml = selectedEx
    ? buildExerciseChartSVG(selectedEx, metric, state)
    : `<div class="py-10 text-center text-xs text-muted">Completa tu primer entrenamiento para ver tu gráfica de evolución aquí.</div>`;

  return `
    <div class="stack-4">
      <div class="grid-3 gap-2.5">
        <div class="kpi-card">
          <p class="kpi-label">Sesiones</p>
          <p class="kpi-value text-strong tabular-nums">${totalSessions}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Volumen Total</p>
          <p class="kpi-value kpi-value--md text-accent tabular-nums">${totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + 't' : totalVolume + 'kg'}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Últimos 7 días</p>
          <p class="kpi-value text-emerald tabular-nums">${weeklyDone}<span class="text-xs text-muted font-semibold">/${weeklyTarget}</span></p>
        </div>
      </div>

      <section class="card card--lg">
        <h3 class="text-sm font-extrabold text-strong mb-3">Evolución por Ejercicio</h3>

        ${loggedExercises.length ? `
          <select id="progress-ex-select" class="input mb-3">
            ${loggedExercises.map((name) => `<option value="${escapeAttr(name)}" ${name === selectedEx ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
          </select>

          <div class="seg-control seg-control--3 mb-3">
            ${[
              { id: 'maxWeight', label: 'Peso Máx' },
              { id: 'e1rm', label: '1RM Est.' },
              { id: 'volume', label: 'Volumen' }
            ].map((m) => `
              <button type="button" class="seg-btn ${metric === m.id ? 'is-active' : ''}" data-action="select-metric" data-metric="${m.id}">
                ${m.label}
              </button>
            `).join('')}
          </div>
        ` : ''}

        ${chartHtml}
      </section>

      <section>
        <h3 class="section-eyebrow mb-2.5 px-1">Historial de Sesiones</h3>
        ${state.history.length === 0 ? `
          <div class="card card--lg text-center">
            <p class="text-sm font-bold text-soft">Aún no hay entrenamientos guardados</p>
            <p class="text-xs text-muted mt-1">Inicia tu Día 1 desde la pestaña Entrenar para registrar tus marcas.</p>
          </div>
        ` : `
          <div class="stack-2.5">
            ${state.history.map((h, idx) => `
              <details class="history-card">
                <summary class="history-card__summary">
                  <div class="min-w-0">
                    <div class="row gap-2 flex-wrap">
                      <span class="text-sm font-extrabold text-strong">${escapeHtml(h.dayName)}</span>
                      <span class="chip chip--subtle">${escapeHtml(h.mode || 'Progresión')}</span>
                    </div>
                    <p class="text-xs text-muted mt-0.5 tabular-nums">
                      ${formatDateShort(h.date)} • ${formatTime(h.durationSeconds || 0)} • ${(h.totalVolume || 0).toLocaleString('es-MX')} kg
                    </p>
                  </div>
                  <span class="history-chevron">▼</span>
                </summary>
                <div class="history-card__body">
                  ${(h.exercises || []).map((ex) => `
                    <div class="text-xs">
                      <p class="font-bold text-accent">${escapeHtml(ex.name)}</p>
                      ${ex.sessionNote ? `<p class="text-2xs text-muted italic mt-0.5">“${escapeHtml(ex.sessionNote)}”</p>` : ''}
                      <div class="row flex-wrap gap-1.5 mt-1">
                        ${(ex.sets || []).map((s, si) => {
                          const modTags = [];
                          if (s.mods?.vest) modTags.push(`+${vestKg}kg`);
                          if (s.mods?.belt) modTags.push('Cinturón');
                          if (s.mods?.bandLevel) modTags.push(`Banda ${s.mods.bandLevel}`);
                          else if (s.mods?.band) modTags.push('Banda');
                          if (s.mods?.pause) modTags.push('Pausa');
                          if (s.mods?.chain) modTags.push('Cadena');
                          return `
                            <span class="set-pill tabular-nums">
                              S${si + 1}: <strong>${s.weight || 0}kg</strong> × ${s.reps}${s.rir !== '' && s.rir !== undefined ? ' @R' + s.rir : ''}${modTags.length ? ' (' + modTags.join(',') + ')' : ''}
                            </span>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `).join('')}
                  <div class="flex-end pt-2">
                    <button type="button" class="btn btn--ghost btn--xs text-rose" data-action="delete-history" data-hist-idx="${idx}">Eliminar registro</button>
                  </div>
                </div>
              </details>
            `).join('')}
          </div>
        `}
      </section>
    </div>
  `;
}
