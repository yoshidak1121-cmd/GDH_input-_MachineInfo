// ============================================================
// mi_report.js – Aggregation report + CSV export
// ============================================================

import {
  getCurrentUser,
  getInstallations, getMaintenances,
  fmt, fmtNum, fmtPct, htmlEsc,
} from './mi_state.js';
import { toast } from './mi_app.js';
import { _buildCSV, _downloadCSV } from './mi_installation.js';

let _initiated = false;
// Remember which tab is active so we can export its data
let _activeTab = 'by-site';

export function initReportScreen() {
  if (_initiated) return;
  _initiated = true;

  document.getElementById('mi-report-btn-refresh')?.addEventListener('click', renderReport);
  document.getElementById('mi-btn-export-report')?.addEventListener('click', _exportCurrentTab);

  document.querySelectorAll('.mi-report-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.tab;
      document.querySelectorAll('.mi-report-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mi-report-tab-content').forEach(c => c.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(`mi-report-tab-${btn.dataset.tab}`)?.classList.remove('hidden');
    });
  });

  _populateYearFilter();
}

function _populateYearFilter() {
  const sel = document.getElementById('mi-report-filter-year');
  if (!sel) return;
  const years = [...new Set(getMaintenances().map(r => r.report_year).filter(Boolean))].sort((a, b) => b - a);
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = `${y}年`;
    sel.appendChild(opt);
  });
}

// ================================================================
// Main render entry
// ================================================================
export function renderReport() {
  const user         = getCurrentUser();
  const filterYear   = document.getElementById('mi-report-filter-year')?.value;
  const filterSite   = document.getElementById('mi-report-filter-site')?.value.trim().toLowerCase();
  const primaryOnly  = document.getElementById('mi-report-filter-primary')?.value === 'true';

  let installations = getInstallations();
  let maintenances  = getMaintenances();

  // Role filter
  if (user?.role === 'site_staff') {
    installations = installations.filter(i => i.site_code === user.site_code);
  }
  if (filterSite) {
    installations = installations.filter(i => i.site_code?.toLowerCase().includes(filterSite));
  }
  if (primaryOnly) {
    installations = installations.filter(i => i.primary_flag === true);
  }

  const baseIds = new Set(installations.map(i => i.base_id));
  maintenances  = maintenances.filter(r => baseIds.has(r.base_id));

  if (filterYear) {
    maintenances = maintenances.filter(r => Number(r.report_year) === Number(filterYear));
  }

  // Only include records with meaningful status for aggregation
  const reportStatuses = new Set(['Approved', 'Locked', 'Submitted', 'Under Review']);
  const maints = maintenances.filter(r => reportStatuses.has(r.status));

  _renderBySite(installations, maints);
  _renderByYear(installations, maints);
  _renderByMTB(installations, maints);
  _renderByAccuracy(installations, maints);
}

// ================================================================
// Tab: 拠点別
// ================================================================
function _renderBySite(installations, maintenances) {
  const container = document.getElementById('mi-report-tab-by-site');
  if (!container) return;

  const map = {};
  installations.forEach(inst => {
    const k = inst.site_code;
    if (!map[k]) map[k] = { site_code: k, country: inst.country, area: inst.area, installed_count: 0, active_count: 0, record_count: 0, report_years: new Set() };
    map[k].installed_count += Number(inst.installed_count) || 0;
    maintenances.filter(m => m.base_id === inst.base_id).forEach(m => {
      map[k].active_count += Number(m.active_count) || 0;
      map[k].record_count++;
      map[k].report_years.add(m.report_year);
    });
  });

  const rows = Object.values(map).sort((a, b) => a.site_code.localeCompare(b.site_code));
  const totalI = rows.reduce((s, r) => s + r.installed_count, 0);
  const totalA = rows.reduce((s, r) => s + r.active_count, 0);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>拠点コード</th><th>国</th><th>エリア</th>
          <th class="mi-num-th">設置台数</th><th class="mi-num-th">稼働台数</th>
          <th>稼働率</th><th>件数</th><th>報告年</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${htmlEsc(r.site_code)}</td>
            <td>${htmlEsc(fmt(r.country))}</td>
            <td>${htmlEsc(fmt(r.area, '-'))}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.installed_count))}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
            <td>${htmlEsc(r.installed_count > 0 ? fmtPct(r.active_count / r.installed_count) : '-')}</td>
            <td class="mi-num">${htmlEsc(String(r.record_count))}</td>
            <td>${htmlEsc([...r.report_years].sort().join(', ') || '-')}</td>
          </tr>`).join('')}
        ${rows.length === 0 ? `<tr><td colspan="8" class="mi-no-data">データがありません</td></tr>` : ''}
      </tbody>
      ${rows.length > 0 ? `
      <tfoot>
        <tr class="mi-total-row">
          <td colspan="3"><strong>合計</strong></td>
          <td class="mi-num"><strong>${fmtNum(totalI)}</strong></td>
          <td class="mi-num"><strong>${fmtNum(totalA)}</strong></td>
          <td><strong>${totalI > 0 ? fmtPct(totalA / totalI) : '-'}</strong></td>
          <td class="mi-num"><strong>${rows.reduce((s, r) => s + r.record_count, 0)}</strong></td>
          <td>-</td>
        </tr>
      </tfoot>` : ''}
    </table>`;
}

// ================================================================
// Tab: 年度別
// ================================================================
function _renderByYear(installations, maintenances) {
  const container = document.getElementById('mi-report-tab-by-year');
  if (!container) return;

  const map = {};
  maintenances.forEach(m => {
    const inst = installations.find(i => i.base_id === m.base_id);
    if (!inst) return;
    const k = m.report_year;
    if (!map[k]) map[k] = { report_year: k, installed_count: 0, active_count: 0, inactive_count: 0, record_count: 0 };
    map[k].installed_count += Number(inst.installed_count) || 0;
    map[k].active_count    += Number(m.active_count)       || 0;
    map[k].inactive_count  += Number(m.inactive_count)     || 0;
    map[k].record_count++;
  });

  const rows = Object.values(map).sort((a, b) => a.report_year - b.report_year);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>報告年</th>
          <th class="mi-num-th">設置台数合計</th>
          <th class="mi-num-th">稼働台数合計</th>
          <th class="mi-num-th">非稼働台数</th>
          <th>稼働率</th>
          <th class="mi-num-th">件数</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${htmlEsc(String(r.report_year))}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.installed_count))}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.inactive_count))}</td>
            <td>${htmlEsc(r.installed_count > 0 ? fmtPct(r.active_count / r.installed_count) : '-')}</td>
            <td class="mi-num">${htmlEsc(String(r.record_count))}</td>
          </tr>`).join('')}
        ${rows.length === 0 ? `<tr><td colspan="6" class="mi-no-data">データがありません</td></tr>` : ''}
      </tbody>
    </table>`;
}

// ================================================================
// Tab: MTB別
// ================================================================
function _renderByMTB(installations, maintenances) {
  const container = document.getElementById('mi-report-tab-by-mtb');
  if (!container) return;

  const map = {};
  installations.forEach(inst => {
    const k = inst.machine_builder?.trim() || '(未分類)';
    if (!map[k]) map[k] = { machine_builder: k, installed_count: 0, active_count: 0, site_count: new Set() };
    map[k].installed_count += Number(inst.installed_count) || 0;
    map[k].site_count.add(inst.site_code);
    maintenances.filter(m => m.base_id === inst.base_id)
      .forEach(m => { map[k].active_count += Number(m.active_count) || 0; });
  });

  const rows = Object.values(map).sort((a, b) => b.installed_count - a.installed_count);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>機械メーカ (MTB)</th>
          <th class="mi-num-th">設置台数合計</th>
          <th class="mi-num-th">稼働台数合計</th>
          <th>稼働率</th>
          <th class="mi-num-th">拠点数</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${htmlEsc(r.machine_builder)}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.installed_count))}</td>
            <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
            <td>${htmlEsc(r.installed_count > 0 ? fmtPct(r.active_count / r.installed_count) : '-')}</td>
            <td class="mi-num">${htmlEsc(String(r.site_count.size))}</td>
          </tr>`).join('')}
        ${rows.length === 0 ? `<tr><td colspan="5" class="mi-no-data">データがありません</td></tr>` : ''}
      </tbody>
    </table>`;
}

// ================================================================
// Tab: 精度別
// ================================================================
function _renderByAccuracy(installations, maintenances) {
  const container = document.getElementById('mi-report-tab-by-accuracy');
  if (!container) return;

  const map = {};
  maintenances.forEach(m => {
    const inst = installations.find(i => i.base_id === m.base_id);
    if (!inst) return;
    const k = m.active_count_accuracy || '(未設定)';
    if (!map[k]) map[k] = { accuracy: k, installed_count: 0, active_count: 0, record_count: 0 };
    map[k].installed_count += Number(inst.installed_count) || 0;
    map[k].active_count    += Number(m.active_count)       || 0;
    map[k].record_count++;
  });

  const rows = Object.values(map).sort((a, b) => b.record_count - a.record_count);

  container.innerHTML = `
    <p class="mi-hint" style="margin-bottom:8px;">稼働台数のカウント精度別の集計です。精度の低いデータを把握するためにご活用ください。</p>
    <table>
      <thead>
        <tr>
          <th>カウント精度</th>
          <th class="mi-num-th">設置台数合計</th>
          <th class="mi-num-th">稼働台数合計</th>
          <th>稼働率</th>
          <th class="mi-num-th">件数</th>
          <th>構成比</th>
        </tr>
      </thead>
      <tbody>
        ${(() => {
          const total = rows.reduce((s, r) => s + r.record_count, 0);
          return rows.map(r => `
            <tr>
              <td>${htmlEsc(r.accuracy)}</td>
              <td class="mi-num">${htmlEsc(fmtNum(r.installed_count))}</td>
              <td class="mi-num">${htmlEsc(fmtNum(r.active_count))}</td>
              <td>${htmlEsc(r.installed_count > 0 ? fmtPct(r.active_count / r.installed_count) : '-')}</td>
              <td class="mi-num">${htmlEsc(String(r.record_count))}</td>
              <td>${htmlEsc(total > 0 ? fmtPct(r.record_count / total) : '-')}</td>
            </tr>`).join('');
        })()}
        ${rows.length === 0 ? `<tr><td colspan="6" class="mi-no-data">データがありません</td></tr>` : ''}
      </tbody>
    </table>`;
}

// ================================================================
// CSV export for active tab
// ================================================================
function _exportCurrentTab() {
  const user        = getCurrentUser();
  const filterYear  = document.getElementById('mi-report-filter-year')?.value;
  const filterSite  = document.getElementById('mi-report-filter-site')?.value.trim().toLowerCase();
  const primaryOnly = document.getElementById('mi-report-filter-primary')?.value === 'true';

  let installations = getInstallations();
  let maintenances  = getMaintenances();

  if (user?.role === 'site_staff') {
    installations = installations.filter(i => i.site_code === user.site_code);
  }
  if (filterSite)   installations = installations.filter(i => i.site_code?.toLowerCase().includes(filterSite));
  if (primaryOnly)  installations = installations.filter(i => i.primary_flag === true);

  const baseIds = new Set(installations.map(i => i.base_id));
  maintenances  = maintenances.filter(r => baseIds.has(r.base_id));
  if (filterYear) maintenances = maintenances.filter(r => Number(r.report_year) === Number(filterYear));

  const reportStatuses = new Set(['Approved', 'Locked', 'Submitted', 'Under Review']);
  const maints = maintenances.filter(r => reportStatuses.has(r.status));

  let rows, cols, filename;

  if (_activeTab === 'by-site') {
    const map = {};
    installations.forEach(inst => {
      const k = inst.site_code;
      if (!map[k]) map[k] = { site_code: k, country: inst.country, area: inst.area, installed_count: 0, active_count: 0, record_count: 0 };
      map[k].installed_count += Number(inst.installed_count) || 0;
      maints.filter(m => m.base_id === inst.base_id).forEach(m => {
        map[k].active_count += Number(m.active_count) || 0;
        map[k].record_count++;
      });
    });
    rows = Object.values(map).map(r => ({
      ...r,
      active_rate: r.installed_count > 0 ? (r.active_count / r.installed_count).toFixed(4) : '',
    }));
    cols = ['site_code','country','area','installed_count','active_count','active_rate','record_count'];
    filename = 'report_by_site.csv';

  } else if (_activeTab === 'by-year') {
    const map = {};
    maints.forEach(m => {
      const inst = installations.find(i => i.base_id === m.base_id);
      if (!inst) return;
      const k = m.report_year;
      if (!map[k]) map[k] = { report_year: k, installed_count: 0, active_count: 0, record_count: 0 };
      map[k].installed_count += Number(inst.installed_count) || 0;
      map[k].active_count    += Number(m.active_count)       || 0;
      map[k].record_count++;
    });
    rows = Object.values(map).sort((a, b) => a.report_year - b.report_year).map(r => ({
      ...r, active_rate: r.installed_count > 0 ? (r.active_count / r.installed_count).toFixed(4) : '',
    }));
    cols = ['report_year','installed_count','active_count','active_rate','record_count'];
    filename = 'report_by_year.csv';

  } else if (_activeTab === 'by-mtb') {
    const map = {};
    installations.forEach(inst => {
      const k = inst.machine_builder?.trim() || '(未分類)';
      if (!map[k]) map[k] = { machine_builder: k, installed_count: 0, active_count: 0 };
      map[k].installed_count += Number(inst.installed_count) || 0;
      maints.filter(m => m.base_id === inst.base_id).forEach(m => { map[k].active_count += Number(m.active_count) || 0; });
    });
    rows = Object.values(map).sort((a, b) => b.installed_count - a.installed_count).map(r => ({
      ...r, active_rate: r.installed_count > 0 ? (r.active_count / r.installed_count).toFixed(4) : '',
    }));
    cols = ['machine_builder','installed_count','active_count','active_rate'];
    filename = 'report_by_mtb.csv';

  } else {
    // by-accuracy
    const map = {};
    maints.forEach(m => {
      const inst = installations.find(i => i.base_id === m.base_id);
      if (!inst) return;
      const k = m.active_count_accuracy || '(未設定)';
      if (!map[k]) map[k] = { active_count_accuracy: k, installed_count: 0, active_count: 0, record_count: 0 };
      map[k].installed_count += Number(inst.installed_count) || 0;
      map[k].active_count    += Number(m.active_count)       || 0;
      map[k].record_count++;
    });
    rows = Object.values(map).map(r => ({
      ...r, active_rate: r.installed_count > 0 ? (r.active_count / r.installed_count).toFixed(4) : '',
    }));
    cols = ['active_count_accuracy','installed_count','active_count','active_rate','record_count'];
    filename = 'report_by_accuracy.csv';
  }

  if (!rows || rows.length === 0) {
    toast('出力するデータがありません', 'error');
    return;
  }
  _downloadCSV(_buildCSV(rows, cols), filename);
}
