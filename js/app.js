import { loadMasters, activeItems, buildSelectOptions, buildContractOwnerOptions, findDisplayName } from './master.js';
import { validateStep1, validateStep2, validateStep3, validateAll } from './validation.js';
import {
  getRecords, saveRecord, deleteRecord, getRecord,
  getDrafts, saveDraft, deleteDraft, getDraft,
  computeStatus, createNewRecord, formatDate, getMissingSteps,
  addUserMaster, toggleUserMasterActive, getUserMasters,
} from './state.js';
import { addContractRow, getAllContracts, renderContractTable } from './contracts.js';

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------
let masters = null;
let currentRecord = null;   // NC record being edited
let editingSerial = null;   // null = new, string = editing existing
let currentStep = 1;
let s08Context = null;      // { masterType, selectEl }

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'start' }); }
}

function showStep(n) {
  $$('.wizard-step').forEach(s => s.classList.remove('active'));
  $(`step-${n}`)?.classList.add('active');
  currentStep = n;
  updateStepIndicator();
}

function updateStepIndicator() {
  $$('.step-item').forEach(el => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.toggle('done',    n < currentStep);
    el.classList.toggle('current', n === currentStep);
    el.classList.toggle('future',  n > currentStep);
  });
}

function showMessages(containerId, errors, warnings) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = '';
  if (!errors.length && !warnings.length) { el.style.display = 'none'; return; }
  errors.forEach(msg => {
    const p = document.createElement('p');
    p.className = 'msg-error';
    p.textContent = '⛔ ' + msg;
    el.appendChild(p);
  });
  warnings.forEach(msg => {
    const p = document.createElement('p');
    p.className = 'msg-warning';
    p.textContent = '⚠️ ' + msg;
    el.appendChild(p);
  });
  el.style.display = 'block';
}

function clearMessages(containerId) {
  const el = $(containerId);
  if (el) { el.innerHTML = ''; el.style.display = 'none'; }
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ---------------------------------------------------------------------------
// Collect form data from the current wizard step
// ---------------------------------------------------------------------------
function collectStep1() {
  const f = $('form-step1');
  if (!f) return;
  currentRecord.nc_system_model       = f.elements.nc_system_model?.value || '';
  currentRecord.nc_bom_no             = f.elements.nc_bom_no?.value || '';
  currentRecord.nc_spec_no            = f.elements.nc_spec_no?.value || '';
  currentRecord.machine_model         = f.elements.machine_model?.value || '';
  currentRecord.machine_serial_no     = f.elements.machine_serial_no?.value || '';
  currentRecord.mtb_code              = f.elements.mtb_code?.value || '';
  currentRecord.machine_memo          = f.elements.machine_memo?.value || '';
  currentRecord.nc_sales_date         = f.elements.nc_sales_date?.value || '';
  currentRecord.nc_sales_company_code = f.elements.nc_sales_company_code?.value || '';
  currentRecord.nc_sales_memo         = f.elements.nc_sales_memo?.value || '';
}

function collectStep2() {
  const f = $('form-step2');
  if (!f) return;
  currentRecord.machine_agent         = f.elements.machine_agent?.value || '';
  currentRecord.machine_agent_memo    = f.elements.machine_agent_memo?.value || '';
  currentRecord.export_date           = f.elements.export_date?.value || '';
  currentRecord.export_country_code   = f.elements.export_country_code?.value || '';
  currentRecord.shipment_memo         = f.elements.shipment_memo?.value || '';
  currentRecord.local_dealer          = f.elements.local_dealer?.value || '';
  currentRecord.local_dealer_memo     = f.elements.local_dealer_memo?.value || '';
  currentRecord.end_user              = f.elements.end_user?.value || '';
  currentRecord.end_user_memo         = f.elements.end_user_memo?.value || '';
  currentRecord.installation_date     = f.elements.installation_date?.value || '';
}

function collectStep3() {
  const tbody = $('contract-tbody');
  if (tbody) currentRecord.contracts = getAllContracts(tbody);
}

function collectCurrentStep() {
  if (currentStep === 1) collectStep1();
  else if (currentStep === 2) collectStep2();
  else if (currentStep === 3) collectStep3();
}

// ---------------------------------------------------------------------------
// Populate form fields from currentRecord
// ---------------------------------------------------------------------------
function populateStep1() {
  const f = $('form-step1');
  if (!f) return;
  const r = currentRecord;
  const set = (name, val) => { if (f.elements[name]) f.elements[name].value = val || ''; };
  // NC serial (readonly)
  const serialEl = $('s03-serial-display');
  if (serialEl) serialEl.textContent = r.nc_serial_no;

  // Rebuild selects
  const ncSel = f.elements.nc_system_model;
  if (ncSel) ncSel.innerHTML = buildSelectOptions(masters.ncSystems, r.nc_system_model);
  const mtbSel = f.elements.mtb_code;
  if (mtbSel) mtbSel.innerHTML = buildSelectOptions(masters.mtb, r.mtb_code);
  const salesSel = f.elements.nc_sales_company_code;
  if (salesSel) salesSel.innerHTML = buildSelectOptions(masters.salesCompanies, r.nc_sales_company_code);

  set('nc_bom_no', r.nc_bom_no);
  set('nc_spec_no', r.nc_spec_no);
  set('machine_model', r.machine_model);
  set('machine_serial_no', r.machine_serial_no);
  set('machine_memo', r.machine_memo);
  set('nc_sales_date', r.nc_sales_date);
  set('nc_sales_memo', r.nc_sales_memo);
  applyNcSystemAttrs(r.nc_system_model);
}

function populateStep2() {
  const f = $('form-step2');
  if (!f) return;
  const r = currentRecord;
  const set = (name, val) => { if (f.elements[name]) f.elements[name].value = val || ''; };

  const ctrySel = f.elements.export_country_code;
  if (ctrySel) ctrySel.innerHTML = buildSelectOptions(masters.countries, r.export_country_code);

  set('machine_agent', r.machine_agent);
  set('machine_agent_memo', r.machine_agent_memo);
  set('export_date', r.export_date);
  set('shipment_memo', r.shipment_memo);
  set('local_dealer', r.local_dealer);
  set('local_dealer_memo', r.local_dealer_memo);
  set('end_user', r.end_user);
  set('end_user_memo', r.end_user_memo);
  set('installation_date', r.installation_date);
}

function populateStep3() {
  const tbody = $('contract-tbody');
  if (!tbody) return;
  renderContractTable(tbody, currentRecord.contracts, masters);
}

// ---------------------------------------------------------------------------
// NC system model attributes auto-fill
// ---------------------------------------------------------------------------
function applyNcSystemAttrs(modelCode) {
  const attr = masters.ncSystems.find(x => x.code === modelCode || x.systemModelName === modelCode);
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val || '-'; };
  if (!attr) {
    ['attr-series','attr-model','attr-control','attr-display','attr-size','attr-touch'].forEach(id => set(id, ''));
    return;
  }
  set('attr-series',  attr.seriesName || '');
  set('attr-model',   attr.modelName  || '');
  set('attr-control', attr.ncControlUnit || '');
  set('attr-display', attr.displayUnit   || '');
  set('attr-size',    attr.displaySizeInch ? `${attr.displaySizeInch} インチ` : '');
  set('attr-touch',   attr.touchPanel ? 'あり' : 'なし');
}

// ---------------------------------------------------------------------------
// Confirmation screen
// ---------------------------------------------------------------------------

/** Build a simple confirm table using DOM methods (no innerHTML with user data) */
function buildConfirmTable(pairs) {
  const table = document.createElement('table');
  table.className = 'confirm-table';
  pairs.forEach(([label, value]) => {
    if (!value) return;
    const tr  = document.createElement('tr');
    const th  = document.createElement('th');
    const td  = document.createElement('td');
    th.textContent = label;
    td.textContent = value;
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });
  return table;
}

function setConfirmSection(id, domNode) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = '';
  el.appendChild(domNode);
}

function populateConfirmation() {
  collectStep1(); collectStep2(); collectStep3();
  const r = currentRecord;

  setConfirmSection('confirm-nc', buildConfirmTable([
    ['NCシリアル番号',  r.nc_serial_no],
    ['NCシステム型名',  r.nc_system_model],
    ['NC構成品番号',    r.nc_bom_no],
    ['NC納入仕様書番号', r.nc_spec_no],
  ]));
  setConfirmSection('confirm-machine', buildConfirmTable([
    ['機械モデル',       r.machine_model],
    ['機械シリアル番号',  r.machine_serial_no],
    ['機械メーカ',       findDisplayName(masters.mtb, r.mtb_code)],
    ['機械メモ',         r.machine_memo],
  ]));
  setConfirmSection('confirm-sales', buildConfirmTable([
    ['NC販売日',   formatDate(r.nc_sales_date)],
    ['NC販売会社', findDisplayName(masters.salesCompanies, r.nc_sales_company_code)],
    ['NC販売メモ', r.nc_sales_memo],
  ]));
  setConfirmSection('confirm-export', buildConfirmTable([
    ['機械代理店',         r.machine_agent],
    ['機械代理店メモ',     r.machine_agent_memo],
    ['機械輸出日',         formatDate(r.export_date)],
    ['機械輸出先',         findDisplayName(masters.countries, r.export_country_code)],
    ['出荷メモ',           r.shipment_memo],
    ['現地機械販売店',     r.local_dealer],
    ['現地機械販売店メモ', r.local_dealer_memo],
    ['エンドユーザ',       r.end_user],
    ['エンドユーザメモ',   r.end_user_memo],
    ['設置日',             formatDate(r.installation_date)],
  ]));

  // Build contracts table using DOM
  const contractEl = $('confirm-contracts');
  if (contractEl) {
    contractEl.innerHTML = '';
    if (!r.contracts?.length) {
      const p = document.createElement('p');
      p.className = 'no-data';
      p.textContent = '契約情報なし';
      contractEl.appendChild(p);
    } else {
      const table = document.createElement('table');
      table.className = 'confirm-contract-table';
      table.innerHTML = '<thead><tr><th>No</th><th>ご契約者</th><th>契約受託会社</th><th>サービス拠点</th><th>契約番号</th><th>契約タイプ</th><th>期間</th><th>開始日</th><th>終了日</th><th>メモ</th></tr></thead>';
      const tbody = document.createElement('tbody');
      const combined = [...masters.salesCompanies, ...masters.serviceBases];
      const { computeEndDate } = window._contracts || {};
      r.contracts.forEach((c, i) => {
        const endDate = computeEndDate ? computeEndDate(c.contract_start_date, c.contract_period_month) : '';
        const cells = [
          String(i + 1),
          findDisplayName(masters.contractHolderTypes, c.contract_holder_type_code),
          findDisplayName(combined, c.contract_owner_code),
          findDisplayName(masters.serviceBases, c.service_base_code),
          c.contract_no || '',
          findDisplayName(masters.contractTypes, c.contract_type_code),
          String(c.contract_period_month || ''),
          formatDate(c.contract_start_date),
          formatDate(endDate),
          c.contract_memo || '',
        ];
        const tr = document.createElement('tr');
        cells.forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      contractEl.appendChild(table);
    }
  }

  const { errors, warnings } = validateAll(r, getRecords(), editingSerial);
  showMessages('confirm-messages', errors, warnings);
  $('btn-confirm-register').disabled = errors.length > 0;
}

// ---------------------------------------------------------------------------
// List screen (S01)
// ---------------------------------------------------------------------------
function renderList(filter = {}) {
  const tbody = $('s01-tbody');
  const empty = $('s01-empty');
  if (!tbody) return;

  let records = getRecords();

  if (filter.serial) records = records.filter(r => r.nc_serial_no.includes(filter.serial));
  if (filter.model)  records = records.filter(r => r.nc_system_model === filter.model);
  if (filter.status) records = records.filter(r => r.registration_status === filter.status);
  if (filter.endUser)records = records.filter(r => (r.end_user||'').includes(filter.endUser));

  empty.style.display = records.length ? 'none' : 'block';
  tbody.innerHTML = '';
  records.forEach(r => {
    const tr = document.createElement('tr');

    const statusCls = statusClass(r.registration_status);
    const badge = `<span class="status-badge status-${statusCls}">${escHtml(r.registration_status)}</span>`;

    const cells = [
      escHtml(r.nc_serial_no),
      escHtml(r.nc_system_model||''),
      escHtml(findDisplayName(masters.mtb, r.mtb_code)),
      escHtml(r.machine_model||''),
      escHtml(r.end_user||''),
      escHtml(findDisplayName(masters.salesCompanies, r.nc_sales_company_code)),
      formatDate(r.installation_date),
      r.contracts?.length ? `${r.contracts.length}件` : 'なし',
    ];
    cells.forEach(c => {
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    });

    const badgeTd = document.createElement('td');
    badgeTd.innerHTML = badge;
    tr.appendChild(badgeTd);

    const dateTd = document.createElement('td');
    dateTd.textContent = formatDate((r.updated_at||'').split('T')[0]);
    tr.appendChild(dateTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'row-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-sm'; editBtn.textContent = '編集';
    editBtn.dataset.action = 'edit'; editBtn.dataset.serial = r.nc_serial_no;
    const contBtn = document.createElement('button');
    contBtn.className = 'btn-sm'; contBtn.textContent = '契約追加';
    contBtn.dataset.action = 'contract'; contBtn.dataset.serial = r.nc_serial_no;
    actionTd.appendChild(editBtn); actionTd.appendChild(contBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

function escAttr(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function statusClass(status) {
  const map = {
    '下書き': 'draft', '基本情報登録済み': 'basic', '設置情報登録済み': 'install',
    '契約情報登録済み': 'contract', '契約未登録': 'nocontract', '要確認': 'warn', '登録完了': 'done',
  };
  return map[status] || 'draft';
}

// ---------------------------------------------------------------------------
// Draft list screen (S09)
// ---------------------------------------------------------------------------
function renderDrafts() {
  const tbody = $('s09-tbody');
  const empty = $('s09-empty');
  if (!tbody) return;
  const drafts = getDrafts();
  empty.style.display = drafts.length ? 'none' : 'block';
  tbody.innerHTML = '';
  drafts.forEach(d => {
    const tr = document.createElement('tr');

    const serialTd = document.createElement('td');
    serialTd.textContent = d.nc_serial_no;
    tr.appendChild(serialTd);

    const statusTd = document.createElement('td');
    statusTd.innerHTML = `<span class="status-badge status-${statusClass(d.registration_status)}">${escHtml(d.registration_status)}</span>`;
    tr.appendChild(statusTd);

    const missingTd = document.createElement('td');
    missingTd.textContent = getMissingSteps(d).join('、') || 'なし';
    tr.appendChild(missingTd);

    const dateTd = document.createElement('td');
    dateTd.textContent = formatDate((d.updated_at||'').split('T')[0]);
    tr.appendChild(dateTd);

    const actionTd = document.createElement('td');
    actionTd.className = 'row-actions';
    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn-sm btn-primary'; resumeBtn.textContent = '再開';
    resumeBtn.dataset.action = 'resume'; resumeBtn.dataset.serial = d.nc_serial_no;
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-sm btn-danger'; delBtn.textContent = '削除';
    delBtn.dataset.action = 'delete'; delBtn.dataset.serial = d.nc_serial_no;
    actionTd.appendChild(resumeBtn); actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------------------------
// Master management screen
// ---------------------------------------------------------------------------
function renderMasterTab(masterType) {
  const content = $('master-content');
  if (!content) return;

  const config = {
    ncSystem:          { list: masters.ncSystems,           label:'NCシステム型名マスタ',  canAdd: true },
    mtb:               { list: masters.mtb,                 label:'MTBマスタ',            canAdd: true },
    salesCompany:      { list: masters.salesCompanies,      label:'販売会社マスタ',        canAdd: false },
    serviceBase:       { list: masters.serviceBases,        label:'サービス拠点マスタ',    canAdd: false },
    country:           { list: masters.countries,           label:'国コードISO2マスタ',    canAdd: false },
    contractHolderType:{ list: masters.contractHolderTypes, label:'契約者区分マスタ',      canAdd: false },
    contractType:      { list: masters.contractTypes,       label:'契約タイプマスタ',      canAdd: false },
  };
  const cfg = config[masterType];
  if (!cfg) return;

  const rows = cfg.list.map(m => {
    const note = m.standard_period_month != null
      ? String(m.standard_period_month)
      : (m.displaySizeInch ? `${m.displaySizeInch}インチ` : '');
    const btnLabel = m.is_active ? '無効化' : '有効化';
    return `<tr class="${m.is_active ? '' : 'inactive-row'}">
      <td>${escHtml(m.code)}</td>
      <td>${escHtml(m.display_name)}</td>
      <td>${escHtml(note)}</td>
      <td>${m.is_active ? '有効' : '無効'}</td>
      <td><button class="btn-sm" data-maction="toggle" data-mtype="${escAttr(masterType)}" data-mcode="${escAttr(m.code)}">${btnLabel}</button></td>
    </tr>`;
  }).join('');

  // Clear and rebuild via DOM to avoid injecting masterType/code as inline handlers
  content.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = cfg.label;
  content.appendChild(h3);
  if (cfg.canAdd) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-primary';
    addBtn.textContent = '＋ 新規登録';
    addBtn.dataset.maction = 'quickadd';
    addBtn.dataset.mtype = masterType;
    content.appendChild(addBtn);
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'table-container';
  wrapper.innerHTML = `<table><thead><tr><th>コード</th><th>表示名</th><th>備考</th><th>状態</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>`;
  content.appendChild(wrapper);
}

// ---------------------------------------------------------------------------
// S08: Quick master registration dialog
// ---------------------------------------------------------------------------
function openS08(masterType, selectEl = null) {
  s08Context = { masterType, selectEl };

  const labelMap = { ncSystem: 'NCシステム型名', mtb: 'MTB（機械メーカ）' };
  $('s08-master-label').textContent = labelMap[masterType] || masterType;
  $('s08-code').value  = '';
  $('s08-name').value  = '';
  $('s08-note').value  = '';
  clearMessages('s08-error');
  $('modal-s08').classList.remove('hidden');
  $('modal-backdrop').classList.remove('hidden');
}

function closeS08() {
  $('modal-s08').classList.add('hidden');
  $('modal-backdrop').classList.add('hidden');
  s08Context = null;
}

async function saveS08() {
  const code = $('s08-code').value.trim();
  const name = $('s08-name').value.trim();
  const note = $('s08-note').value.trim();

  if (!code) { showMessages('s08-error', ['コードは必須です。'], []); return; }
  if (!name) { showMessages('s08-error', ['表示名は必須です。'], []); return; }

  const newItem = { code, display_name: name, is_active: true, display_order: 999, note };
  const mt = s08Context?.masterType;
  if (mt === 'ncSystem') newItem.systemModelName = code;

  try {
    addUserMaster(mt, newItem);
  } catch (e) {
    showMessages('s08-error', [e.message], []);
    return;
  }

  // Reload masters and update the originating select
  masters = await loadMasters();
  if (s08Context?.selectEl) {
    const sel = s08Context.selectEl;
    const listMap = { ncSystem: masters.ncSystems, mtb: masters.mtb };
    sel.innerHTML = buildSelectOptions(listMap[mt] || [], code);
    sel.value = code;
  }

  toast(`「${name}」を登録しました。`);
  closeS08();
}

// ---------------------------------------------------------------------------
// Navigation / wizard start
// ---------------------------------------------------------------------------
function startNewRegistration() {
  showScreen('screen-s02');
  clearMessages('s02-error');
  $('s02-serial').value = '';
}

function startWizard(record, startStep = 1) {
  currentRecord = record;
  showScreen('screen-wizard');
  showStep(startStep);
  // Update NC serial display in Step1 header
  const h2serial = $('s03-serial-display');
  if (h2serial) h2serial.textContent = record.nc_serial_no;
  const inputSerial = $('s03-serial-display-input');
  if (inputSerial) inputSerial.value = record.nc_serial_no;
  populateStep1();
  if (startStep >= 2) populateStep2();
  if (startStep >= 3) populateStep3();
}

function draftSave() {
  collectCurrentStep();
  currentRecord.registration_status = computeStatus(currentRecord);
  saveDraft(currentRecord);
  toast('下書きを保存しました。');
}

function finishRegistration() {
  collectStep1(); collectStep2(); collectStep3();
  const { errors } = validateAll(currentRecord, getRecords(), editingSerial);
  if (errors.length) {
    toast('入力エラーがあります。確認してください。', 'error');
    return;
  }
  currentRecord.registration_status = computeStatus(currentRecord);
  saveRecord(currentRecord);
  deleteDraft(currentRecord.nc_serial_no);
  $('s07-serial').textContent = currentRecord.nc_serial_no;
  $('s07-status').textContent = currentRecord.registration_status;
  showScreen('screen-s07');
  renderList();
}

// ---------------------------------------------------------------------------
// Public API (called from inline event handlers)
// ---------------------------------------------------------------------------
window.app = {
  editRecord(nc_serial_no) {
    const rec = getRecord(nc_serial_no);
    if (!rec) return;
    editingSerial = nc_serial_no;
    startWizard({ ...rec });
  },
  addContract(nc_serial_no) {
    const rec = getRecord(nc_serial_no) || getDraft(nc_serial_no);
    if (!rec) return;
    editingSerial = nc_serial_no;
    startWizard({ ...rec }, 3);
  },
  resumeDraft(nc_serial_no) {
    const draft = getDraft(nc_serial_no);
    if (!draft) return;
    editingSerial = nc_serial_no;
    startWizard({ ...draft });
  },
  deleteDraftItem(nc_serial_no) {
    if (!confirm(`下書き「${nc_serial_no}」を削除しますか？`)) return;
    deleteDraft(nc_serial_no);
    renderDrafts();
  },
  toggleMaster(masterType, code) {
    toggleUserMasterActive(masterType, code);
    loadMasters().then(m => { masters = m; renderMasterTab(masterType); });
  },
  openS08(masterType, selectEl) { openS08(masterType, selectEl); },
};

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
function wireEvents() {
  // Global nav
  $('nav-list')?.addEventListener('click', () => { renderList(); showScreen('screen-s01'); });
  $('nav-drafts')?.addEventListener('click', () => { renderDrafts(); showScreen('screen-s09'); });
  $('nav-masters')?.addEventListener('click', () => {
    showScreen('screen-masters');
    renderMasterTab('ncSystem');
    $$('.master-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.master === 'ncSystem'));
  });

  // S01 – event delegation for record table actions
  $('s01-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const serial = btn.dataset.serial;
    if (btn.dataset.action === 'edit')     { editingSerial = serial; app.editRecord(serial); }
    if (btn.dataset.action === 'contract') { app.addContract(serial); }
  });

  // S09 – event delegation for draft table actions
  $('s09-tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const serial = btn.dataset.serial;
    if (btn.dataset.action === 'resume') app.resumeDraft(serial);
    if (btn.dataset.action === 'delete') app.deleteDraftItem(serial);
  });

  // Master content – event delegation for toggle/quickadd
  $('master-content')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-maction]');
    if (!btn) return;
    if (btn.dataset.maction === 'toggle') {
      app.toggleMaster(btn.dataset.mtype, btn.dataset.mcode);
    }
    if (btn.dataset.maction === 'quickadd') {
      openS08(btn.dataset.mtype, null);
    }
  });


  $('btn-new-reg')?.addEventListener('click', startNewRegistration);
  $('btn-drafts-nav')?.addEventListener('click', () => { renderDrafts(); showScreen('screen-s09'); });
  $('btn-search')?.addEventListener('click', () => {
    renderList({
      serial:  $('search-serial')?.value.trim() || '',
      model:   $('search-model')?.value  || '',
      status:  $('search-status')?.value || '',
      endUser: $('search-enduser')?.value.trim() || '',
    });
  });
  $('btn-clear-search')?.addEventListener('click', () => {
    ['search-serial','search-model','search-status','search-enduser']
      .forEach(id => { const el = $(id); if (el) el.value = ''; });
    renderList();
  });

  // S02
  $('s02-next')?.addEventListener('click', async () => {
    const serial = $('s02-serial')?.value.trim();
    if (!serial) { showMessages('s02-error', ['NCシリアル番号は必須です。'], []); return; }
    const existing = getRecord(serial) || getDraft(serial);
    if (existing && editingSerial !== serial) {
      showMessages('s02-error', ['NCシリアル番号は既に登録されています。'], []);
      return;
    }
    clearMessages('s02-error');
    editingSerial = null;
    const rec = existing ? { ...existing } : createNewRecord(serial);
    startWizard(rec, 1);
  });
  $('s02-back')?.addEventListener('click', () => showScreen('screen-s01'));

  // Wizard step 1 (S03)
  $('btn-step1-next')?.addEventListener('click', () => {
    collectStep1();
    const { errors, warnings } = validateStep1(currentRecord);
    showMessages('step1-messages', errors, warnings);
    if (errors.length) return;
    populateStep2();
    showStep(2);
  });
  $('btn-step1-draft')?.addEventListener('click', draftSave);
  $('btn-step1-cancel')?.addEventListener('click', () => {
    if (confirm('入力を中断します。下書き保存しますか？')) draftSave();
    showScreen('screen-s01');
  });

  // NC system model change → auto-fill attributes
  $('form-step1')?.elements.nc_system_model?.addEventListener('change', (e) => {
    applyNcSystemAttrs(e.target.value);
  });

  // Quick-add buttons for NC system model and MTB
  $('btn-quick-nc')?.addEventListener('click', () => {
    const sel = $('form-step1')?.elements.nc_system_model;
    openS08('ncSystem', sel);
  });
  $('btn-quick-mtb')?.addEventListener('click', () => {
    const sel = $('form-step1')?.elements.mtb_code;
    openS08('mtb', sel);
  });

  // Wizard step 2 (S04)
  $('btn-step2-next')?.addEventListener('click', () => {
    collectStep2();
    const { errors, warnings } = validateStep2(currentRecord);
    showMessages('step2-messages', errors, warnings);
    if (errors.length) return;
    populateStep3();
    showStep(3);
  });
  $('btn-step2-skip')?.addEventListener('click', () => { collectStep2(); populateStep3(); showStep(3); });
  $('btn-step2-back')?.addEventListener('click', () => { collectStep2(); populateStep1(); showStep(1); });
  $('btn-step2-draft')?.addEventListener('click', draftSave);

  // Auto-default contract start date from installation date
  $('form-step2')?.elements.installation_date?.addEventListener('change', () => {
    // Stored in currentRecord when user reaches step 3
  });

  // Wizard step 3 (S05)
  $('btn-add-contract')?.addEventListener('click', () => {
    const tbody = $('contract-tbody');
    const installDate = currentRecord.installation_date || '';
    addContractRow(tbody, masters, {
      contract_holder_type_code: 'MTB',
      contract_owner_code: currentRecord.nc_sales_company_code || '',
      contract_type_code: 'FULL',
      contract_period_month: 24,
      contract_start_date: installDate,
    });
  });
  $('btn-step3-confirm')?.addEventListener('click', () => {
    collectStep3();
    const { errors, warnings } = validateStep3(currentRecord);
    showMessages('step3-messages', errors, warnings);
    if (errors.length) return;
    populateConfirmation();
    showStep(4);
  });
  $('btn-step3-skip')?.addEventListener('click', () => {
    collectStep3();
    populateConfirmation();
    showStep(4);
  });
  $('btn-step3-back')?.addEventListener('click', () => { collectStep3(); populateStep2(); showStep(2); });
  $('btn-step3-draft')?.addEventListener('click', draftSave);

  // Wizard step 4 (S06)
  $('btn-confirm-register')?.addEventListener('click', finishRegistration);
  $('btn-confirm-back')?.addEventListener('click', () => { populateStep3(); showStep(3); });

  // S07 completion
  $('s07-new')?.addEventListener('click', startNewRegistration);
  $('s07-list')?.addEventListener('click', () => { renderList(); showScreen('screen-s01'); });
  $('s07-add-contract')?.addEventListener('click', () => {
    if (!currentRecord) return;
    app.addContract(currentRecord.nc_serial_no);
  });

  // S09 draft list
  $('s09-back')?.addEventListener('click', () => { renderList(); showScreen('screen-s01'); });

  // Master tabs
  $$('.master-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.master-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMasterTab(btn.dataset.master);
    });
  });

  // S08 modal
  $('s08-save')?.addEventListener('click', saveS08);
  $('s08-cancel')?.addEventListener('click', closeS08);
  $('modal-backdrop')?.addEventListener('click', closeS08);
}

function initSearchSelects() {
  const modelSel = $('search-model');
  if (modelSel) {
    modelSel.innerHTML = buildSelectOptions(masters.ncSystems, '', 'NCシステム型名（全て）');
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function main() {
  masters = await loadMasters();
  wireEvents();
  initSearchSelects();
  renderList();
  updateStepIndicator();

  // Expose computeEndDate for confirmation screen
  const { computeEndDate } = await import('./contracts.js');
  window._contracts = { computeEndDate };
}

main();

