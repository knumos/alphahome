/**
 * AlphaHome — Vista de Peso Corporal, IMC, Promedio Móvil 7d y Regresión Temporal Real
 */

import {
  getSortedWeightLogsDesc, getCurrentBodyWeight, getInitialBodyWeight,
  getDailyWeightSeries, get7DayMovingAverageWeight, calculateBMI
} from '../engine/progression.js';
import { escapeHtml, escapeAttr, formatDateShort, getTodayDateString, getThemeInfo } from '../utils.js';

function buildBodyWeightChartSVG(state) {
  const daily = getDailyWeightSeries(state);
  if (!daily.length) {
    return `<div class="py-8 text-center text-xs text-muted">Registra tu primer peso arriba para visualizar tu gráfica y tendencia.</div>`;
  }

  const theme = getThemeInfo(state.profile?.theme);
  const points = daily.slice(-24);
  const width = 500;
  const height = 192;
  const padX = 44;
  const padY = 26;

  const weights = points.map((p) => p.weight);
  const rawMax = Math.max(...weights);
  const rawMin = Math.min(...weights);
  const maxVal = Math.ceil((rawMax + 0.5) * 10) / 10;
  const minVal = Math.floor((rawMin - 0.5) * 10) / 10;
  const range = Math.max(0.5, maxVal - minVal);

  const firstMs = points[0].ms;
  const lastMs = points[points.length - 1].ms;
  const spanDays = Math.max(1, (lastMs - firstMs) / (24 * 60 * 60 * 1000));

  const coords = points.map((p, idx) => {
    const dayOffset = (p.ms - firstMs) / (24 * 60 * 60 * 1000);
    const x = points.length === 1
      ? width / 2
      : padX + (spanDays > 0 ? (dayOffset / spanDays) : (idx / (points.length - 1))) * (width - padX * 2);
    const y = height - padY - ((p.weight - minVal) / range) * (height - padY * 2);
    return { x, y, dayOffset, weight: p.weight, date: formatDateShort(p.date + 'T12:00:00') };
  });

  // Regresión lineal usando días transcurridos reales (no índice de array)
  let trendLineSvg = '';
  if (coords.length >= 2) {
    const n = coords.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    coords.forEach((c) => {
      sumX += c.dayOffset;
      sumY += c.weight;
      sumXY += c.dayOffset * c.weight;
      sumXX += c.dayOffset * c.dayOffset;
    });
    const denom = (n * sumXX - sumX * sumX) || 1;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const yStartVal = intercept + slope * coords[0].dayOffset;
    const yEndVal = intercept + slope * coords[n - 1].dayOffset;
    const y1 = height - padY - ((yStartVal - minVal) / range) * (height - padY * 2);
    const y2 = height - padY - ((yEndVal - minVal) / range) * (height - padY * 2);
    trendLineSvg = `<line x1="${coords[0].x.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${coords[n - 1].x.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#10b981" stroke-width="2" stroke-dasharray="6 5" opacity="0.88" />`;
  }

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(coords.length / 6));

  return `
    <div class="chart-box">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
        <line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke="#1e293b" stroke-dasharray="4 4" />
        <line x1="${padX}" y1="${height / 2}" x2="${width - padX}" y2="${height / 2}" stroke="#1e293b" stroke-dasharray="4 4" />
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#1e293b" />

        <text x="4" y="${padY + 4}" fill="#64748b" font-size="11" font-weight="600">${maxVal.toFixed(1)}</text>
        <text x="4" y="${height / 2 + 4}" fill="#64748b" font-size="11" font-weight="600">${((maxVal + minVal) / 2).toFixed(1)}</text>
        <text x="4" y="${height - padY + 4}" fill="#64748b" font-size="11" font-weight="600">${minVal.toFixed(1)}</text>

        ${trendLineSvg}
        ${coords.length > 1 ? `<polyline fill="none" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />` : ''}

        ${coords.map((c, idx) => {
          const showLabel = coords.length <= 7 || idx === 0 || idx === coords.length - 1 || idx % labelStep === 0;
          return `
            <g>
              <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" fill="#10b981" stroke="#070b14" stroke-width="2">
                <title>${c.date}: ${c.weight.toFixed(1)} kg</title>
              </circle>
              ${showLabel ? `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">${c.weight.toFixed(1)}</text>` : ''}
              ${showLabel ? `<text x="${c.x.toFixed(1)}" y="${height - 4}" text-anchor="middle" fill="#94a3b8" font-size="10">${c.date}</text>` : ''}
            </g>
          `;
        }).join('')}
      </svg>
      <div class="row-between text-2xs text-muted mt-1 px-1">
        <span>Mínimo: <strong class="text-emerald">${rawMin.toFixed(1)} kg</strong></span>
        <span>Máximo: <strong class="text-accent">${rawMax.toFixed(1)} kg</strong></span>
      </div>
    </div>
  `;
}

export function renderWeightView(state) {
  const sortedLogs = getSortedWeightLogsDesc(state);
  const currentWeight = getCurrentBodyWeight(state);
  const initialWeight = getInitialBodyWeight(state);
  const diffTotal = (currentWeight !== null && initialWeight !== null) ? currentWeight - initialWeight : null;
  const movingAvg7 = get7DayMovingAverageWeight(state);
  const heightM = state.bodyMetrics?.heightMeters || 1.70;
  const bmi = currentWeight ? calculateBMI(currentWeight, heightM) : null;

  const diffSign = diffTotal !== null && diffTotal > 0 ? '+' : '';
  const diffTone = diffTotal === null ? 'text-muted' : diffTotal < 0 ? 'text-emerald' : diffTotal > 0 ? 'text-accent' : 'text-soft';

  return `
    <div class="stack-4">
      <div class="row-between gap-2">
        <div>
          <h2 class="text-lg font-extrabold text-strong">Peso Corporal</h2>
          <p class="text-xs text-muted">Promedio móvil de 7 días, tendencia real e IMC</p>
        </div>
        <button type="button" class="btn btn--surface btn--xs text-accent shrink-0" data-action="edit-height">
          Estatura: ${heightM.toFixed(2)} m ✎
        </button>
      </div>

      <div class="grid-2-4 gap-2.5">
        <div class="kpi-card">
          <p class="kpi-label">Peso Actual</p>
          <p class="kpi-value text-strong tabular-nums">${currentWeight !== null ? currentWeight.toFixed(1) : '—'} <span class="text-xs text-muted font-semibold">kg</span></p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Cambio vs Inicio</p>
          <p class="kpi-value ${diffTone} tabular-nums">${diffTotal !== null ? `${diffSign}${diffTotal.toFixed(1)}` : '—'} <span class="text-xs text-muted font-semibold">kg</span></p>
          <p class="text-2xs text-faint mt-0.5">${initialWeight !== null ? `Inicio: ${initialWeight.toFixed(1)} kg` : 'Sin base aún'}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Promedio 7 días</p>
          <p class="kpi-value text-accent tabular-nums">${movingAvg7 !== null ? movingAvg7.toFixed(1) : '—'} <span class="text-xs text-muted font-semibold">kg</span></p>
          <p class="text-2xs text-faint mt-0.5">Agrupado por día</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">IMC (${heightM.toFixed(2)}m)</p>
          <p class="kpi-value ${bmi ? `text-${bmi.tone}` : 'text-muted'} tabular-nums">${bmi ? bmi.value.toFixed(1) : '—'}</p>
          <p class="text-2xs ${bmi ? `text-${bmi.tone}` : 'text-faint'} font-semibold mt-0.5">${bmi ? `${bmi.category} • kg/m²` : 'Agrega un pesaje'}</p>
        </div>
      </div>

      <form id="bw-form" class="card card--lg stack-3">
        <h3 class="text-sm font-extrabold text-strong">Registrar nuevo pesaje</h3>

        <div class="grid-1-sm-2 gap-3">
          <div>
            <label class="field-label" for="bw-input-date">Fecha</label>
            <input id="bw-input-date" type="date" value="${getTodayDateString()}" required class="input" />
          </div>
          <div>
            <label class="field-label" for="bw-input-weight">Peso (kg)</label>
            <div class="row gap-1.5">
              <button type="button" class="btn btn--surface btn--sm" data-action="step-bw" data-delta="-0.1">-0.1</button>
              <input id="bw-input-weight" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${currentWeight !== null ? currentWeight.toFixed(1) : ''}" placeholder="Ej. 65.0" required class="input text-center font-extrabold tabular-nums flex-1 min-w-0" />
              <button type="button" class="btn btn--surface btn--sm" data-action="step-bw" data-delta="0.1">+0.1</button>
            </div>
          </div>
        </div>

        <div>
          <label class="field-label" for="bw-input-note">Nota opcional</label>
          <input id="bw-input-note" type="text" placeholder="Ej. En ayunas, post-entrenamiento..." class="input" />
          <div class="row flex-wrap gap-1.5 mt-2">
            ${['En ayunas', 'Post-entrenamiento', 'Antes de dormir'].map((tag) => `
              <button type="button" class="pill-choice" data-action="quick-bw-note" data-note="${escapeAttr(tag)}">+ ${tag}</button>
            `).join('')}
          </div>
        </div>

        <button type="submit" class="btn btn--emerald btn--block">+ Guardar Pesaje</button>
      </form>

      <section class="card card--lg">
        <div class="row-between mb-3">
          <h3 class="text-sm font-extrabold text-strong">Evolución y Tendencia</h3>
          <div class="row gap-3 text-2xs text-muted font-semibold">
            <span class="row gap-1"><span class="legend-line legend-line--accent"></span>Peso</span>
            <span class="row gap-1"><span class="legend-line legend-line--trend"></span>Tendencia</span>
          </div>
        </div>
        ${buildBodyWeightChartSVG(state)}
      </section>

      <section>
        <h3 class="section-eyebrow mb-2.5 px-1">Historial de Pesajes (${sortedLogs.length})</h3>
        ${sortedLogs.length === 0 ? `
          <div class="card card--lg text-center text-xs text-muted">
            Aún no tienes registros de peso. Agrega el primero arriba.
          </div>
        ` : `
          <div class="stack-2">
            ${sortedLogs.map((log, idx) => {
              const prev = sortedLogs[idx + 1];
              const delta = prev ? (Number(log.weight) - Number(prev.weight)) : null;
              const deltaText = delta === null ? 'Base' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
              const chipTone = delta === null ? 'chip--subtle' : delta < 0 ? 'chip--emerald' : delta > 0 ? 'chip--accent' : 'chip--subtle';
              return `
                <div class="card row-between gap-3">
                  <div class="min-w-0">
                    <div class="row gap-2">
                      <span class="text-base font-extrabold text-strong tabular-nums">${Number(log.weight).toFixed(1)} kg</span>
                      <span class="chip ${chipTone} tabular-nums">${deltaText}</span>
                    </div>
                    <p class="text-xs text-muted mt-0.5 truncate">
                      ${formatDateShort(log.date + 'T12:00:00')}${log.note ? ' • ' + escapeHtml(log.note) : ''}
                    </p>
                  </div>
                  <button type="button" class="icon-btn icon-btn--xs icon-btn--danger shrink-0" data-action="delete-bw" data-log-id="${escapeAttr(log.id)}" aria-label="Eliminar pesaje">✕</button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>
    </div>
  `;
}
