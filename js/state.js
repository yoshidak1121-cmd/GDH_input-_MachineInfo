// State management with localStorage persistence

const STORAGE_KEY_RECORDS   = 'cnc_records';
const STORAGE_KEY_DRAFTS    = 'cnc_drafts';
const STORAGE_KEY_UMASTERS  = 'cnc_user_masters';
const STORAGE_KEY_MOVERRIDES = 'cnc_master_overrides';

export function getRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]'); }
  catch { return []; }
}

export function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
}

export function saveRecord(record) {
  const records = getRecords();
  const idx = records.findIndex(r => r.nc_serial_no === record.nc_serial_no);
  record.updated_at = new Date().toISOString();
  if (idx >= 0) {
    records[idx] = record;
  } else {
    if (!record.created_at) record.created_at = new Date().toISOString();
    records.push(record);
  }
  saveRecords(records);
}

export function deleteRecord(nc_serial_no) {
  const records = getRecords().filter(r => r.nc_serial_no !== nc_serial_no);
  saveRecords(records);
}

export function getRecord(nc_serial_no) {
  return getRecords().find(r => r.nc_serial_no === nc_serial_no) || null;
}

export function getDrafts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || '[]'); }
  catch { return []; }
}

export function saveDraft(draft) {
  const drafts = getDrafts();
  const idx = drafts.findIndex(d => d.nc_serial_no === draft.nc_serial_no);
  draft.updated_at = new Date().toISOString();
  if (idx >= 0) {
    drafts[idx] = draft;
  } else {
    if (!draft.created_at) draft.created_at = new Date().toISOString();
    drafts.push(draft);
  }
  localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
}

export function deleteDraft(nc_serial_no) {
  const drafts = getDrafts().filter(d => d.nc_serial_no !== nc_serial_no);
  localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
}

export function getDraft(nc_serial_no) {
  return getDrafts().find(d => d.nc_serial_no === nc_serial_no) || null;
}

export function getUserMasters() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_UMASTERS) || '{}'); }
  catch { return {}; }
}

export function addUserMaster(masterType, item) {
  const masters = getUserMasters();
  if (!masters[masterType]) masters[masterType] = [];
  if (masters[masterType].some(m => m.code === item.code)) {
    throw new Error(`コード「${item.code}」は既に登録されています。`);
  }
  masters[masterType].push(item);
  localStorage.setItem(STORAGE_KEY_UMASTERS, JSON.stringify(masters));
}

export function toggleUserMasterActive(masterType, code) {
  const masters = getUserMasters();
  const item = (masters[masterType] || []).find(m => m.code === code);
  if (item) item.is_active = !item.is_active;
  localStorage.setItem(STORAGE_KEY_UMASTERS, JSON.stringify(masters));
}

/** Get override map for master active states (covers both base and user masters) */
export function getMasterOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_MOVERRIDES) || '{}'); }
  catch { return {}; }
}

/**
 * Toggle a master item's active state.
 * Works for both base JSON masters and user-added masters.
 * @param {string} masterType - e.g. 'ncSystem', 'mtb', ...
 * @param {string} code - master item code
 * @param {boolean} currentIsActive - current is_active value to toggle from
 */
export function toggleMasterItem(masterType, code, currentIsActive) {
  const newActive = !currentIsActive;

  // Store override (applies to all masters including base JSON)
  const overrides = getMasterOverrides();
  if (!overrides[masterType]) overrides[masterType] = {};
  overrides[masterType][code] = newActive;
  localStorage.setItem(STORAGE_KEY_MOVERRIDES, JSON.stringify(overrides));

  // Also update userMasters entry if present (keeps the two stores in sync)
  const um = getUserMasters();
  const item = (um[masterType] || []).find(m => m.code === code);
  if (item) {
    item.is_active = newActive;
    localStorage.setItem(STORAGE_KEY_UMASTERS, JSON.stringify(um));
  }
}

export function computeStatus(record, options = {}) {
  const { finalize = false, warningCount = 0 } = options;
  if (!record.nc_serial_no) return '下書き';

  const hasBasic = !!(record.nc_system_model || record.machine_model || record.nc_sales_company_code);
  if (!hasBasic) return '下書き';

  const hasInstall = !!(record.installation_date || record.end_user || record.export_country_code);
  const hasContracts = !!(record.contracts && record.contracts.length > 0);

  if (finalize) {
    if (warningCount > 0) return '要確認';
    if (hasContracts) return '登録完了';
    return '契約未登録';
  }

  if (hasContracts) return '契約情報登録済み';
  if (hasInstall) return '設置情報登録済み';
  return '基本情報登録済み';
}

export function createNewRecord(nc_serial_no) {
  const now = new Date().toISOString();
  return {
    nc_serial_no,
    nc_system_model: '', nc_bom_no: '', nc_spec_no: '',
    machine_model: '', machine_serial_no: '', mtb_code: '', machine_memo: '',
    nc_sales_date: '', nc_sales_company_code: '', nc_sales_memo: '',
    machine_agent: '', machine_agent_memo: '',
    export_date: '', export_country_code: '', shipment_memo: '',
    local_dealer: '', local_dealer_memo: '',
    end_user: '', end_user_memo: '',
    installation_date: '',
    registration_status: '下書き',
    contracts: [],
    created_at: now,
    updated_at: now,
  };
}

export function formatDate(isoDate) {
  if (!isoDate) return '';
  return isoDate.replace(/-/g, '/');
}

export function getMissingSteps(record) {
  const missing = [];
  if (!record.nc_system_model && !record.machine_model && !record.nc_sales_company_code) {
    missing.push('基本情報');
  }
  if (!record.installation_date && !record.end_user && !record.export_country_code) {
    missing.push('輸出・設置情報');
  }
  if (!record.contracts || record.contracts.length === 0) {
    missing.push('契約情報');
  }
  return missing;
}
