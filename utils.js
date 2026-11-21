/**
 * AlphaHome — Utilidades UI, Temas, Audio WebAPI, Notificaciones PWA y WakeLock
 */

export const THEMES = {
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    swatch: '#06b6d4',
    accent: '#22d3ee',
    accentStrong: '#0891b2'
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    swatch: '#10b981',
    accent: '#34d399',
    accentStrong: '#059669'
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    swatch: '#f43f5e',
    accent: '#fb7185',
    accentStrong: '#e11d48'
  },
  amber: {
    id: 'amber',
    name: 'Ámbar',
    swatch: '#f59e0b',
    accent: '#fbbf24',
    accentStrong: '#d97706'
  },
  blue: {
    id: 'blue',
    name: 'Azul',
    swatch: '#3b82f6',
    accent: '#60a5fa',
    accentStrong: '#2563eb'
  }
};

export function getThemeInfo(themeId) {
  return THEMES[themeId] || THEMES.cyan;
}

export function applyTheme(themeId) {
  const info = getThemeInfo(themeId);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = info.id;
  }
  return info;
}

// ---------------------------------------------------------------------------
// Formateo y Escape
// ---------------------------------------------------------------------------
export function formatTime(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateShort(isoStr) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(str) {
  return escapeHtml(str);
}

// ---------------------------------------------------------------------------
// Toasts y Modales Accesibles (Escape + Scroll Lock + Focus)
// ---------------------------------------------------------------------------
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast--leaving');
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

let modalState = {
  onClose: null,
  lockDismiss: false
};

export function openModal(html, options = {}) {
  const backdrop = document.getElementById('modal-backdrop');
  const content = document.getElementById('modal-content');
  if (!backdrop || !content) return;

  if (typeof modalState.onClose === 'function') {
    try { modalState.onClose(); } catch {}
  }

  modalState = {
    onClose: options.onClose || null,
    lockDismiss: Boolean(options.lockDismiss)
  };

  content.innerHTML = html;
  content.scrollTop = 0;
  backdrop.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

export function closeModal(force = false) {
  if (modalState.lockDismiss && !force) return;
  const backdrop = document.getElementById('modal-backdrop');
  if (!backdrop || backdrop.classList.contains('hidden')) return;

  if (typeof modalState.onClose === 'function') {
    try { modalState.onClose(); } catch {}
  }
  modalState = { onClose: null, lockDismiss: false };
  backdrop.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

export function initModalDismissHandlers() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ---------------------------------------------------------------------------
// Audio (Web Audio API), Vibración y Notificaciones PWA
// ---------------------------------------------------------------------------
let audioCtx = null;

export function ensureAudioContext() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch {
    // Sin soporte de AudioContext
  }
}

export function playRestBeep(enabled = true) {
  if (!enabled) return;
  try {
    ensureAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    [0, 0.22].forEach((offset, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 784 : 1046.5, now + offset);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch {
    // Ignorar error de reproducción bloqueada
  }
}

export function triggerVibration(enabled = true) {
  if (!enabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch {}
}

let activeSwRegistration = null;
export function setSwRegistration(reg) {
  activeSwRegistration = reg;
}
export function getSwRegistration() {
  return activeSwRegistration;
}

export async function sendSystemNotification(title, body, enabled = true) {
  if (!enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    // En Android Chrome PWA, showNotification del Service Worker es el método soportado
    const reg = activeSwRegistration || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: 'alphahome-rest',
        renotify: true
      });
      return;
    }
    new Notification(title, { body, silent: false });
  } catch {
    // Fallback silencioso si el SO restringe notificaciones
  }
}

// ---------------------------------------------------------------------------
// Screen Wake Lock (pantalla encendida solo durante sesión activa)
// ---------------------------------------------------------------------------
export const WAKE_LOCK_PREF_KEY = 'alphahome_screen_wake_lock';
let wakeLockSentinel = null;
let wakeLockRequest = null;
let wakeLockActive = false;

export function wakeLockSupported() {
  try {
    return !!(navigator.wakeLock && typeof navigator.wakeLock.request === 'function');
  } catch {
    return false;
  }
}

export function isWakeLockPreferred() {
  try {
    const val = localStorage.getItem(WAKE_LOCK_PREF_KEY);
    return val === null ? true : val === '1';
  } catch {
    return true;
  }
}

export function setWakeLockPreferred(pref) {
  try {
    localStorage.setItem(WAKE_LOCK_PREF_KEY, pref ? '1' : '0');
  } catch {}
}

export function updateWakeLockIndicator(shouldWant) {
  const el = document.getElementById('wake-lock-indicator');
  if (!el) return;
  el.classList.toggle('hidden', !(wakeLockActive && shouldWant));
}

export async function syncWakeLock(activeWorkout) {
  const wants = !!(activeWorkout && !activeWorkout.paused && isWakeLockPreferred());
  if (!wants || document.visibilityState !== 'visible') {
    const sentinel = wakeLockSentinel;
    wakeLockSentinel = null;
    wakeLockActive = false;
    updateWakeLockIndicator(false);
    if (sentinel) {
      try { await sentinel.release(); } catch {}
    }
    return;
  }

  if (!wakeLockSupported() || wakeLockSentinel || wakeLockRequest) {
    updateWakeLockIndicator(wants);
    return;
  }

  wakeLockRequest = (async () => {
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (document.visibilityState !== 'visible') {
        try { await sentinel.release(); } catch {}
        return;
      }
      wakeLockSentinel = sentinel;
      wakeLockActive = true;
      sentinel.addEventListener?.('release', () => {
        if (wakeLockSentinel === sentinel) {
          wakeLockSentinel = null;
          wakeLockActive = false;
          updateWakeLockIndicator(false);
        }
      });
    } catch {
      wakeLockSentinel = null;
      wakeLockActive = false;
    } finally {
      wakeLockRequest = null;
      updateWakeLockIndicator(wants);
    }
  })();
}
