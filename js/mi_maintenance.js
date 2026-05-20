// ============================================================
// mi_maintenance.js – Active maintenance, review, and approval screens
// ============================================================

import {
  getCurrentUser,
  getInstallations, getInstallation,
  getMaintenances, getMaintenance, saveMaintenance, deleteMaintenance,
  getPreviousActiveCount, calcDerived, validateMaintenance,
  saveIssue, getLatestIssue,
  fmt, fmtNum, fmtPct, fmtDate, statusClass, htmlEsc,
} from './mi_state.js';
import { showScreen, toast } from './mi_app.js';
import { _buildCSV, _downloadCSV } from './mi_installation.js';

let _initiated = false;
let _returnTargetIds = [];

// ================================================================
// Init (register event listeners once)
// ================================================================
export function initMaintenanceScreens() {
  if (_initiated) return;
  _initiated = true;

  // --- Maintenance list ---
  _on('mi-btn-add-maintenance',   () => _openForm(null));
  _on('mi-btn-export-maintenance', _exportCSV);
  _on('mi-maint-btn-search',       renderMaintenanceList);
  _on('mi-maint-btn-clear', () => {
    _val('mi-maint-filter-site',   '');
    _val('mi-maint-filter-year',   '');
    _val('mi-maint-filter-status', '');
    _q('mi-maint-filter-errors').checked = false;
    renderMaintenanceList();
  });

  // --- Maintenance form ---
  _on('mi-maint-form-back', () => {
    showScreen('mi-screen-maintenance-list');
    renderMaintenanceList();
  });
  _on('mi-maint-form-cancel', () => showScreen('mi-screen-maintenance-list'));
  _on('mi-maint-form-draft',  () => _saveForm('Draft'));
  _on('mi-maint-form-save',   () => _saveForm('save'));

  _q('mi-mf-base-select')?.addEventListener('change', _onBaseSelect);
  _q('mi-maint-form')?.querySelector('[name="active_count"]')
    ?.addEventListener('input', _updateDerived);
  _q('mi-maint-form')?.querySelector('[name="report_year"]')
    ?.addEventListener('change', _onReportYearChange);

  // --- Review ---
  _on('mi-btn-submit-all', _submitSelected);
  _on('mi-review-check-all', e => {
    document.querySelectorAll('.mi-review-check:not(:disabled)')
      .forEach(cb => { cb.checked = e.target.checked; });
  });

  // --- Approval ---
  _on('mi-btn-approve-selected', _approveSelected);
  _on('mi-btn-return-selected',  () => _openReturnModal(null));
  _on('mi-appr-btn-search',       renderApproval);
  _on('mi-appr-btn-clear', () => {
    _val('mi-appr-filter-site',   '');
    _val('mi-appr-filter-year',   '');
    _val('mi-appr-filter-status', '');
    renderApproval();
  });
  _on('mi-appr-check-all', e => {
    document.querySelectorAll('.mi-appr-check')
      .forEach(cb => { cb.checked = e.target.checked; });
  });

  // --- Return modal ---
  _on('mi-return-cancel',  _closeReturnModal);
  _on('mi-return-confirm', _confirmReturn);
  _on('mi-modal-backdrop', _closeReturnModal);
}

// ================================================================
// Maintenance List
// ================================================================
export function renderMaintenanceList() {
  const user = getCurrentUser();
  if (!user) return;

  const installations = getInstallations();
  let records = getMaintenances();

  if (user.role === 'site_staff') {
    const myIds = new Set(installations.filter(i => i.site_code === user.site_code).map(i => i.base_id));
    records = records.filter(r => myIds.has(r.base_id));
  }

  // Filters
  const fSite   = _q('mi-maint-filter-site')?.value.trim().toLowerCase();
  const fYear   = _q('mi-maint-filter-year')?.value;
  const fStatus = _q('mi-maint-filter-status')?.value;
  const fErrors = _q('mi-maint-filter-errors')?.checked;

  if (fSite) {
    const siteBaseIds = new Set(installations.filter(i => i.site_code?.toLowerCase().includes(fSite)).map(i => i.base_id));
    records = records.filter(r => siteBaseIds.has(r.base_id));
  }
  if (fYear)   records = records.filter(r => Number(r.report_year) === Number(fYear));
  if (fStatus) records = records.filter(r => r.status === fStatus);
  if (fErrors) records = records.filter(r => {
    const inst = installations.find(i => i.base_id === r.base_id);
    return validateMaintenance(r, inst).length > 0;
  });

  const tbody = _q('mi-maint-tbody');
  const empty = _q('mi-maint-empty');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = records.map(r => {
    const inst   = installations.find(i => i.base_id === r.base_id);
    const errors = validateMaintenance(r, inst);
    const hasErr = errors.length > 0;
    const editable = !['Approved', 'Locked'].includes(r.status);

    const diffStr = r.difference_from_previous !== null
      ? (r.difference_from_previous > 0 ? '+' : '') + fmtNum(r.difference_from_previous)
        + ' (' + fmtPct(r.difference_rate) + ')'
      : '-';
    const diffClass = r.difference_from_previous < 0 ? 'mi-neg' : (r.difference_from_previous > 0 ? 'mi-pos' : '');

    return `
      <tr class="${hasErr ? 'mi-row-error' : r.status === 'Returned' ? 'mi-row-returned' : ''}">
        <td>${htmlEsc(fmt(inst?.site_code))}</td>
        <td>${htmlEsc(fmt(inst?.country))}</td>
        <td>${htmlEsc(fmt(inst?.install_year))}</td>
        <td>${htmlEsc(fmt(inst?.machine_builder, '-'))}</td>
        <td>${htmlEsc(fmt(r.report_year))}</td>
        <td class="mi-num">${htmlEsc(fmtNum(inst?.installed_count))}</td>
        <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
        <td class="mi-num">${htmlEsc(fmtNum(r.inactive_count))}</td>
        <td>${htmlEsc(fmtPct(r.active_rate))}</td>
        <td class="${htmlEsc(diffClass)}">${htmlEsc(diffStr)}</td>
        <td>${htmlEsc(fmt(r.active_count_accuracy, '-'))}</td>
        <td><span class="mi-status-badge ${htmlEsc(statusClass(r.status))}">${htmlEsc(r.status)}</span>${hasErr ? ' ⚠' : ''}</td>
        <td>${htmlEsc(fmtDate(r.updated_at))}</td>
        <td>
          <div class="mi-row-actions">
            ${editable ? `<button class="mi-btn-sm" onclick="window.__miMaintEdit('${htmlEsc(r.maintenance_id)}')">編集</button>` : ''}
            ${editable
              ? `<button class="mi-btn-sm mi-btn-danger" onclick="window.__miMaintDelete('${htmlEsc(r.maintenance_id)}')">削除</button>`
              : ''}
          </div>
        </td>
      </tr>`;
  }).join('');

  window.__miMaintEdit   = id => _openForm(id);
  window.__miMaintDelete = id => {
    if (!confirm('この稼働台数データを削除しますか？')) return;
    deleteMaintenance(id);
    renderMaintenanceList();
    toast('削除しました');
  };
}

// ================================================================
// Maintenance Form
// ================================================================
function _openForm(maintenance_id) {
  const user    = getCurrentUser();
  const form    = _q('mi-maint-form');
  const title   = _q('mi-maint-form-title');
  const msgBox  = _q('mi-maint-form-msg');
  const baseSel = _q('mi-mf-base-select');

  msgBox.innerHTML = '';
  msgBox.classList.add('hidden');

  // Populate installation select (filtered by site for site_staff)
  let installations = getInstallations();
  if (user?.role === 'site_staff') {
    installations = installations.filter(i => i.site_code === user.site_code);
  }
  baseSel.innerHTML = '<option value="">-- 設置データを選択してください --</option>';
  installations.forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.base_id;
    opt.textContent =
      `[${i.site_code}] ${i.country} ${i.install_year}年 ${i.data_granularity}`
      + (i.machine_builder ? ' / ' + i.machine_builder : '')
      + (i.nc_series       ? ' / ' + i.nc_series       : '')
      + ` (${i.installed_count}台)`;
    baseSel.appendChild(opt);
  });

  if (maintenance_id) {
    const rec = getMaintenance(maintenance_id);
    if (!rec) return;
    title.textContent = '稼働台数編集';

    _fv(form, 'maintenance_id',       rec.maintenance_id);
    _fv(form, 'base_id',              rec.base_id);
    baseSel.value = rec.base_id;
    _displayInstInfo(rec.base_id);

    _fv(form, 'report_year',          rec.report_year ?? '');
    _fv(form, 'previous_active_count',rec.previous_active_count ?? '');
    _fv(form, 'active_count',         rec.active_count ?? '');
    _fv(form, 'inactive_count',       rec.inactive_count ?? '');
    _fv(form, 'active_rate',          rec.active_rate != null ? fmtPct(rec.active_rate) : '');
    _fv(form, 'difference_from_previous', rec.difference_from_previous ?? '');
    _fv(form, 'difference_rate',      rec.difference_rate != null ? fmtPct(rec.difference_rate) : '');
    _fv(form, 'active_count_method',  rec.active_count_method || '');
    _fv(form, 'active_count_accuracy',rec.active_count_accuracy || '');
    _fv(form, 'status_confirmed_date',rec.status_confirmed_date || '');
    _fv(form, 'confirmed_by',         rec.confirmed_by || '');
    _fv(form, 'change_reason',        rec.change_reason || '');
    _fv(form, 'note',                 rec.note || '');

    // Show latest return comment if any
    const issue = getLatestIssue(maintenance_id);
    if (issue && rec.status === 'Returned') {
      msgBox.innerHTML = `<p class="mi-msg-warning">⚠ 差戻しコメント: ${htmlEsc(issue.issue_detail)}</p>`;
      msgBox.classList.remove('hidden');
    }
  } else {
    title.textContent = '稼働台数登録';
    form.reset();
    _fv(form, 'maintenance_id', '');
    _fv(form, 'base_id', '');
    _clearInstDisplay();
  }

  showScreen('mi-screen-maintenance-form');
}

function _onBaseSelect() {
  const base_id = _q('mi-mf-base-select').value;
  _fv(_q('mi-maint-form'), 'base_id', base_id);
  _displayInstInfo(base_id);
  _updateDerived();
}

function _displayInstInfo(base_id) {
  const inst = getInstallation(base_id);
  if (!inst) { _clearInstDisplay(); return; }
  _set('mi-mf-site-code',      inst.site_code      || '');
  _set('mi-mf-country',        inst.country        || '');
  _set('mi-mf-install-year',   inst.install_year   ?? '');
  _set('mi-mf-machine-builder',inst.machine_builder|| '-');
  _set('mi-mf-nc-series',      inst.nc_series      || '-');
  _set('mi-mf-installed-count',inst.installed_count ?? '');
}
function _clearInstDisplay() {
  ['mi-mf-site-code','mi-mf-country','mi-mf-install-year',
   'mi-mf-machine-builder','mi-mf-nc-series','mi-mf-installed-count']
    .forEach(id => _set(id, ''));
}

function _onReportYearChange() {
  const form       = _q('mi-maint-form');
  const base_id    = _fget(form, 'base_id');
  const report_year = Number(_fget(form, 'report_year'));
  const maint_id   = _fget(form, 'maintenance_id');

  if (base_id && report_year && !maint_id) {
    // Auto-fill previous_active_count only for new records
    const prev = getPreviousActiveCount(base_id, report_year);
    _fv(form, 'previous_active_count', prev !== null ? prev : '');
  }
  _updateDerived();
}

function _updateDerived() {
  const form       = _q('mi-maint-form');
  const base_id    = _fget(form, 'base_id');
  const inst       = getInstallation(base_id);
  const active     = _fget(form, 'active_count');
  const prev       = _fget(form, 'previous_active_count');
  const installed  = inst?.installed_count;

  if (active === '' || installed === undefined || installed === null) return;

  const d = calcDerived(active, installed, prev !== '' ? prev : null);

  _fv(form, 'inactive_count',         d.inactive_count ?? '');
  _fv(form, 'active_rate',            d.active_rate != null ? fmtPct(d.active_rate) : '');
  _fv(form, 'difference_from_previous', d.difference_from_previous ?? '');
  _fv(form, 'difference_rate',        d.difference_rate != null ? fmtPct(d.difference_rate) : '');

  // Highlight change_reason label if ±20%
  const label = _q('mi-mf-change-reason-label');
  if (d.difference_rate !== null && Math.abs(d.difference_rate) >= 0.2) {
    label?.classList.add('mi-req-highlight');
  } else {
    label?.classList.remove('mi-req-highlight');
  }
}

function _saveForm(mode) {
  const form   = _q('mi-maint-form');
  const msgBox = _q('mi-maint-form-msg');
  const base_id = _fget(form, 'base_id');
  const inst    = getInstallation(base_id);

  const parseRate = s => {
    if (!s) return null;
    const n = parseFloat(String(s).replace('%', '')) / 100;
    return isNaN(n) ? null : n;
  };
  const parseNum = s => (s === '' || s === null || s === undefined) ? null : Number(s);

  const existingId = _fget(form, 'maintenance_id') || null;
  const existing   = existingId ? getMaintenance(existingId) : null;

  const rec = {
    maintenance_id:         existingId,
    base_id,
    report_year:            Number(_fget(form, 'report_year')),
    previous_active_count:  parseNum(_fget(form, 'previous_active_count')),
    active_count:           Number(_fget(form, 'active_count')),
    inactive_count:         parseNum(_fget(form, 'inactive_count')),
    active_rate:            parseRate(_fget(form, 'active_rate')),
    difference_from_previous: parseNum(_fget(form, 'difference_from_previous')),
    difference_rate:        parseRate(_fget(form, 'difference_rate')),
    active_count_method:    _fget(form, 'active_count_method'),
    active_count_accuracy:  _fget(form, 'active_count_accuracy'),
    status_confirmed_date:  _fget(form, 'status_confirmed_date'),
    confirmed_by:           _fget(form, 'confirmed_by').trim(),
    change_reason:          _fget(form, 'change_reason').trim(),
    note:                   _fget(form, 'note').trim(),
    status: mode === 'Draft'
      ? 'Draft'
      : (existing?.status && existing.status !== 'Returned' ? existing.status : 'Draft'),
    submitted_at: existing?.submitted_at || '',
  };

  const errors = validateMaintenance(rec, inst);

  if (errors.length > 0 && mode !== 'Draft') {
    msgBox.innerHTML = errors.map(e => `<p class="mi-msg-error">⚠ ${htmlEsc(e)}</p>`).join('');
    msgBox.classList.remove('hidden');
    return;
  }

  saveMaintenance(rec);

  if (mode === 'Draft') {
    if (errors.length > 0) {
      msgBox.innerHTML =
        `<p class="mi-msg-warning">⚠ 下書き保存しました。以下の問題があります：</p>`
        + errors.map(e => `<p class="mi-msg-warning">• ${htmlEsc(e)}</p>`).join('');
      msgBox.classList.remove('hidden');
    } else {
      toast('下書きとして保存しました');
      showScreen('mi-screen-maintenance-list');
      renderMaintenanceList();
    }
  } else {
    toast(existingId ? '更新しました' : '登録しました');
    showScreen('mi-screen-maintenance-list');
    renderMaintenanceList();
  }
}

// ================================================================
// Review Screen
// ================================================================
export function renderReview() {
  const user = getCurrentUser();
  if (!user) return;

  const installations = getInstallations();
  let records = getMaintenances();

  if (user.role === 'site_staff') {
    const myIds = new Set(installations.filter(i => i.site_code === user.site_code).map(i => i.base_id));
    records = records.filter(r => myIds.has(r.base_id));
  }

  // Show Draft and Returned items for submission
  records = records.filter(r => ['Draft', 'Returned'].includes(r.status));

  const tbody = _q('mi-review-tbody');
  const empty = _q('mi-review-empty');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = records.map(r => {
    const inst   = installations.find(i => i.base_id === r.base_id);
    const errors = validateMaintenance(r, inst);
    const hasErr = errors.length > 0;
    const issue  = getLatestIssue(r.maintenance_id);

    return `
      <tr class="${hasErr ? 'mi-row-error' : r.status === 'Returned' ? 'mi-row-returned' : ''}">
        <td><input type="checkbox" class="mi-review-check" data-id="${htmlEsc(r.maintenance_id)}"
          ${hasErr ? 'disabled title="エラーがあるため提出できません"' : ''}></td>
        <td>${htmlEsc(fmt(inst?.site_code))}</td>
        <td>${htmlEsc(fmt(inst?.install_year))}</td>
        <td>${htmlEsc(fmt(inst?.machine_builder, '-'))}</td>
        <td>${htmlEsc(fmt(r.report_year))}</td>
        <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
        <td>${htmlEsc(fmtPct(r.active_rate))}</td>
        <td><span class="mi-status-badge ${htmlEsc(statusClass(r.status))}">${htmlEsc(r.status)}</span></td>
        <td class="mi-return-comment">${issue ? htmlEsc(issue.issue_detail) : '-'}</td>
        <td>
          <div class="mi-row-actions">
            ${hasErr
              ? `<span class="mi-error-hint" title="${htmlEsc(errors.join('\n'))}">⚠ ${errors.length}件エラー</span>`
              : ''}
            <button class="mi-btn-sm" onclick="window.__miMaintEditReview('${htmlEsc(r.maintenance_id)}')">編集</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  window.__miMaintEditReview = id => _openForm(id);
}

function _submitSelected() {
  const checks = document.querySelectorAll('.mi-review-check:checked');
  if (checks.length === 0) {
    toast('提出する項目を選択してください', 'error');
    return;
  }
  const user = getCurrentUser();
  const ids  = Array.from(checks).map(cb => cb.dataset.id);
  ids.forEach(id => {
    const rec = getMaintenance(id);
    if (rec) {
      rec.status       = 'Submitted';
      rec.submitted_at = new Date().toISOString();
      rec.submitted_by = user?.user_name;
      saveMaintenance(rec);
    }
  });
  toast(`${ids.length} 件を提出しました`);
  renderReview();
}

// ================================================================
// Approval Screen (HQ only)
// ================================================================
export function renderApproval() {
  const user = getCurrentUser();
  if (user?.role !== 'hq_staff') return;

  const installations = getInstallations();
  let records = getMaintenances();

  const fSite   = _q('mi-appr-filter-site')?.value.trim().toLowerCase();
  const fYear   = _q('mi-appr-filter-year')?.value;
  const fStatus = _q('mi-appr-filter-status')?.value;

  if (fSite) {
    const siteBaseIds = new Set(installations.filter(i => i.site_code?.toLowerCase().includes(fSite)).map(i => i.base_id));
    records = records.filter(r => siteBaseIds.has(r.base_id));
  }
  if (fYear)   records = records.filter(r => Number(r.report_year) === Number(fYear));

  // Default: show Submitted / Under Review
  if (fStatus) {
    records = records.filter(r => r.status === fStatus);
  } else {
    records = records.filter(r => ['Submitted', 'Under Review'].includes(r.status));
  }

  const tbody = _q('mi-appr-tbody');
  const empty = _q('mi-appr-empty');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = records.map(r => {
    const inst = installations.find(i => i.base_id === r.base_id);
    return `
      <tr>
        <td><input type="checkbox" class="mi-appr-check" data-id="${htmlEsc(r.maintenance_id)}"></td>
        <td>${htmlEsc(fmt(inst?.site_code))}</td>
        <td>${htmlEsc(fmt(inst?.country))}</td>
        <td>${htmlEsc(fmt(inst?.install_year))}</td>
        <td>${htmlEsc(fmt(inst?.machine_builder, '-'))}</td>
        <td>${htmlEsc(fmt(r.report_year))}</td>
        <td class="mi-num">${htmlEsc(fmtNum(inst?.installed_count))}</td>
        <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
        <td>${htmlEsc(fmtPct(r.active_rate))}</td>
        <td>${htmlEsc(fmt(r.active_count_accuracy, '-'))}</td>
        <td><span class="mi-status-badge ${htmlEsc(statusClass(r.status))}">${htmlEsc(r.status)}</span></td>
        <td>${htmlEsc(fmtDate(r.submitted_at))}</td>
        <td>
          <div class="mi-row-actions">
            <button class="mi-btn-sm mi-btn-primary" onclick="window.__miApproveOne('${htmlEsc(r.maintenance_id)}')">承認</button>
            <button class="mi-btn-sm mi-btn-danger"  onclick="window.__miReturnOne('${htmlEsc(r.maintenance_id)}')">差戻し</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  window.__miApproveOne = id => _approveIds([id]);
  window.__miReturnOne  = id => _openReturnModal([id]);
}

function _approveSelected() {
  const checks = document.querySelectorAll('.mi-appr-check:checked');
  if (checks.length === 0) {
    toast('承認する項目を選択してください', 'error');
    return;
  }
  _approveIds(Array.from(checks).map(cb => cb.dataset.id));
}

function _approveIds(ids) {
  const user = getCurrentUser();
  ids.forEach(id => {
    const rec = getMaintenance(id);
    if (rec) {
      rec.status      = 'Approved';
      rec.approved_at = new Date().toISOString();
      rec.approved_by = user?.user_name;
      saveMaintenance(rec);
    }
  });
  toast(`${ids.length} 件を承認しました`);
  renderApproval();
}

function _openReturnModal(ids) {
  if (ids === null) {
    const checks = document.querySelectorAll('.mi-appr-check:checked');
    if (checks.length === 0) {
      toast('差戻しする項目を選択してください', 'error');
      return;
    }
    _returnTargetIds = Array.from(checks).map(cb => cb.dataset.id);
  } else {
    _returnTargetIds = ids;
  }
  _q('mi-return-comment').value = '';
  _q('mi-return-error')?.classList.add('hidden');
  _q('mi-modal-return')?.classList.remove('hidden');
  _q('mi-modal-backdrop')?.classList.remove('hidden');
}

function _closeReturnModal() {
  _q('mi-modal-return')?.classList.add('hidden');
  _q('mi-modal-backdrop')?.classList.add('hidden');
  _returnTargetIds = [];
}

function _confirmReturn() {
  const comment = _q('mi-return-comment').value.trim();
  const errEl   = _q('mi-return-error');
  if (!comment) {
    errEl.textContent = '差戻しコメントを入力してください';
    errEl.classList.remove('hidden');
    return;
  }
  const user = getCurrentUser();
  _returnTargetIds.forEach(id => {
    const rec = getMaintenance(id);
    if (rec) {
      rec.status      = 'Returned';
      rec.returned_at = new Date().toISOString();
      rec.returned_by = user?.user_name;
      saveMaintenance(rec);
      saveIssue({
        issue_id:        null,
        maintenance_id:  id,
        issue_type:      '差戻し',
        issue_detail:    comment,
        requested_by:    user?.user_name,
        response:        '',
        status:          'Open',
      });
    }
  });
  toast(`${_returnTargetIds.length} 件を差戻しました`);
  _closeReturnModal();
  renderApproval();
}

// ================================================================
// CSV Export
// ================================================================
function _exportCSV() {
  const user = getCurrentUser();
  const installations = getInstallations();
  let records = getMaintenances();

  if (user?.role === 'site_staff') {
    const myIds = new Set(installations.filter(i => i.site_code === user.site_code).map(i => i.base_id));
    records = records.filter(r => myIds.has(r.base_id));
  }

  const enriched = records.map(r => {
    const i = installations.find(x => x.base_id === r.base_id) || {};
    return {
      maintenance_id: r.maintenance_id,
      base_id: r.base_id,
      site_code: i.site_code,
      country: i.country,
      install_year: i.install_year,
      machine_builder: i.machine_builder,
      nc_series: i.nc_series,
      installed_count: i.installed_count,
      report_year: r.report_year,
      previous_active_count: r.previous_active_count,
      active_count: r.active_count,
      inactive_count: r.inactive_count,
      active_rate: r.active_rate,
      difference_from_previous: r.difference_from_previous,
      difference_rate: r.difference_rate,
      active_count_method: r.active_count_method,
      active_count_accuracy: r.active_count_accuracy,
      status_confirmed_date: r.status_confirmed_date,
      confirmed_by: r.confirmed_by,
      change_reason: r.change_reason,
      status: r.status,
      note: r.note,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  const cols = enriched.length > 0 ? Object.keys(enriched[0]) : [];
  _downloadCSV(_buildCSV(enriched, cols), 'active_maintenance.csv');
}

// ================================================================
// Helpers
// ================================================================
function _q(id)            { return document.getElementById(id); }
function _on(id, fn)       { _q(id)?.addEventListener('click', fn); }
function _val(id, v)       { const el = _q(id); if (el) el.value = v; }
function _set(id, v)       { const el = _q(id); if (el) el.value = v; }
function _fv(form, name, v){ const el = form?.querySelector(`[name="${name}"]`); if (el) el.value = v; }
function _fget(form, name) { return form?.querySelector(`[name="${name}"]`)?.value ?? ''; }
