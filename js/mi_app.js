// ============================================================
// mi_app.js – Main controller for Machine Info system
// ============================================================

import {
  DEMO_USERS, getCurrentUser, setCurrentUser, clearCurrentUser, seedIfNeeded,
} from './mi_state.js';
import { initInstallationScreens, renderInstallationList } from './mi_installation.js';
import { initMaintenanceScreens, renderMaintenanceList, renderReview, renderApproval } from './mi_maintenance.js';
import { initReportScreen, renderReport } from './mi_report.js';
import { initServiceScreens, renderServiceList } from './mi_service.js';

// ---- Seed demo data on first load ----
seedIfNeeded();

// ---- DOM refs ----
const loginOverlay = document.getElementById('mi-login');
const appMain      = document.getElementById('mi-app');
const loginSelect  = document.getElementById('mi-login-select');
const btnLogin     = document.getElementById('mi-btn-login');
const btnLogout    = document.getElementById('mi-btn-logout');
const userDisplay  = document.getElementById('mi-user-display');
const loginError   = document.getElementById('mi-login-error');
const navBtns      = document.querySelectorAll('.mi-nav-btn');

// ---- Populate login user list ----
DEMO_USERS.forEach(u => {
  const opt = document.createElement('option');
  opt.value = u.user_id;
  opt.textContent = `${u.user_name}  [${u.role}]`;
  loginSelect.appendChild(opt);
});

// ---- Login ----
btnLogin.addEventListener('click', () => {
  const uid = loginSelect.value;
  if (!uid) {
    loginError.textContent = 'ユーザーを選択してください';
    loginError.style.display = 'block';
    return;
  }
  const user = DEMO_USERS.find(u => u.user_id === uid);
  setCurrentUser(user);
  _showApp(user);
});

// ---- Logout ----
btnLogout.addEventListener('click', () => {
  clearCurrentUser();
  loginSelect.value = '';
  loginError.style.display = 'none';
  loginOverlay.classList.remove('hidden');
  appMain.classList.add('hidden');
});

// ---- Resume session if already logged in ----
const existingUser = getCurrentUser();
if (existingUser) {
  _showApp(existingUser);
} else {
  loginOverlay.classList.remove('hidden');
  appMain.classList.add('hidden');
}

function _showApp(user) {
  loginOverlay.classList.add('hidden');
  appMain.classList.remove('hidden');
  userDisplay.textContent = user.user_name;

  // Role-based element visibility
  document.querySelectorAll('.mi-hq-only').forEach(el =>
    el.classList.toggle('hidden', user.role !== 'hq_staff')
  );

  // Init screens
  initInstallationScreens();
  initMaintenanceScreens();
  initReportScreen();
  initServiceScreens();

  // Default screen
  navigateTo('installation-list');
}

// ---- Navigation ----
navBtns.forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
});

export function navigateTo(screen) {
  document.querySelectorAll('.mi-screen').forEach(s => s.classList.remove('mi-active'));
  const target = document.getElementById(`mi-screen-${screen}`);
  if (target) target.classList.add('mi-active');

  navBtns.forEach(btn =>
    btn.classList.toggle('active', btn.dataset.nav === screen)
  );

  // Trigger screen-specific render
  if (screen === 'installation-list')  renderInstallationList();
  if (screen === 'maintenance-list')   renderMaintenanceList();
  if (screen === 'review')             renderReview();
  if (screen === 'approval')           renderApproval();
  if (screen === 'report')             renderReport();
  if (screen === 'service-list')       renderServiceList();
}

// ---- Show a specific screen (for sub-screens / forms) ----
export function showScreen(screenId) {
  document.querySelectorAll('.mi-screen').forEach(s => s.classList.remove('mi-active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('mi-active');
}

// ---- Toast notification ----
export function toast(msg, type = 'success') {
  const el = document.getElementById('mi-toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `mi-toast mi-toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3200);
}
