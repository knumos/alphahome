/**
 * AlphaHome — Modal Interactivo de Técnica 3D → 2D (carga bajo demanda)
 */

import { POSES_3D } from './poses.js';
import { renderScene3D } from './rig3d.js';
import { resolveExerciseGuide } from '../data/catalog.js';
import { escapeHtml, openModal, closeModal, getThemeInfo } from '../utils.js';

const techAnim = {
  rafId: null,
  playing: true,
  speed: 1,
  showGuides: true,
  viewIndex: 0,
  startTime: 0,
  pausedPhase: 0,
  exerciseName: '',
  poseDef: POSES_3D.incline_press,
  accentColor: '#22d3ee'
};

function getSmoothProgress(phase, poseDef) {
  const labels = poseDef.phaseLabels || ['Inicio', 'Fase activa', 'Pausa', 'Retorno'];
  let p = 0;
  let label = labels[0];
  if (phase < 0.08) {
    p = 0;
    label = labels[0];
  } else if (phase < 0.46) {
    const u = (phase - 0.08) / 0.38;
    p = 0.5 - 0.5 * Math.cos(u * Math.PI);
    label = labels[1];
  } else if (phase < 0.58) {
    p = 1;
    label = labels[2];
  } else if (phase < 0.94) {
    const u = (phase - 0.58) / 0.36;
    p = 0.5 + 0.5 * Math.cos(u * Math.PI);
    label = labels[3];
  } else {
    p = 0;
    label = labels[0];
  }
  return { p, label };
}

export function stopTechniqueAnim() {
  if (techAnim.rafId) {
    cancelAnimationFrame(techAnim.rafId);
    techAnim.rafId = null;
  }
}

function renderFrame(phase) {
  const svg = document.getElementById('tech-svg-stage');
  if (!svg) return;
  const { p, label } = getSmoothProgress(phase, techAnim.poseDef);
  const badge = document.getElementById('tech-phase-badge');
  if (badge) badge.textContent = label;
  const scrubber = document.getElementById('tech-phase-scrubber');
  if (scrubber && techAnim.playing) {
    scrubber.value = String(Math.round(phase * 100));
  }
  svg.innerHTML = renderScene3D(
    techAnim.poseDef,
    techAnim.viewIndex,
    p,
    techAnim.showGuides,
    techAnim.accentColor
  );
}

function startLoop() {
  stopTechniqueAnim();
  const loop = (now) => {
    if (!document.getElementById('tech-svg-stage')) {
      stopTechniqueAnim();
      return;
    }
    const cycleMs = 3600 / techAnim.speed;
    const phase = ((now - techAnim.startTime) % cycleMs) / cycleMs;
    techAnim.pausedPhase = phase;
    renderFrame(phase);
    if (techAnim.playing) {
      techAnim.rafId = requestAnimationFrame(loop);
    }
  };
  techAnim.rafId = requestAnimationFrame(loop);
}

export function openTechniqueModal(exerciseName, themeId = 'cyan') {
  stopTechniqueAnim();
  const guide = resolveExerciseGuide(exerciseName);
  const poseDef = POSES_3D[guide.archetype] || POSES_3D.flat_press;
  const theme = getThemeInfo(themeId);

  techAnim.exerciseName = exerciseName;
  techAnim.poseDef = poseDef;
  techAnim.accentColor = theme.accent;
  techAnim.viewIndex = 0;
  techAnim.playing = true;
  techAnim.speed = 1;
  techAnim.showGuides = true;
  techAnim.startTime = performance.now();
  techAnim.pausedPhase = 0;

  const ytQuery = encodeURIComponent(`${exerciseName} tecnica correcta ejecucion`);
  const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

  openModal(`
    <div class="modal-header">
      <div class="min-w-0">
        <span class="chip chip--accent">Guía Técnica 3D • 3 Proyecciones</span>
        <h3 class="modal-title mt-1">${escapeHtml(exerciseName)}</h3>
        <p class="text-xs text-muted mt-0.5">${escapeHtml(guide.muscles || '')}</p>
      </div>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="seg-control seg-control--3 mt-3" role="tablist" aria-label="Proyecciones">
      ${poseDef.views.map((v, idx) => `
        <button type="button" class="seg-btn ${idx === 0 ? 'is-active' : ''}" data-tech-view="${idx}">
          ${escapeHtml(v.label)}
        </button>
      `).join('')}
    </div>

    <div class="tech-stage mt-3">
      <span id="tech-phase-badge" class="tech-badge tech-badge--left">${escapeHtml(poseDef.phaseLabels?.[0] || 'Inicio')}</span>
      <span id="tech-view-badge" class="tech-badge tech-badge--right">${escapeHtml(poseDef.views[0].label)}</span>
      <svg id="tech-svg-stage" viewBox="0 0 340 230" class="tech-svg" role="img" aria-label="Animación técnica de ${escapeHtml(exerciseName)}"></svg>
    </div>

    <div class="tech-scrubber-row mt-2">
      <span class="text-2xs text-muted">Fase</span>
      <input id="tech-phase-scrubber" type="range" min="0" max="100" value="0" class="range-input" aria-label="Recorrer fase del movimiento" />
    </div>

    <div class="grid-3 gap-2 mt-2">
      <button type="button" id="tech-play-btn" class="btn btn--surface btn--sm">⏸ Pausar</button>
      <button type="button" id="tech-speed-btn" class="btn btn--surface btn--sm text-accent">Vel: 1.0x</button>
      <button type="button" id="tech-guides-btn" class="btn btn--surface btn--sm text-emerald">Guías: Sí</button>
    </div>

    <div class="stack-2 mt-4">
      ${(guide.cues || []).map(([title, desc], i) => `
        <div class="cue-card">
          <span class="cue-num ${i === 2 ? 'cue-num--warn' : ''}">${i === 2 ? '!' : i + 1}</span>
          <div class="text-xs leading-relaxed">
            <strong class="${i === 2 ? 'text-rose' : 'text-strong'}">${escapeHtml(title)}:</strong>
            <span class="text-soft"> ${escapeHtml(desc)}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--surface btn--block mt-4">
      <span>▶ Ver video real en YouTube</span>
      <span class="text-muted">↗</span>
    </a>
  `, { onClose: stopTechniqueAnim });

  const content = document.getElementById('modal-content');
  if (!content) return;

  content.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());

  content.querySelectorAll('[data-tech-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.techView);
      techAnim.viewIndex = idx;
      content.querySelectorAll('[data-tech-view]').forEach((b) => {
        b.classList.toggle('is-active', Number(b.dataset.techView) === idx);
      });
      const vb = document.getElementById('tech-view-badge');
      if (vb) vb.textContent = poseDef.views[idx]?.label || '';
      renderFrame(techAnim.pausedPhase);
    });
  });

  const playBtn = document.getElementById('tech-play-btn');
  playBtn?.addEventListener('click', () => {
    techAnim.playing = !techAnim.playing;
    playBtn.textContent = techAnim.playing ? '⏸ Pausar' : '▶ Reproducir';
    if (techAnim.playing) {
      techAnim.startTime = performance.now() - techAnim.pausedPhase * (3600 / techAnim.speed);
      startLoop();
    } else {
      stopTechniqueAnim();
    }
  });

  const speedBtn = document.getElementById('tech-speed-btn');
  speedBtn?.addEventListener('click', () => {
    techAnim.speed = techAnim.speed === 1 ? 0.5 : 1;
    speedBtn.textContent = `Vel: ${techAnim.speed.toFixed(1)}x`;
    if (techAnim.playing) {
      techAnim.startTime = performance.now() - techAnim.pausedPhase * (3600 / techAnim.speed);
    }
  });

  const guidesBtn = document.getElementById('tech-guides-btn');
  guidesBtn?.addEventListener('click', () => {
    techAnim.showGuides = !techAnim.showGuides;
    guidesBtn.textContent = techAnim.showGuides ? 'Guías: Sí' : 'Guías: No';
    renderFrame(techAnim.pausedPhase);
  });

  const scrubber = document.getElementById('tech-phase-scrubber');
  scrubber?.addEventListener('input', () => {
    if (techAnim.playing) {
      techAnim.playing = false;
      stopTechniqueAnim();
      if (playBtn) playBtn.textContent = '▶ Reproducir';
    }
    techAnim.pausedPhase = Number(scrubber.value) / 100;
    renderFrame(techAnim.pausedPhase);
  });

  startLoop();
}
