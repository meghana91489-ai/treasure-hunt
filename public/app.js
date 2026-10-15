/**
 * Digital Treasure Hunt - Core Client Application Logic
 * INFOTSAV 2K26 - HACKSPRINT
 */

// ================= GLOBAL CONFIG & SOUND SYNTHESIS =================
const getApiBase = () => {
  if (window.__BACKEND_URL__) return window.__BACKEND_URL__.replace(/\/+$/, '');
  const stored = localStorage.getItem('th_backend_url');
  if (stored) return stored.replace(/\/+$/, '');
  return '';
};
const API_BASE = getApiBase();

// Web Audio API Sound Synthesizer (Zero external audio asset dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playScanSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1040, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (idx * 0.1));
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + (idx * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (idx * 0.1) + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + (idx * 0.1));
        osc.stop(this.ctx.currentTime + (idx * 0.1) + 0.28);
      });
    } catch (e) {}
  }

  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }
}

const sounds = new SoundFX();

// ================= STORAGE & AUTH HELPERS =================
const Auth = {
  getToken: () => localStorage.getItem('th_token'),
  getRole: () => localStorage.getItem('th_role'),
  getTeamName: () => localStorage.getItem('th_team_name'),

  setSession: (token, role, teamName = '') => {
    localStorage.setItem('th_token', token);
    localStorage.setItem('th_role', role);
    if (teamName) localStorage.setItem('th_team_name', teamName);
  },

  clearSession: () => {
    localStorage.removeItem('th_token');
    localStorage.removeItem('th_role');
    localStorage.removeItem('th_team_name');
  },

  isAuthenticated: () => !!localStorage.getItem('th_token'),

  authHeaders: () => {
    const token = localStorage.getItem('th_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }
};

// ================= TOAST NOTIFICATION SYSTEM =================
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto transform transition-all duration-300 translate-y-4 opacity-0 p-4 rounded-xl shadow-2xl flex items-start gap-3 border text-sm';

  let borderColor = 'border-cyan-500/50 bg-[#0c1626]/95 text-cyan-200';
  let iconSvg = `<svg class="w-5 h-5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  if (type === 'success') {
    borderColor = 'border-emerald-500/50 bg-[#071f19]/95 text-emerald-200';
    iconSvg = `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (type === 'error') {
    borderColor = 'border-rose-500/50 bg-[#250d18]/95 text-rose-200';
    iconSvg = `<svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (type === 'warning') {
    borderColor = 'border-amber-500/50 bg-[#241a08]/95 text-amber-200';
    iconSvg = `<svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  }

  toast.className += ` ${borderColor}`;
  toast.innerHTML = `
    ${iconSvg}
    <div class="flex-1 font-medium leading-tight">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition-colors">&times;</button>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  // Auto dismiss
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ================= FORMAT UTILITIES =================
function formatSeconds(sec) {
  if (isNaN(sec) || sec < 0) return '00:00:00';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Celebration Confetti Cannon
function triggerConfetti() {
  if (typeof confetti === 'function') {
    const end = Date.now() + 3.5 * 1000;
    const colors = ['#00f3ff', '#a855f7', '#00ff9d', '#ffffff', '#fbbf24'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }
}

// ================= API WRAPPERS =================
const API = {
  // Auth
  async loginAdmin(username, password) {
    const res = await fetch(`${getApiBase()}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  async loginTeam(teamName, pin) {
    const res = await fetch(`${getApiBase()}/api/auth/team-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, pin })
    });
    return res.json();
  },

  async checkAuth() {
    const res = await fetch(`${getApiBase()}/api/auth/me`, {
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  // Participant Play Loop
  async getCurrentStage() {
    const res = await fetch(`${getApiBase()}/api/play/current-stage`, {
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  async scanQr(qrToken) {
    const res = await fetch(`${getApiBase()}/api/play/scan-qr`, {
      method: 'POST',
      headers: Auth.authHeaders(),
      body: JSON.stringify({ qrToken })
    });
    return res.json();
  },

  async submitPuzzle(answer) {
    const res = await fetch(`${getApiBase()}/api/play/submit-puzzle`, {
      method: 'POST',
      headers: Auth.authHeaders(),
      body: JSON.stringify({ answer })
    });
    return res.json();
  },

  // Leaderboard
  async getLeaderboard() {
    const res = await fetch(`${getApiBase()}/api/leaderboard`);
    return res.json();
  },

  // Admin API
  async getAdminStages() {
    const res = await fetch(`${getApiBase()}/api/admin/stages`, {
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  async createStage(data) {
    const res = await fetch(`${getApiBase()}/api/admin/stages`, {
      method: 'POST',
      headers: Auth.authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateStage(id, data) {
    const res = await fetch(`${getApiBase()}/api/admin/stages/${id}`, {
      method: 'PUT',
      headers: Auth.authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteStage(id) {
    const res = await fetch(`${getApiBase()}/api/admin/stages/${id}`, {
      method: 'DELETE',
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  async getAdminTeams() {
    const res = await fetch(`${getApiBase()}/api/admin/teams`, {
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  async resetTeam(id) {
    const res = await fetch(`${getApiBase()}/api/admin/teams/${id}/reset`, {
      method: 'POST',
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  async resetAllTeams() {
    const res = await fetch(`${getApiBase()}/api/admin/teams/reset-all`, {
      method: 'POST',
      headers: Auth.authHeaders()
    });
    return res.json();
  },

  async updateLiveLocation(locationData) {
    const res = await fetch(`${getApiBase()}/api/play/update-location`, {
      method: 'POST',
      headers: Auth.authHeaders(),
      body: JSON.stringify(locationData)
    });
    return res.json();
  }
};

// ================= THEME MANAGER (DARK / LIGHT MODE) =================
const Theme = {
  getTheme() {
    return localStorage.getItem('th_theme') || 'dark';
  },

  setTheme(theme) {
    localStorage.setItem('th_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    }
    this.updateToggleIcons(theme);
  },

  toggle() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    sounds.playClick();
    return next;
  },

  init() {
    const saved = this.getTheme();
    this.setTheme(saved);
    // Wire all theme toggle buttons
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.removeEventListener('click', this._clickHandler);
      this._clickHandler = () => this.toggle();
      btn.addEventListener('click', this._clickHandler);
    });
  },

  updateToggleIcons(theme) {
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
      if (theme === 'light') {
        icon.innerHTML = `<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
      } else {
        icon.innerHTML = `<svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
      }
    });
  }
};

// ================= BACKEND URL SWITCHER (FOR VERCEL + RENDER) =================
const BackendConfig = {
  get() {
    return localStorage.getItem('th_backend_url') || '';
  },
  set(url) {
    if (!url) {
      localStorage.removeItem('th_backend_url');
    } else {
      localStorage.setItem('th_backend_url', url.trim().replace(/\/+$/, ''));
    }
  },
  async testConnection(url) {
    try {
      const target = (url || '').trim().replace(/\/+$/, '');
      const res = await fetch(`${target}/api/leaderboard`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return { success: true, huntName: data.huntName || 'Connected' };
      }
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e) {
      return { success: false, error: e.message || 'Network error (CORS or server unreachable)' };
    }
  },
  showModal() {
    let modal = document.getElementById('th-backend-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'th-backend-modal';
      modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm';
      modal.innerHTML = `
        <div class="glass-card bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌐</span>
              <h3 class="font-bold text-lg text-cyan-300">Backend Server Settings</h3>
            </div>
            <button id="th-backend-modal-close" class="text-slate-400 hover:text-white text-lg p-1">&times;</button>
          </div>
          <div class="mt-4 text-xs text-slate-300 space-y-2">
            <p>If you deployed your backend to <strong class="text-purple-400">Render</strong> and your frontend to <strong class="text-cyan-400">Vercel</strong>, enter your Render Web Service URL below:</p>
            <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
              Example: <span class="text-cyan-400">https://treasure-hunt-backend.onrender.com</span>
            </div>
          </div>
          <div class="mt-4">
            <label class="block text-xs font-semibold text-slate-400 mb-1">Render Backend URL</label>
            <input type="text" id="th-backend-input" placeholder="https://your-service.onrender.com (leave blank for localhost)" 
              class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400" />
            <div id="th-backend-status-msg" class="text-xs mt-2 min-h-[1.25rem]"></div>
          </div>
          <div class="mt-5 flex gap-2 justify-end">
            <button id="th-backend-clear-btn" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Clear</button>
            <button id="th-backend-test-btn" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30">Test Connection</button>
            <button id="th-backend-save-btn" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-lg shadow-cyan-400/20">Save & Reload</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('th-backend-modal-close').onclick = () => modal.classList.add('hidden');
      document.getElementById('th-backend-clear-btn').onclick = () => {
        document.getElementById('th-backend-input').value = '';
        BackendConfig.set('');
        showToast('Backend URL reset to default (localhost / same-origin)', 'info');
        setTimeout(() => window.location.reload(), 800);
      };
      document.getElementById('th-backend-test-btn').onclick = async () => {
        const val = document.getElementById('th-backend-input').value.trim();
        const msg = document.getElementById('th-backend-status-msg');
        msg.className = 'text-xs mt-2 text-cyan-400 animate-pulse';
        msg.textContent = 'Testing connection to server...';
        const res = await BackendConfig.testConnection(val);
        if (res.success) {
          msg.className = 'text-xs mt-2 text-emerald-400 font-semibold';
          msg.textContent = `✅ Connected successfully! (${res.huntName})`;
        } else {
          msg.className = 'text-xs mt-2 text-rose-400';
          msg.textContent = `❌ Connection failed: ${res.error}`;
        }
      };
      document.getElementById('th-backend-save-btn').onclick = async () => {
        const val = document.getElementById('th-backend-input').value.trim();
        BackendConfig.set(val);
        showToast('Backend URL saved! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 600);
      };
    }
    const input = document.getElementById('th-backend-input');
    if (input) input.value = BackendConfig.get();
    modal.classList.remove('hidden');
  },
  initBadge() {
    if (document.getElementById('th-backend-pill')) return;
    const pill = document.createElement('div');
    pill.id = 'th-backend-pill';
    pill.className = 'fixed bottom-3 right-3 z-[9000] flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono cursor-pointer transition-all bg-slate-900/90 border border-slate-700/80 text-slate-300 shadow-lg hover:border-cyan-400 hover:text-cyan-300 backdrop-blur';
    const current = BackendConfig.get();
    const isCustom = Boolean(current);
    pill.innerHTML = `
      <span class="w-2 h-2 rounded-full ${isCustom ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'}"></span>
      <span>${isCustom ? 'Render: ' + current.replace(/^https?:\/\//, '').slice(0, 15) + '...' : 'API: ' + (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Local' : 'Same-Origin')}</span>
      <span class="text-slate-400 hover:text-cyan-300 ml-1">⚙️</span>
    `;
    pill.title = 'Click to configure Backend URL (Render / Vercel)';
    pill.onclick = () => BackendConfig.showModal();
    document.body.appendChild(pill);
  }
};

// Auto-run theme and backend pill on DOM load
const initApp = () => {
  Theme.init();
  BackendConfig.initBadge();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.TreasureHunt = {
  Auth,
  API,
  Theme,
  BackendConfig,
  sounds,
  showToast,
  formatSeconds,
  triggerConfetti
};
