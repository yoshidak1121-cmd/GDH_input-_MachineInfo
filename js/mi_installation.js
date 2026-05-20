// ============================================================
// mi_installation.js – Installation base list + form screens
// ============================================================

import {
  getCurrentUser,
  getInstallations, getInstallation, saveInstallation, deleteInstallation,
  validateInstallation, fmt, fmtNum, fmtDate, htmlEsc,
} from './mi_state.js';
import { showScreen, toast } from './mi_app.js';

let _initiated = false;

export function initInstallationScreens() {
  if (_initiated) return;
  _initiated = true;

  document.getElementById('mi-btn-add-installation')
    ?.addEventListener('click', () => _openForm(null));

  document.getElementById('mi-btn-export-installation')
    ?.addEventListener('click', _exportCSV);

  document.getElementById('mi-inst-btn-search')
    ?.addEventListener('click', renderInstallationList);

  document.getElementById('mi-inst-btn-clear')
    ?.addEventListener('click', () => {
      _q('mi-inst-filter-site').value        = '';
      _q('mi-inst-filter-country').value     = '';
      _q('mi-inst-filter-year').value        = '';
      _q('mi-inst-filter-granularity').value = '';
      renderInstallationList();
    });

  document.getElementById('mi-inst-form-back')
    ?.addEventListener('click', () => {
      showScreen('mi-screen-installation-list');
      renderInstallationList();
    });

  document.getElementById('mi-inst-form-cancel')
    ?.addEventListener('click', () => showScreen('mi-screen-installation-list'));

  document.getElementById('mi-inst-form-save')
    ?.addEventListener('click', _saveForm);
}

// ---- List ----
export function renderInstallationList() {
  const user = getCurrentUser();
  if (!user) return;

  let records = getInstallations();

  // site_staff sees only their own site
  if (user.role === 'site_staff') {
    records = records.filter(r => r.site_code === user.site_code);
  }

  // Apply search filters
  const fSite        = _q('mi-inst-filter-site')?.value.trim().toLowerCase();
  const fCountry     = _q('mi-inst-filter-country')?.value.trim().toLowerCase();
  const fYear        = _q('mi-inst-filter-year')?.value;
  const fGranularity = _q('mi-inst-filter-granularity')?.value;

  if (fSite)        records = records.filter(r => r.site_code?.toLowerCase().includes(fSite));
  if (fCountry)     records = records.filter(r => r.country?.toLowerCase().includes(fCountry));
  if (fYear)        records = records.filter(r => Number(r.install_year) === Number(fYear));
  if (fGranularity) records = records.filter(r => r.data_granularity === fGranularity);

  const tbody = document.getElementById('mi-inst-tbody');
  const empty = document.getElementById('mi-inst-empty');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${htmlEsc(fmt(r.site_code))}</td>
      <td>${htmlEsc(fmt(r.country))}</td>
      <td>${htmlEsc(fmt(r.area, '-'))}</td>
      <td>${htmlEsc(fmt(r.install_year))}</td>
      <td><span class="mi-badge mi-badge-granularity-${htmlEsc((r.data_granularity || '').toLowerCase())}">${htmlEsc(fmt(r.data_granularity))}</span></td>
      <td>${htmlEsc(fmt(r.machine_builder, '-'))}</td>
      <td>${htmlEsc(fmt(r.nc_series, '-'))}</td>
      <td class="mi-num">${htmlEsc(fmtNum(r.installed_count))}</td>
      <td>${htmlEsc(fmt(r.installed_count_accuracy, '-'))}</td>
      <td>${r.primary_flag ? '<strong>✓ TRUE</strong>' : 'FALSE'}</td>
      <td>${htmlEsc(fmtDate(r.updated_at))}</td>
      <td>
        <div class="mi-row-actions">
          <button class="mi-btn-sm" onclick="window.__miInstEdit('${htmlEsc(r.base_id)}')">編集</button>
          ${user.role === 'hq_staff'
            ? `<button class="mi-btn-sm mi-btn-danger" onclick="window.__miInstDelete('${htmlEsc(r.base_id)}')">削除</button>`
            : ''}
        </div>
      </td>
    </tr>
  `).join('');

  window.__miInstEdit = id => _openForm(id);
  window.__miInstDelete = id => {
    if (!confirm('この設置データを削除しますか？\n関連する稼働台数データも削除されます。')) return;
    deleteInstallation(id);
    renderInstallationList();
    toast('削除しました');
  };
}

// ---- Form open ----
function _openForm(base_id) {
  const form   = document.getElementById('mi-inst-form');
  const title  = document.getElementById('mi-inst-form-title');
  const msgBox = document.getElementById('mi-inst-form-msg');

  msgBox.innerHTML = '';
  msgBox.classList.add('hidden');

  if (base_id) {
    const rec = getInstallation(base_id);
    if (!rec) return;
    title.textContent = '設置データ編集';
    _fv(form, 'base_id',                  rec.base_id);
    _fv(form, 'site_code',                rec.site_code || '');
    _fv(form, 'country',                  rec.country || '');
    _fv(form, 'area',                     rec.area || '');
    _fv(form, 'install_year',             rec.install_year ?? '');
    _fv(form, 'data_granularity',         rec.data_granularity || '');
    _fv(form, 'machine_builder',          rec.machine_builder || '');
    _fv(form, 'nc_series',                rec.nc_series || '');
    _fv(form, 'installed_count',          rec.installed_count ?? '');
    _fv(form, 'installed_count_accuracy', rec.installed_count_accuracy || '');
    _fv(form, 'primary_flag',             rec.primary_flag ? 'true' : 'false');
    _fv(form, 'source_file_name',         rec.source_file_name || '');
    _fv(form, 'source_note',              rec.source_note || '');
    _fv(form, 'note',                     rec.note || '');
  } else {
    title.textContent = '設置データ登録';
    form.reset();
    _fv(form, 'base_id', '');
    // Pre-fill site code for site_staff
    const user = getCurrentUser();
    if (user?.role === 'site_staff') {
      _fv(form, 'site_code', user.site_code);
    }
  }

  showScreen('mi-screen-installation-form');
}

// ---- Save ----
function _saveForm() {
  const form   = document.getElementById('mi-inst-form');
  const msgBox = document.getElementById('mi-inst-form-msg');

  const rawBaseId = _fget(form, 'base_id');
  const rec = {
    base_id:                  rawBaseId || null,
    site_code:                _fget(form, 'site_code').trim(),
    country:                  _fget(form, 'country').trim(),
    area:                     _fget(form, 'area').trim(),
    install_year:             Number(_fget(form, 'install_year')),
    data_granularity:         _fget(form, 'data_granularity'),
    machine_builder:          _fget(form, 'machine_builder').trim(),
    nc_series:                _fget(form, 'nc_series').trim(),
    installed_count:          Number(_fget(form, 'installed_count')),
    installed_count_accuracy: _fget(form, 'installed_count_accuracy'),
    primary_flag:             _fget(form, 'primary_flag') === 'true',
    source_file_name:         _fget(form, 'source_file_name').trim(),
    source_note:              _fget(form, 'source_note').trim(),
    note:                     _fget(form, 'note').trim(),
  };

  const errors = validateInstallation(rec);
  if (errors.length > 0) {
    msgBox.innerHTML = errors.map(e => `<p class="mi-msg-error">⚠ ${e}</p>`).join('');
    msgBox.classList.remove('hidden');
    return;
  }

  saveInstallation(rec);
  toast(rawBaseId ? '設置データを更新しました' : '設置データを登録しました');
  showScreen('mi-screen-installation-list');
  renderInstallationList();
}

// ---- CSV export ----
function _exportCSV() {
  const user = getCurrentUser();
  let records = getInstallations();
  if (user?.role === 'site_staff') {
    records = records.filter(r => r.site_code === user.site_code);
  }

  const cols = [
    'base_id','site_code','country','area','install_year','data_granularity',
    'machine_builder','nc_series','installed_count','installed_count_accuracy',
    'primary_flag','source_file_name','source_note','note','created_at','updated_at',
  ];
  _downloadCSV(_buildCSV(records, cols), 'installation_base.csv');
}

// ---- Helpers ----
function _q(id) { return document.getElementById(id); }
function _fv(form, name, val) {
  const el = form.querySelector(`[name="${name}"]`);
  if (el) el.value = val;
}
function _fget(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  return el ? el.value : '';
}

export function _buildCSV(rows, cols) {
  const escape = v => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');
}

export function _downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
