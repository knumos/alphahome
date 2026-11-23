/**
 * AlphaHome — Editor Completo de Rutinas, Catálogo Buscable y Compartir Rutina
 */

import { EXERCISE_CATALOG, getCatalogGroups } from '../data/catalog.js';
import { ROUTINE_TEMPLATES } from '../data/templates.js';
import { state, saveState, replaceState, applyRoutineTemplate, exportRoutinesOnly, exportSetup, classifyImport, applySharedPayload } from '../state.js';
import { movementFits } from '../engine/adapt.js';
import { escapeHtml, formatTime, openModal, closeModal, showToast } from '../utils.js';

export function openRoutineManagerModal(onChanged, openTech) {
  const renderManager = () => {
    openModal(`
      <div class="modal-header">
        <div>
          <span class="chip chip--accent">Personalización</span>
          <h3 class="modal-title mt-1">Mis Rutinas y Días</h3>
        </div>
        <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
      </div>

      <div class="stack-2 mt-4">
        ${state.routines.map((day, idx) => `
          <div class="list-card">
            <div class="row-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-bold text-strong truncate">${escapeHtml(day.name)}</p>
                <p class="text-xs text-muted truncate">${escapeHtml(day.focus)} • ${day.exercises.length} ejercicios</p>
              </div>
              <div class="row gap-1 shrink-0">
                <button type="button" class="icon-btn icon-btn--xs" data-move-day="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Subir día">↑</button>
                <button type="button" class="icon-btn icon-btn--xs" data-move-day="${idx}" data-dir="1" ${idx === state.routines.length - 1 ? 'disabled' : ''} aria-label="Bajar día">↓</button>
                <button type="button" class="btn btn--accent-soft btn--xs" data-edit-day="${day.id}">Editar</button>
                ${state.routines.length > 1 ? `<button type="button" class="icon-btn icon-btn--xs icon-btn--danger" data-del-day="${idx}" aria-label="Eliminar día">✕</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <button type="button" id="rm-add-day" class="btn btn--primary btn--block mt-3">+ Añadir nuevo día</button>

      <div class="divider mt-4 mb-3"></div>
      <p class="section-eyebrow mb-2">Plantillas y Compartir</p>
      <div class="grid-2 gap-2">
        <button type="button" id="rm-templates" class="btn btn--surface btn--sm">📋 Elegir plantilla</button>
        <button type="button" id="rm-export" class="btn btn--surface btn--sm text-emerald">⬇ Solo rutina</button>
      </div>
      <button type="button" id="rm-export-setup" class="btn btn--surface btn--block btn--sm mt-2">⬇ Rutina + equipo, espacio y meta</button>
      <label class="btn btn--surface btn--block btn--sm mt-2 cursor-pointer text-accent">
        ⬆ Importar rutina compartida (.json)
        <input id="rm-import" type="file" accept=".json,application/json" class="hidden" />
      </label>
    `);

    const root = document.getElementById('modal-content');
    if (!root) return;
    root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());

    root.querySelectorAll('[data-move-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.moveDay);
        const dir = Number(btn.dataset.dir);
        const target = i + dir;
        if (target < 0 || target >= state.routines.length) return;
        const [moved] = state.routines.splice(i, 1);
        state.routines.splice(target, 0, moved);
        saveState();
        onChanged();
        renderManager();
      });
    });

    root.querySelectorAll('[data-edit-day]').forEach((btn) => {
      btn.addEventListener('click', () => openDayEditorModal(btn.dataset.editDay, onChanged, openTech, renderManager));
    });

    root.querySelectorAll('[data-del-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.delDay);
        if (state.routines.length <= 1) return;
        state.routines.splice(i, 1);
        saveState();
        onChanged();
        showToast('Día eliminado de tu rutina.', 'info');
        renderManager();
      });
    });

    root.querySelector('#rm-add-day')?.addEventListener('click', () => {
      const nextNum = state.routines.length + 1;
      const newDay = {
        id: 'day_' + Date.now(),
        name: `Día ${nextNum} — Personalizado`,
        focus: 'Fuerza en casa',
        recommendedDay: '',
        warmup: [],
        exercises: []
      };
      state.routines.push(newDay);
      saveState();
      onChanged();
      openDayEditorModal(newDay.id, onChanged, openTech, renderManager);
    });

    root.querySelector('#rm-templates')?.addEventListener('click', () => openTemplatePickerModal(onChanged, renderManager));

    root.querySelector('#rm-export')?.addEventListener('click', () => {
      exportRoutinesOnly();
      showToast('Rutina descargada, sin historial.', 'success');
    });

    root.querySelector('#rm-export-setup')?.addEventListener('click', () => {
      exportSetup();
      showToast('Rutina y configuración descargadas, sin historial.', 'success');
    });

    root.querySelector('#rm-import')?.addEventListener('change', (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const kind = classifyImport(parsed);
          if (kind === 'invalid') throw new Error('inválido');
          if (kind === 'backup') {
            const next = applySharedPayload(state, parsed, 'routines');
            replaceState(next);
            onChanged();
            showToast('Se tomaron solo las rutinas del respaldo. El historial de este teléfono sigue igual. Para restaurar todo usa Ajustes.', 'success');
            renderManager();
            return;
          }
          openShareImportModal(parsed, () => {
            onChanged();
            renderManager();
          });
        } catch {
          showToast('Archivo de rutina inválido.', 'error');
        }
      };
      reader.readAsText(file);
    });
  };

  renderManager();
}

export function openTemplatePickerModal(onChanged, onBack = null) {
  openModal(`
    <div class="modal-header">
      <div>
        <h3 class="modal-title">Plantillas de Rutina</h3>
        <p class="text-xs text-muted mt-0.5">Cambiar plantilla reemplaza tus días actuales pero conserva todo tu historial.</p>
      </div>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="stack-2 mt-4">
      ${ROUTINE_TEMPLATES.map((tpl) => `
        <div class="tpl-card tpl-card--static">
          <div class="row-between gap-2">
            <strong class="text-sm text-strong">${escapeHtml(tpl.name)}</strong>
            <span class="chip chip--subtle">${escapeHtml(tpl.badge)}</span>
          </div>
          <p class="text-xs text-muted mt-1">${escapeHtml(tpl.summary)}</p>
          <button type="button" class="btn btn--accent-soft btn--xs mt-3" data-apply-tpl="${tpl.id}">Usar esta plantilla →</button>
        </div>
      `).join('')}
    </div>

    ${onBack ? '<button type="button" id="tpl-back" class="btn btn--surface btn--block mt-4">← Volver</button>' : ''}
  `);

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root.querySelector('#tpl-back')?.addEventListener('click', () => onBack());
  root.querySelectorAll('[data-apply-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tpl = applyRoutineTemplate(btn.dataset.applyTpl);
      onChanged();
      showToast(`Plantilla aplicada: ${tpl.name}`, 'success');
      if (onBack) onBack();
      else closeModal();
    });
  });
}

export function openDayEditorModal(dayId, onChanged, openTech, onBack = null) {
  const renderDay = () => {
    const day = state.routines.find((r) => r.id === dayId);
    if (!day) return closeModal();

    openModal(`
      <div class="modal-header">
        <div class="row gap-2 min-w-0">
          ${onBack ? '<button type="button" class="icon-btn icon-btn--xs" id="de-back" aria-label="Volver">←</button>' : ''}
          <h3 class="modal-title truncate">Editar Día</h3>
        </div>
        <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
      </div>

      <div class="stack-2 mt-3">
        <div>
          <label class="field-label" for="de-name">Nombre del día</label>
          <input id="de-name" type="text" value="${escapeHtml(day.name)}" class="input" />
        </div>
        <div class="grid-2 gap-2">
          <div>
            <label class="field-label" for="de-focus">Enfoque muscular</label>
            <input id="de-focus" type="text" value="${escapeHtml(day.focus)}" class="input" />
          </div>
          <div>
            <label class="field-label" for="de-recday">Día sugerido</label>
            <input id="de-recday" type="text" value="${escapeHtml(day.recommendedDay || '')}" placeholder="Ej. Lunes" class="input" />
          </div>
        </div>
      </div>

      <div class="row-between mt-4 mb-2">
        <p class="section-eyebrow">Ejercicios (${day.exercises.length})</p>
        <button type="button" id="de-add-ex" class="btn btn--primary btn--xs">+ Añadir ejercicio</button>
      </div>

      ${day.exercises.length === 0 ? `
        <div class="empty-box text-xs text-muted">
          Sin ejercicios todavía. Toca <strong>+ Añadir ejercicio</strong> para elegir del catálogo 3D o crear uno propio.
        </div>
      ` : `
        <div class="stack-2">
          ${day.exercises.map((ex, idx) => `
            <div class="list-card">
              <div class="row-between gap-2">
                <div class="min-w-0">
                  <div class="row gap-1.5 flex-wrap">
                    ${ex.superset ? `<span class="chip chip--accent">${escapeHtml(ex.superset)}</span>` : ''}
                    <strong class="text-sm text-strong truncate">${escapeHtml(ex.name)}</strong>
                  </div>
                  <p class="text-xs text-muted mt-0.5">
                    ${ex.sets} × ${ex.minReps === ex.maxReps ? ex.minReps : `${ex.minReps}-${ex.maxReps}`} reps • Descanso ${formatTime(ex.restSec)}
                    ${ex.note ? ` • ${escapeHtml(ex.note)}` : ''}
                  </p>
                </div>
                <div class="row gap-1 shrink-0">
                  <button type="button" class="icon-btn icon-btn--xs" data-ex-move="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
                  <button type="button" class="icon-btn icon-btn--xs" data-ex-move="${idx}" data-dir="1" ${idx === day.exercises.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
                  <button type="button" class="btn btn--surface btn--xs" data-ex-edit="${idx}">✎</button>
                  <button type="button" class="icon-btn icon-btn--xs icon-btn--danger" data-ex-del="${idx}" aria-label="Quitar">✕</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <button type="button" id="de-save" class="btn btn--emerald btn--block mt-4">Guardar cambios</button>
    `);

    const root = document.getElementById('modal-content');
    if (!root) return;

    const persistMeta = () => {
      const n = document.getElementById('de-name')?.value.trim();
      const f = document.getElementById('de-focus')?.value.trim();
      const d = document.getElementById('de-recday')?.value.trim();
      if (n) day.name = n;
      day.focus = f || day.focus;
      day.recommendedDay = d || '';
      saveState();
      onChanged();
    };

    root.querySelector('[data-close-modal]')?.addEventListener('click', () => { persistMeta(); closeModal(); });
    root.querySelector('#de-back')?.addEventListener('click', () => { persistMeta(); onBack(); });
    root.querySelector('#de-save')?.addEventListener('click', () => {
      persistMeta();
      showToast('Día actualizado.', 'success');
      if (onBack) onBack();
      else closeModal();
    });

    root.querySelectorAll('[data-ex-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persistMeta();
        const i = Number(btn.dataset.exMove);
        const target = i + Number(btn.dataset.dir);
        if (target < 0 || target >= day.exercises.length) return;
        const [moved] = day.exercises.splice(i, 1);
        day.exercises.splice(target, 0, moved);
        saveState();
        onChanged();
        renderDay();
      });
    });

    root.querySelectorAll('[data-ex-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persistMeta();
        day.exercises.splice(Number(btn.dataset.exDel), 1);
        saveState();
        onChanged();
        renderDay();
      });
    });

    root.querySelectorAll('[data-ex-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        persistMeta();
        openExerciseConfigModal(day, Number(btn.dataset.exEdit), onChanged, renderDay);
      });
    });

    root.querySelector('#de-add-ex')?.addEventListener('click', () => {
      persistMeta();
      openCatalogPickerModal(day, onChanged, openTech, renderDay);
    });
  };

  renderDay();
}

function openExerciseConfigModal(day, exIdx, onChanged, onBack) {
  const ex = day.exercises[exIdx];
  if (!ex) return onBack();

  openModal(`
    <div class="modal-header">
      <div class="row gap-2 min-w-0">
        <button type="button" class="icon-btn icon-btn--xs" id="ec-back" aria-label="Volver">←</button>
        <h3 class="modal-title truncate">Configurar Ejercicio</h3>
      </div>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="stack-3 mt-3">
      <div>
        <label class="field-label" for="ec-name">Nombre</label>
        <input id="ec-name" type="text" value="${escapeHtml(ex.name)}" class="input" />
      </div>

      <div class="grid-3 gap-2">
        <div>
          <label class="field-label" for="ec-sets">Series</label>
          <input id="ec-sets" type="number" min="1" max="10" value="${ex.sets}" class="input tabular-nums text-center" />
        </div>
        <div>
          <label class="field-label" for="ec-minr">Reps mín</label>
          <input id="ec-minr" type="number" min="1" max="40" value="${ex.minReps}" class="input tabular-nums text-center" />
        </div>
        <div>
          <label class="field-label" for="ec-maxr">Reps máx</label>
          <input id="ec-maxr" type="number" min="1" max="50" value="${ex.maxReps}" class="input tabular-nums text-center" />
        </div>
      </div>

      <div class="grid-2 gap-2">
        <div>
          <label class="field-label" for="ec-rest">Descanso (seg)</label>
          <input id="ec-rest" type="number" min="10" max="600" step="5" value="${ex.restSec}" class="input tabular-nums" />
        </div>
        <div>
          <label class="field-label" for="ec-eq">Equipo</label>
          <select id="ec-eq" class="input">
            <option value="dumbbell" ${ex.equipment === 'dumbbell' ? 'selected' : ''}>Mancuerna(s)</option>
            <option value="bodyweight" ${ex.equipment === 'bodyweight' ? 'selected' : ''}>Peso corporal</option>
            <option value="band" ${ex.equipment === 'band' ? 'selected' : ''}>Banda de resistencia</option>
          </select>
        </div>
      </div>

      <div class="grid-2 gap-2">
        <div>
          <label class="field-label" for="ec-step">Incremento (kg)</label>
          <input id="ec-step" type="number" min="0" max="10" step="0.5" value="${ex.stepKg ?? 1}" class="input tabular-nums" />
        </div>
        <div>
          <label class="field-label" for="ec-ss">Superserie</label>
          <select id="ec-ss" class="input">
            <option value="" ${!ex.superset ? 'selected' : ''}>Ninguna</option>
            <option value="SUPERSERIE A" ${ex.superset === 'SUPERSERIE A' ? 'selected' : ''}>SUPERSERIE A</option>
            <option value="SUPERSERIE B" ${ex.superset === 'SUPERSERIE B' ? 'selected' : ''}>SUPERSERIE B</option>
          </select>
        </div>
      </div>

      <div>
        <label class="field-label" for="ec-note">Nota fija (opcional)</label>
        <input id="ec-note" type="text" value="${escapeHtml(ex.note || '')}" placeholder="Ej. Por pierna, pausa 2s..." class="input" />
      </div>

      <label class="toggle-row">
        <span class="text-xs font-semibold">Usa 2 mancuernas (bilateral para cálculo de volumen)</span>
        <input type="checkbox" id="ec-bilat" class="toggle-check" ${ex.bilateral !== false ? 'checked' : ''} />
      </label>
    </div>

    <button type="button" id="ec-save" class="btn btn--emerald btn--block mt-4">Aplicar cambios</button>
  `);

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root.querySelector('#ec-back')?.addEventListener('click', () => onBack());
  root.querySelector('#ec-save')?.addEventListener('click', () => {
    const minR = Math.max(1, Number(document.getElementById('ec-minr').value) || 8);
    const maxR = Math.max(minR, Number(document.getElementById('ec-maxr').value) || minR);
    ex.name = document.getElementById('ec-name').value.trim() || ex.name;
    ex.sets = Math.max(1, Math.min(10, Number(document.getElementById('ec-sets').value) || 3));
    ex.minReps = minR;
    ex.maxReps = maxR;
    ex.restSec = Math.max(5, Math.min(600, Number(document.getElementById('ec-rest').value) || 90));
    ex.equipment = document.getElementById('ec-eq').value;
    ex.stepKg = Math.max(0, Number(document.getElementById('ec-step').value) || 0);
    ex.superset = document.getElementById('ec-ss').value || null;
    ex.note = document.getElementById('ec-note').value.trim();
    ex.bilateral = document.getElementById('ec-bilat').checked;
    saveState();
    onChanged();
    onBack();
  });
}

function openCatalogPickerModal(day, onChanged, openTech, onBack) {
  let activeGroup = 'Todos';
  let query = '';
  const groups = ['Todos', ...getCatalogGroups().filter((g) => g !== 'Calentamiento')];

  const renderList = () => {
    const q = query.toLowerCase().trim();
    const pool = EXERCISE_CATALOG.filter((item) => {
      if (item.group === 'Calentamiento') return false;
      if (activeGroup !== 'Todos' && item.group !== activeGroup) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.muscles.toLowerCase().includes(q)) return false;
      return true;
    });
    const hidden = pool.filter((item) => !movementFits(item.name, state.equipment, state.space)).length;
    const filtered = pool.filter((item) => movementFits(item.name, state.equipment, state.space));

    const listEl = document.getElementById('cp-list');
    if (!listEl) return;
    const hiddenNote = hidden
      ? `<p class="text-2xs text-muted">Ocultos por equipo o espacio: ${hidden}. El pasillo y la barra solo aparecen si los declaraste.</p>`
      : '';
    listEl.innerHTML = hiddenNote + (filtered.length
      ? filtered.map((item) => `
          <div class="list-card row-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-bold text-strong truncate">${escapeHtml(item.name)}</p>
              <p class="text-2xs text-muted truncate">${escapeHtml(item.group)} • ${escapeHtml(item.muscles)}</p>
            </div>
            <div class="row gap-1 shrink-0">
              <button type="button" class="btn btn--primary btn--xs" data-add-cat="${item.id}">+ Añadir</button>
            </div>
          </div>
        `).join('')
      : '<p class="text-xs text-muted text-center py-4">No hay coincidencias. Puedes crear un ejercicio personalizado abajo.</p>');

    listEl.querySelectorAll('[data-add-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = EXERCISE_CATALOG.find((c) => c.id === btn.dataset.addCat);
        if (!item) return;
        const userStep = state.equipment?.dumbbellStepKg || item.stepKg;
        day.exercises.push({
          id: 'ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          name: item.name,
          sets: item.sets,
          minReps: item.minReps,
          maxReps: item.maxReps,
          restSec: item.restSec,
          equipment: item.equipment,
          bilateral: item.bilateral,
          stepKg: item.equipment === 'dumbbell' ? Math.min(item.stepKg, userStep) : item.stepKg,
          superset: null,
          note: item.note || '',
          alternatives: [...(item.alternatives || [])]
        });
        saveState();
        onChanged();
        showToast(`Añadido: ${item.name}`, 'success');
        onBack();
      });
    });
  };

  openModal(`
    <div class="modal-header">
      <div class="row gap-2">
        <button type="button" class="icon-btn icon-btn--xs" id="cp-back" aria-label="Volver">←</button>
        <h3 class="modal-title">Catálogo 3D de Ejercicios</h3>
      </div>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <input id="cp-search" type="search" placeholder="Buscar ejercicio o músculo..." class="input mt-3" />

    <div class="chip-scroll mt-2.5">
      ${groups.map((g) => `
        <button type="button" class="pill-choice ${g === 'Todos' ? 'is-active' : ''}" data-cp-group="${escapeHtml(g)}">${escapeHtml(g)}</button>
      `).join('')}
    </div>

    <div id="cp-list" class="stack-2 mt-3" style="max-height: 44vh; overflow-y: auto;"></div>

    <div class="divider mt-4 mb-3"></div>
    <p class="field-label">¿No aparece? Crea un ejercicio personalizado</p>
    <div class="row gap-2 mt-1">
      <input id="cp-custom-name" type="text" placeholder="Ej. Elevación de talones de pie" class="input flex-1" />
      <button type="button" id="cp-add-custom" class="btn btn--surface btn--sm">Crear</button>
    </div>
  `);

  const root = document.getElementById('modal-content');
  if (!root) return;
  root.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root.querySelector('#cp-back')?.addEventListener('click', () => onBack());

  root.querySelector('#cp-search')?.addEventListener('input', (e) => {
    query = e.target.value;
    renderList();
  });

  root.querySelectorAll('[data-cp-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeGroup = btn.dataset.cpGroup;
      root.querySelectorAll('[data-cp-group]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.cpGroup === activeGroup);
      });
      renderList();
    });
  });

  root.querySelector('#cp-add-custom')?.addEventListener('click', () => {
    const name = document.getElementById('cp-custom-name')?.value.trim();
    if (!name) return showToast('Escribe el nombre del ejercicio.', 'warning');
    day.exercises.push({
      id: 'ex_' + Date.now(),
      name,
      sets: 3, minReps: 10, maxReps: 12, restSec: 90,
      equipment: 'dumbbell', bilateral: true,
      stepKg: state.equipment?.dumbbellStepKg || 1,
      superset: null, note: '', alternatives: []
    });
    saveState();
    onChanged();
    showToast(`Ejercicio creado: ${name}`, 'success');
    onBack();
  });

  renderList();
}

export function openShareImportModal(parsed, onApplied) {
  const kind = classifyImport(parsed);
  const apply = (mode) => {
    const before = (state.history || []).length;
    const next = applySharedPayload(state, parsed, mode);
    if ((next.history || []).length !== before) {
      showToast('Se canceló la importación para no tocar tu historial.', 'error');
      return;
    }
    replaceState(next);
    closeModal(true);
    const label = mode === 'setup' ? 'Rutina y configuración importadas' : 'Rutina importada';
    showToast(`${label}. Tu historial (${before} sesiones) sigue igual.`, 'success');
    if (onApplied) onApplied();
  };

  if (kind === 'routines' || kind === 'backup') {
    apply('routines');
    return;
  }
  if (kind !== 'setup') {
    showToast('Ese archivo no trae una rutina para compartir.', 'error');
    return;
  }

  const cfg = parsed.config || {};
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Importar rutina compartida</h3>
      <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
    </div>
    <p class="text-xs text-muted mt-2">De ${escapeHtml(parsed.author || 'otra persona')}. Ninguna opción borra tu historial, tus pesajes ni la sesión en curso.</p>
    <div class="stack-2 mt-4">
      <button type="button" id="share-routines" class="btn btn--surface btn--block">Solo la rutina</button>
      <button type="button" id="share-setup" class="btn btn--primary btn--block">Rutina + configuración</button>
    </div>
    <p class="text-2xs text-muted mt-3">La configuración incluye equipo, espacio, objetivo (${escapeHtml(String(cfg.goal || 'general'))}), nivel y días por semana.</p>
  `);
  const root = document.getElementById('modal-content');
  root?.querySelector('[data-close-modal]')?.addEventListener('click', () => closeModal());
  root?.querySelector('#share-routines')?.addEventListener('click', () => apply('routines'));
  root?.querySelector('#share-setup')?.addEventListener('click', () => apply('setup'));
}
