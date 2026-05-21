// ============================================================
// mi_service.js – Service information (サービス情報) screens
//   Manages multiple service / contract records per installation base.
// ============================================================

import {
  getCurrentUser,
  getInstallations, getInstallation,
  getServices, getService, getServicesByBase, saveService, deleteService,
  validateService, calcContractEndDate,
  fmt, fmtDate, htmlEsc,
} from './mi_state.js';
import { showScreen, toast } from './mi_app.js';

let _initiated    = false;
let _currentBaseId = null; // which installation we're viewing services for

// ================================================================
// Master data (loaded once via fetch, fallback to inline defaults)
// ================================================================
const MASTERS = {
  contractHolderTypes: [],
  contractTypes: [],
  serviceBases: [],
  salesCompanies: [],
};

const MASTER_FALLBACK = {
  contractHolderTypes: [
    { code:'MTB',     display_name:'MTB',     is_active:true, display_order:1 },
    { code:'DEALER',  display_name:'Dealer',  is_active:true, display_order:2 },
    { code:'ENDUSER', display_name:'EndUser', is_active:true, display_order:3 },
  ],
  contractTypes: [
    { code:'FULL',  display_name:'FULL',  description:'フル契約',      standard_period_month:24, is_active:true, display_order:1 },
    { code:'PARTS', display_name:'PARTS', description:'パーツ契約',    standard_period_month:24, is_active:true, display_order:2 },
    { code:'EWC',   display_name:'EWC',   description:'延長保証契約',  standard_period_month:12, is_active:true, display_order:3 },
  ],
  serviceBases: [
    { code:'MEAU',  display_name:'MEAU (Australia)',       is_active:true, can_be_contract_owner:true, display_order:1 },
    { code:'MEB',   display_name:'MEB (Belgium/Europe)',   is_active:true, can_be_contract_owner:true, display_order:2 },
    { code:'MEU',   display_name:'MEU (USA)',              is_active:true, can_be_contract_owner:true, display_order:3 },
    { code:'MEACH', display_name:'MEACH (China)',          is_active:true, can_be_contract_owner:true, display_order:4 },
    { code:'MEAK',  display_name:'MEAK (Korea)',           is_active:true, can_be_contract_owner:true, display_order:5 },
    { code:'MEAP',  display_name:'MEAP (Asia Pacific)',    is_active:true, can_be_contract_owner:true, display_order:6 },
    { code:'MESM',  display_name:'MESM (Southeast Asia)',  is_active:true, can_be_contract_owner:true, display_order:7 },
    { code:'MEVN',  display_name:'MEVN (Vietnam)',         is_active:true, can_be_contract_owner:true, display_order:8 },
    { code:'MEIN',  display_name:'MEIN (India)',           is_active:true, can_be_contract_owner:true, display_order:9 },
    { code:'ME-TWN',display_name:'ME-TWN (Taiwan)',        is_active:true, can_be_contract_owner:true, display_order:10 },
    { code:'MMEG',  display_name:'MMEG (Germany)',         is_active:true, can_be_contract_owner:true, display_order:11 },
    { code:'MELAP', display_name:'MELAP (Latin America)',  is_active:true, can_be_contract_owner:true, display_order:12 },
    { code:'MEAUST',display_name:'MEAUST (Austria)',       is_active:true, can_be_contract_owner:true, display_order:13 },
    { code:'MEI',   display_name:'MEI (Italy)',            is_active:true, can_be_contract_owner:true, display_order:14 },
  ],
  salesCompanies: [
    { code:'MEJ',  display_name:'三菱電機（日本）',             is_active:true, can_be_contract_owner:true, display_order:1 },
    { code:'MEE',  display_name:'Mitsubishi Electric Europe',   is_active:true, can_be_contract_owner:true, display_order:2 },
    { code:'MEAM', display_name:'Mitsubishi Electric Americas', is_active:true, can_be_contract_owner:true, display_order:3 },
    { code:'MEAP', display_name:'Mitsubishi Electric Asia Pacific', is_active:true, can_be_contract_owner:true, display_order:4 },
  ],
};

async function _loadJson(path, fallback) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('fetch failed');
    return await res.json();
  } catch {
    return fallback;
  }
}

async function _ensureMasters() {
  if (MASTERS.contractHolderTypes.length > 0) return;
  const [cht, ct, sb, sc] = await Promise.all([
    _loadJson('./data/contract_holder_type_master.json', MASTER_FALLBACK.contractHolderTypes),
    _loadJson('./data/contract_type_master.json',        MASTER_FALLBACK.contractTypes),
    _loadJson('./data/service_base_master.json',         MASTER_FALLBACK.serviceBases),
    _loadJson('./data/sales_company_master.json',        MASTER_FALLBACK.salesCompanies),
  ]);
  MASTERS.contractHolderTypes = cht;
  MASTERS.contractTypes       = ct;
  MASTERS.serviceBases        = sb;
  MASTERS.salesCompanies      = sc;
}

// ================================================================
// Init (register event listeners once)
// ================================================================
export async function initServiceScreens() {
  if (_initiated) return;
  _initiated = true;

  await _ensureMasters();

  _on('mi-svc-btn-search',   renderServiceList);
  _on('mi-svc-btn-clear',    _clearFilter);
  _on('mi-svc-list-back',    _backToInstallationList);
  _on('mi-btn-add-service',  () => _openForm(null));
  _on('mi-svc-form-back',    _formBack);
  _on('mi-svc-form-cancel',  _formBack);
  _on('mi-svc-form-draft',   () => _saveForm('Draft'));
  _on('mi-svc-form-save',    () => _saveForm('Confirmed'));

  const startInput = _q('mi-svc-form')?.querySelector('[name="contract_start_date"]');
  const periodInput = _q('mi-svc-form')?.querySelector('[name="contract_period_month"]');
  if (startInput)  startInput.addEventListener('change',  _updateEndDate);
  if (periodInput) periodInput.addEventListener('input',   _updateEndDate);

  const ctypeSelect = _q('mi-svc-form')?.querySelector('[name="contract_type_code"]');
  if (ctypeSelect) ctypeSelect.addEventListener('change', _onContractTypeChange);
}

// ================================================================
// Navigate to service list for a specific base_id
// ================================================================
export function openServiceListForBase(base_id) {
  _currentBaseId = base_id || null;
  renderServiceList();
  showScreen('mi-screen-service-list');
}

// ================================================================
// Render: Service list
// ================================================================
export function renderServiceList() {
  const base_id = _currentBaseId;
  const inst     = base_id ? getInstallation(base_id) : null;
  const titleEl  = _q('mi-svc-list-title');
  const backBtn  = _q('mi-svc-list-back');
  const addBtn   = _q('mi-btn-add-service');

  // Title / context
  if (titleEl) {
    titleEl.textContent = inst
      ? `サービス情報一覧 ― ${htmlEsc(fmt(inst.site_code))} / ${htmlEsc(fmt(inst.country))} (設置年: ${htmlEsc(fmt(inst.install_year))})`
      : 'サービス情報一覧（全件）';
  }
  if (backBtn) backBtn.classList.toggle('hidden', !inst);
  if (addBtn)  addBtn.disabled = !inst;

  // Collect records
  let records = base_id ? getServicesByBase(base_id) : getServices();

  // Apply filters
  const fSite     = _q('mi-svc-filter-site')?.value.trim().toLowerCase();
  const fStatus   = _q('mi-svc-filter-status')?.value;
  const fContract = _q('mi-svc-filter-contract-type')?.value;

  const installations = getInstallations();
  function _inst(r) { return installations.find(i => i.base_id === r.base_id) || {}; }

  if (fSite)     records = records.filter(r => (_inst(r).site_code || '').toLowerCase().includes(fSite));
  if (fStatus)   records = records.filter(r => r.status === fStatus);
  if (fContract) records = records.filter(r => r.contract_type_code === fContract);

  const tbody = _q('mi-svc-tbody');
  const empty = _q('mi-svc-empty');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = records.map(r => {
    const inst2     = _inst(r);
    const endDate   = calcContractEndDate(r.contract_start_date, r.contract_period_month);
    const holderLbl = _findName(MASTERS.contractHolderTypes, r.contract_holder_type_code);
    const ownerLbl  = _findOwnerName(r.contract_owner_code);
    const baseLbl   = _findName(MASTERS.serviceBases, r.service_base_code);
    const typeLbl   = _findName(MASTERS.contractTypes,  r.contract_type_code);
    const statusCls = r.status === 'Confirmed' ? 'mi-svc-status-confirmed' : 'mi-svc-status-draft';
    const user      = getCurrentUser();

    return `<tr>
      <td>${htmlEsc(fmt(inst2.site_code, '-'))}</td>
      <td>${htmlEsc(fmt(inst2.install_year, '-'))}</td>
      <td><span class="mi-badge ${statusCls}">${htmlEsc(fmt(r.status))}</span></td>
      <td>${htmlEsc(holderLbl)}</td>
      <td>${htmlEsc(ownerLbl)}</td>
      <td>${htmlEsc(baseLbl)}</td>
      <td>${htmlEsc(fmt(r.contract_no, '-'))}</td>
      <td><span class="mi-badge mi-svc-type-${htmlEsc((r.contract_type_code || '').toLowerCase())}">${htmlEsc(typeLbl)}</span></td>
      <td class="mi-num">${htmlEsc(fmt(r.contract_period_month, '-'))}ヶ月</td>
      <td>${htmlEsc(fmtDate(r.contract_start_date))}</td>
      <td>${htmlEsc(fmtDate(endDate))}</td>
      <td>${htmlEsc(fmtDate(r.updated_at))}</td>
      <td>
        <div class="mi-row-actions">
          <button class="mi-btn-sm" onclick="window.__miSvcEdit('${htmlEsc(r.service_id)}')">編集</button>
          <button class="mi-btn-sm mi-btn-danger" onclick="window.__miSvcDelete('${htmlEsc(r.service_id)}')">削除</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  window.__miSvcEdit = id => _openForm(id);
  window.__miSvcDelete = id => {
    if (!confirm('このサービス情報を削除しますか？')) return;
    deleteService(id);
    renderServiceList();
    toast('削除しました');
  };
}

// ================================================================
// Form open
// ================================================================
function _openForm(service_id) {
  const form    = _q('mi-svc-form');
  const title   = _q('mi-svc-form-title');
  const msgBox  = _q('mi-svc-form-msg');
  if (!form) return;

  msgBox.innerHTML = '';
  msgBox.classList.add('hidden');

  _populateFormSelects();

  if (service_id) {
    const rec = getService(service_id);
    if (!rec) return;
    title.textContent = 'サービス情報編集';
    _fv(form, 'service_id',               rec.service_id);
    _fv(form, 'base_id',                  rec.base_id);
    _fv(form, 'contract_holder_type_code',rec.contract_holder_type_code || '');
    _fv(form, 'contract_owner_code',       rec.contract_owner_code || '');
    _fv(form, 'service_base_code',         rec.service_base_code || '');
    _fv(form, 'contract_no',               rec.contract_no || '');
    _fv(form, 'contract_type_code',        rec.contract_type_code || '');
    _fv(form, 'contract_period_month',     rec.contract_period_month ?? 24);
    _fv(form, 'contract_start_date',       rec.contract_start_date || '');
    _fv(form, 'contract_memo',             rec.contract_memo || '');
    _updateEndDate();
    _showInstReadonly(rec.base_id);
  } else {
    title.textContent = 'サービス情報登録';
    form.reset();
    _fv(form, 'service_id',              '');
    _fv(form, 'base_id',                 _currentBaseId || '');
    _fv(form, 'contract_holder_type_code','MTB');
    _fv(form, 'contract_type_code',       'FULL');
    _fv(form, 'contract_period_month',    24);
    _q('mi-svc-end-date').textContent = '-';
    _showInstReadonly(_currentBaseId);
  }

  showScreen('mi-screen-service-form');
}

function _populateFormSelects() {
  const form = _q('mi-svc-form');
  if (!form) return;

  _fillSelect(form, 'contract_holder_type_code', MASTERS.contractHolderTypes, '-- 選択 --');
  _fillSelect(form, 'contract_type_code',         MASTERS.contractTypes,       '-- 選択 --');
  _fillSelect(form, 'service_base_code',          MASTERS.serviceBases,        '-- 選択 --');

  // Contract owner: combined sales + service bases that can_be_contract_owner
  const ownerList = [
    ...MASTERS.salesCompanies.filter(m => m.can_be_contract_owner !== false),
    ...MASTERS.serviceBases.filter(m => m.can_be_contract_owner !== false),
  ].filter(m => m.is_active !== false)
   .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const seen = new Set();
  const unique = ownerList.filter(m => { if (seen.has(m.code)) return false; seen.add(m.code); return true; });
  _fillSelectRaw(form, 'contract_owner_code', unique, '-- 選択 --');
}

function _fillSelect(form, name, list, placeholder) {
  const el = form.querySelector(`[name="${name}"]`);
  if (!el) return;
  const cur = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    list.filter(m => m.is_active !== false)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(m => `<option value="${htmlEsc(m.code)}">${htmlEsc(m.display_name || m.code)}</option>`)
        .join('');
  if (cur) el.value = cur;
}

function _fillSelectRaw(form, name, list, placeholder) {
  const el = form.querySelector(`[name="${name}"]`);
  if (!el) return;
  const cur = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    list.map(m => `<option value="${htmlEsc(m.code)}">${htmlEsc(m.display_name || m.code)}</option>`)
        .join('');
  if (cur) el.value = cur;
}

// Show readonly installation info above the form
function _showInstReadonly(base_id) {
  const box = _q('mi-svc-inst-readonly');
  if (!box) return;
  if (!base_id) { box.innerHTML = ''; return; }
  const r = getInstallation(base_id);
  if (!r) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <div class="mi-svc-inst-row">
      <span><strong>拠点コード:</strong> ${htmlEsc(fmt(r.site_code))}</span>
      <span><strong>国:</strong> ${htmlEsc(fmt(r.country))}</span>
      <span><strong>エリア:</strong> ${htmlEsc(fmt(r.area, '-'))}</span>
      <span><strong>設置年:</strong> ${htmlEsc(fmt(r.install_year))}</span>
      <span><strong>粒度:</strong> ${htmlEsc(fmt(r.data_granularity))}</span>
      <span><strong>機械メーカ:</strong> ${htmlEsc(fmt(r.machine_builder, '-'))}</span>
      <span><strong>NCシリーズ:</strong> ${htmlEsc(fmt(r.nc_series, '-'))}</span>
      <span><strong>設置台数:</strong> ${htmlEsc(String(r.installed_count ?? '-'))}</span>
    </div>`;
}

// ================================================================
// Auto-calculate contract end date
// ================================================================
function _updateEndDate() {
  const form   = _q('mi-svc-form');
  const endEl  = _q('mi-svc-end-date');
  if (!form || !endEl) return;
  const start  = _fget(form, 'contract_start_date');
  const period = _fget(form, 'contract_period_month');
  const endDate = calcContractEndDate(start, period);
  endEl.textContent = endDate ? fmtDate(endDate) : '-';
}

// Auto-fill contract period when contract type changes
function _onContractTypeChange() {
  const form     = _q('mi-svc-form');
  if (!form) return;
  const typeCode = _fget(form, 'contract_type_code');
  const found    = MASTERS.contractTypes.find(m => m.code === typeCode);
  if (found?.standard_period_month) {
    _fv(form, 'contract_period_month', found.standard_period_month);
    _updateEndDate();
  }
}

// ================================================================
// Save form
// ================================================================
function _saveForm(status) {
  const form   = _q('mi-svc-form');
  const msgBox = _q('mi-svc-form-msg');
  if (!form) return;

  const rawId = _fget(form, 'service_id');
  const rec = {
    service_id:                rawId || null,
    base_id:                   _currentBaseId || _fget(form, 'base_id') || null,
    contract_holder_type_code: _fget(form, 'contract_holder_type_code'),
    contract_owner_code:       _fget(form, 'contract_owner_code'),
    service_base_code:         _fget(form, 'service_base_code'),
    contract_no:               _fget(form, 'contract_no').trim(),
    contract_type_code:        _fget(form, 'contract_type_code'),
    contract_period_month:     _fget(form, 'contract_period_month') !== '' ? Number(_fget(form, 'contract_period_month')) : '',
    contract_start_date:       _fget(form, 'contract_start_date'),
    contract_memo:             _fget(form, 'contract_memo').trim(),
    status:                    status,
  };

  // Draft allows skipping required fields (except contract_type when present)
  const errors = status === 'Draft'
    ? (rec.contract_type_code && !rec.contract_period_month ? ['契約期間（月数）は1以上の整数で入力してください'] : [])
    : validateService(rec);

  if (errors.length > 0) {
    msgBox.innerHTML = errors.map(e => `<p class="mi-msg-error">⚠ ${e}</p>`).join('');
    msgBox.classList.remove('hidden');
    return;
  }

  saveService(rec);
  toast(rawId ? 'サービス情報を更新しました' : 'サービス情報を登録しました');
  renderServiceList();
  showScreen('mi-screen-service-list');
}

// ================================================================
// Navigation helpers
// ================================================================
function _formBack() {
  showScreen('mi-screen-service-list');
  renderServiceList();
}

function _backToInstallationList() {
  import('./mi_installation.js').then(mod => {
    mod.renderInstallationList();
  });
  showScreen('mi-screen-installation-list');
}

function _clearFilter() {
  if (_q('mi-svc-filter-site'))          _q('mi-svc-filter-site').value          = '';
  if (_q('mi-svc-filter-status'))        _q('mi-svc-filter-status').value        = '';
  if (_q('mi-svc-filter-contract-type')) _q('mi-svc-filter-contract-type').value = '';
  renderServiceList();
}

// ================================================================
// Helpers
// ================================================================
function _q(id)          { return document.getElementById(id); }
function _on(id, fn)     { _q(id)?.addEventListener('click', fn); }
function _fv(form, name, val) {
  const el = form.querySelector(`[name="${name}"]`);
  if (el) el.value = val;
}
function _fget(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  return el ? el.value : '';
}
function _findName(list, code) {
  if (!code) return '-';
  const m = list.find(x => x.code === code);
  if (!m) return code;
  const base = m.display_name || m.code;
  return m.is_active ? base : `${base}（無効）`;
}
function _findOwnerName(code) {
  if (!code) return '-';
  const combined = [...MASTERS.salesCompanies, ...MASTERS.serviceBases];
  const m = combined.find(x => x.code === code);
  if (!m) return code;
  const base = m.display_name || m.code;
  return m.is_active ? base : `${base}（無効）`;
}
