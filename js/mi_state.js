// ============================================================
// mi_state.js – State / data layer (localStorage) for Machine Info system
// ============================================================

const KEY_INSTALL = 'mi_installation_base';
const KEY_MAINT   = 'mi_active_maintenance';
const KEY_ISSUES  = 'mi_issue_list';
const KEY_USER    = 'mi_current_user';
const KEY_SEEDED  = 'mi_seeded_v1';

// ---- Demo users ----
export const DEMO_USERS = [
  { user_id: 'U001', user_name: '本邦担当者 (HQ)',    role: 'hq_staff',   site_code: null   },
  { user_id: 'U002', user_name: 'タイ拠点担当 (TH)',   role: 'site_staff', site_code: 'TH01' },
  { user_id: 'U003', user_name: 'ドイツ拠点担当 (DE)', role: 'site_staff', site_code: 'DE01' },
  { user_id: 'U004', user_name: '中国拠点担当 (CN)',   role: 'site_staff', site_code: 'CN01' },
  { user_id: 'U005', user_name: '米州拠点担当 (US)',   role: 'site_staff', site_code: 'US01' },
];

// ---- Auth ----
export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); }
  catch { return null; }
}
export function setCurrentUser(user) {
  localStorage.setItem(KEY_USER, JSON.stringify(user));
}
export function clearCurrentUser() {
  localStorage.removeItem(KEY_USER);
}

// ---- UUID ----
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ================================================================
// Installation Base
// ================================================================
export function getInstallations() {
  try { return JSON.parse(localStorage.getItem(KEY_INSTALL) || '[]'); }
  catch { return []; }
}
function _saveInstallations(list) {
  localStorage.setItem(KEY_INSTALL, JSON.stringify(list));
}
export function getInstallation(base_id) {
  return getInstallations().find(r => r.base_id === base_id) || null;
}
export function saveInstallation(record) {
  const list = getInstallations();
  const now = new Date().toISOString();
  if (!record.base_id) {
    record.base_id = uuid();
    record.created_at = now;
  }
  record.updated_at = now;
  const idx = list.findIndex(r => r.base_id === record.base_id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  _saveInstallations(list);
  return record;
}
export function deleteInstallation(base_id) {
  _saveInstallations(getInstallations().filter(r => r.base_id !== base_id));
  // Cascade delete related maintenance records
  _saveMaintenances(getMaintenances().filter(r => r.base_id !== base_id));
}

// ================================================================
// Active Maintenance
// ================================================================
export function getMaintenances() {
  try { return JSON.parse(localStorage.getItem(KEY_MAINT) || '[]'); }
  catch { return []; }
}
function _saveMaintenances(list) {
  localStorage.setItem(KEY_MAINT, JSON.stringify(list));
}
export function getMaintenance(maintenance_id) {
  return getMaintenances().find(r => r.maintenance_id === maintenance_id) || null;
}
export function saveMaintenance(record) {
  const list = getMaintenances();
  const now = new Date().toISOString();
  if (!record.maintenance_id) {
    record.maintenance_id = uuid();
    record.created_at = now;
  }
  record.updated_at = now;
  const idx = list.findIndex(r => r.maintenance_id === record.maintenance_id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  _saveMaintenances(list);
  return record;
}
export function deleteMaintenance(maintenance_id) {
  _saveMaintenances(getMaintenances().filter(r => r.maintenance_id !== maintenance_id));
}

/** Returns the active_count from the most recent year before report_year for the given base */
export function getPreviousActiveCount(base_id, report_year) {
  const prev = getMaintenances()
    .filter(r => r.base_id === base_id && Number(r.report_year) < Number(report_year))
    .sort((a, b) => Number(b.report_year) - Number(a.report_year));
  return prev.length > 0 ? (prev[0].active_count ?? null) : null;
}

// ================================================================
// Issue List
// ================================================================
export function getIssues() {
  try { return JSON.parse(localStorage.getItem(KEY_ISSUES) || '[]'); }
  catch { return []; }
}
export function saveIssue(issue) {
  const list = getIssues();
  const now = new Date().toISOString();
  if (!issue.issue_id) {
    issue.issue_id = uuid();
    issue.created_at = now;
  }
  issue.updated_at = now;
  const idx = list.findIndex(r => r.issue_id === issue.issue_id);
  if (idx >= 0) list[idx] = issue;
  else list.push(issue);
  localStorage.setItem(KEY_ISSUES, JSON.stringify(list));
  return issue;
}
export function getLatestIssue(maintenance_id) {
  return getIssues()
    .filter(i => i.maintenance_id === maintenance_id)
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0] || null;
}

// ================================================================
// Derived field calculations
// ================================================================
export function calcDerived(active_count, installed_count, previous_active_count) {
  const ac  = Number(active_count);
  const ic  = Number(installed_count);
  const pac = (previous_active_count !== null && previous_active_count !== '') ? Number(previous_active_count) : null;

  const inactive_count          = ic - ac;
  const active_rate             = ic > 0 ? ac / ic : 0;
  const difference_from_previous = pac !== null ? ac - pac : null;
  const difference_rate         = (pac !== null && pac > 0) ? difference_from_previous / pac : null;

  return { inactive_count, active_rate, difference_from_previous, difference_rate };
}

// ================================================================
// Validation
// ================================================================
export function validateInstallation(rec) {
  const errors = [];
  if (!rec.site_code?.trim())    errors.push('拠点コードは必須です');
  if (!rec.country?.trim())      errors.push('国は必須です');
  if (!rec.install_year || isNaN(Number(rec.install_year)))
    errors.push('設置年は必須です（数値）');
  if (!rec.data_granularity)     errors.push('データ粒度は必須です');
  if (rec.data_granularity === 'MTB'      && !rec.machine_builder?.trim())
    errors.push('粒度が MTB の場合、機械メーカは必須です');
  if (rec.data_granularity === 'NCSeries' && !rec.nc_series?.trim())
    errors.push('粒度が NCSeries の場合、NCシリーズは必須です');
  const ic = rec.installed_count;
  if (ic === '' || ic === null || ic === undefined || isNaN(Number(ic)))
    errors.push('設置台数は必須です（数値）');
  else if (Number(ic) < 0)
    errors.push('設置台数は 0 以上で入力してください');
  if (!rec.installed_count_accuracy)
    errors.push('設置台数精度は必須です');
  if (rec.primary_flag === '' || rec.primary_flag === null || rec.primary_flag === undefined)
    errors.push('Primary集計対象は必須です');
  return errors;
}

export function validateMaintenance(rec, installation) {
  const errors = [];
  if (!rec.base_id)
    errors.push('設置データを選択してください');
  if (!rec.report_year || isNaN(Number(rec.report_year)))
    errors.push('報告年度は必須です（数値）');
  if (installation && Number(rec.report_year) < Number(installation.install_year))
    errors.push(`報告年度 (${rec.report_year}) は設置年 (${installation.install_year}) 以上にしてください`);

  const ac = rec.active_count;
  if (ac === '' || ac === null || ac === undefined || isNaN(Number(ac)))
    errors.push('稼働台数は必須です（数値）');
  else if (Number(ac) < 0)
    errors.push('稼働台数は 0 以上で入力してください');
  else if (installation && Number(ac) > Number(installation.installed_count))
    errors.push(`稼働台数 (${ac}) は設置台数 (${installation.installed_count}) を超えられません`);

  if (!rec.active_count_method)   errors.push('カウント方法は必須です');
  if (!rec.active_count_accuracy) errors.push('カウント精度は必須です');

  // Duplicate check (same base_id + report_year, excluding self)
  const dup = getMaintenances().find(r =>
    r.base_id === rec.base_id &&
    Number(r.report_year) === Number(rec.report_year) &&
    r.maintenance_id !== rec.maintenance_id
  );
  if (dup) errors.push('同一設置データ・同一報告年度の重複登録はできません');

  // ±20% requires change_reason
  if (rec.previous_active_count !== null && rec.previous_active_count !== '' &&
      ac !== '' && ac !== null && Number(rec.previous_active_count) > 0) {
    const rate = (Number(ac) - Number(rec.previous_active_count)) / Number(rec.previous_active_count);
    if (Math.abs(rate) >= 0.2 && !rec.change_reason?.trim())
      errors.push('前年比±20%以上の変化がある場合、変更理由は必須です');
  }
  return errors;
}

// ================================================================
// Seed data (runs once on first load)
// ================================================================
export function seedIfNeeded() {
  if (localStorage.getItem(KEY_SEEDED)) return;
  const now = new Date().toISOString();

  const installations = [
    { base_id:'B001', site_code:'TH01', country:'Thailand',  area:'Asia',    install_year:2018, data_granularity:'Total',    machine_builder:'',      nc_series:'',    installed_count:320, installed_count_accuracy:'Estimated',  primary_flag:true,  source_file_name:'TH_base_2018.xlsx', source_note:'', note:'', created_at:now, updated_at:now },
    { base_id:'B002', site_code:'TH01', country:'Thailand',  area:'Asia',    install_year:2018, data_granularity:'MTB',      machine_builder:'MAZAK', nc_series:'',    installed_count:120, installed_count_accuracy:'Exact',       primary_flag:false, source_file_name:'TH_base_2018.xlsx', source_note:'MAZAK内訳', note:'', created_at:now, updated_at:now },
    { base_id:'B003', site_code:'DE01', country:'Germany',   area:'Europe',  install_year:2019, data_granularity:'Total',    machine_builder:'',      nc_series:'',    installed_count:210, installed_count_accuracy:'Estimated',  primary_flag:true,  source_file_name:'DE_base_2019.xlsx', source_note:'', note:'', created_at:now, updated_at:now },
    { base_id:'B004', site_code:'DE01', country:'Germany',   area:'Europe',  install_year:2019, data_granularity:'MTB',      machine_builder:'DMG',   nc_series:'',    installed_count:85,  installed_count_accuracy:'Exact',       primary_flag:false, source_file_name:'DE_base_2019.xlsx', source_note:'DMG内訳', note:'', created_at:now, updated_at:now },
    { base_id:'B005', site_code:'CN01', country:'China',     area:'Asia',    install_year:2017, data_granularity:'NCSeries', machine_builder:'',      nc_series:'M80', installed_count:580, installed_count_accuracy:'Approximate', primary_flag:true,  source_file_name:'CN_base_2017.xlsx', source_note:'', note:'', created_at:now, updated_at:now },
    { base_id:'B006', site_code:'US01', country:'USA',       area:'Americas',install_year:2020, data_granularity:'Total',    machine_builder:'',      nc_series:'',    installed_count:155, installed_count_accuracy:'Exact',       primary_flag:true,  source_file_name:'US_base_2020.xlsx', source_note:'', note:'', created_at:now, updated_at:now },
  ];

  const maintenances = [
    // TH01 / B001 – 2022 (Approved)
    { maintenance_id:'M001', base_id:'B001', report_year:2022, previous_active_count:280,  active_count:295, inactive_count:25,  active_rate:0.9219, difference_from_previous:15,  difference_rate:0.0536, active_count_method:'Survey',   active_count_accuracy:'Estimated', status_confirmed_date:'2022-03-15', confirmed_by:'田中一郎', change_reason:'',                   status:'Approved',  submitted_at:'2022-03-20T00:00:00.000Z', note:'', created_at:now, updated_at:now },
    // TH01 / B002 – 2022 (Approved)
    { maintenance_id:'M002', base_id:'B002', report_year:2022, previous_active_count:105,  active_count:112, inactive_count:8,   active_rate:0.9333, difference_from_previous:7,   difference_rate:0.0667, active_count_method:'Survey',   active_count_accuracy:'Exact',     status_confirmed_date:'2022-03-15', confirmed_by:'田中一郎', change_reason:'',                   status:'Approved',  submitted_at:'2022-03-20T00:00:00.000Z', note:'', created_at:now, updated_at:now },
    // TH01 / B001 – 2023 (Submitted – awaiting HQ review)
    { maintenance_id:'M003', base_id:'B001', report_year:2023, previous_active_count:295,  active_count:305, inactive_count:15,  active_rate:0.9531, difference_from_previous:10,  difference_rate:0.0339, active_count_method:'Survey',   active_count_accuracy:'Estimated', status_confirmed_date:'2023-03-20', confirmed_by:'田中一郎', change_reason:'',                   status:'Submitted', submitted_at:'2023-03-25T00:00:00.000Z', note:'', created_at:now, updated_at:now },
    // DE01 / B003 – 2022 (Approved)
    { maintenance_id:'M004', base_id:'B003', report_year:2022, previous_active_count:185,  active_count:198, inactive_count:12,  active_rate:0.9429, difference_from_previous:13,  difference_rate:0.0703, active_count_method:'Contract', active_count_accuracy:'Exact',     status_confirmed_date:'2022-04-01', confirmed_by:'鈴木次郎', change_reason:'',                   status:'Approved',  submitted_at:'2022-04-05T00:00:00.000Z', note:'', created_at:now, updated_at:now },
    // DE01 / B003 – 2023 (Draft – large decrease, change_reason present)
    { maintenance_id:'M005', base_id:'B003', report_year:2023, previous_active_count:198,  active_count:165, inactive_count:45,  active_rate:0.7857, difference_from_previous:-33, difference_rate:-0.1667,active_count_method:'Contract', active_count_accuracy:'Estimated', status_confirmed_date:'2023-04-10', confirmed_by:'鈴木次郎', change_reason:'工場閉鎖による稼働減少', status:'Draft',     submitted_at:'',                         note:'', created_at:now, updated_at:now },
    // CN01 / B005 – 2022 (Approved)
    { maintenance_id:'M006', base_id:'B005', report_year:2022, previous_active_count:520,  active_count:542, inactive_count:38,  active_rate:0.9345, difference_from_previous:22,  difference_rate:0.0423, active_count_method:'Report',   active_count_accuracy:'Approximate',status_confirmed_date:'2022-05-01', confirmed_by:'李 明',    change_reason:'',                   status:'Approved',  submitted_at:'2022-05-10T00:00:00.000Z', note:'', created_at:now, updated_at:now },
    // US01 / B006 – 2023 (Draft – first year)
    { maintenance_id:'M007', base_id:'B006', report_year:2023, previous_active_count:null, active_count:148, inactive_count:7,   active_rate:0.9548, difference_from_previous:null,difference_rate:null,   active_count_method:'Survey',   active_count_accuracy:'Exact',     status_confirmed_date:'2023-02-28', confirmed_by:'Smith J', change_reason:'',                   status:'Draft',     submitted_at:'',                         note:'初年度データ', created_at:now, updated_at:now },
  ];

  localStorage.setItem(KEY_INSTALL, JSON.stringify(installations));
  localStorage.setItem(KEY_MAINT,   JSON.stringify(maintenances));
  localStorage.setItem(KEY_ISSUES,  JSON.stringify([]));
  localStorage.setItem(KEY_SEEDED,  '1');
}

// ================================================================
// Formatting helpers
// ================================================================
export function fmt(val, fallback = '-') {
  return (val === null || val === undefined || val === '') ? fallback : String(val);
}
export function fmtNum(n) {
  if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '-';
  return Number(n).toLocaleString();
}
export function fmtPct(rate) {
  if (rate === null || rate === undefined || rate === '' || isNaN(Number(rate))) return '-';
  return (Number(rate) * 100).toFixed(1) + '%';
}
export function fmtDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 10);
}

// ================================================================
// Status helpers
// ================================================================
// ================================================================
// HTML escape (prevent XSS in innerHTML template literals)
// ================================================================
export function htmlEsc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function statusClass(status) {
  const map = {
    'Draft':        'mi-status-draft',
    'Submitted':    'mi-status-submitted',
    'Under Review': 'mi-status-review',
    'Returned':     'mi-status-returned',
    'Approved':     'mi-status-approved',
    'Locked':       'mi-status-locked',
  };
  return map[status] || 'mi-status-draft';
}
