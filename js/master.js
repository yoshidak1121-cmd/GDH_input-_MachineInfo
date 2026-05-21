import { getUserMasters, getMasterOverrides } from './state.js';

function escAttr(str)    { return String(str ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escContent(str) { return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const FALLBACK = {
  nc_system_master: [
    { code:"FCA80P-2EA", systemModelName:"FCA80P-2EA", seriesName:"E80シリーズ", modelName:"E80 TypeA", ncControlUnit:"FCU8-MU514-001", displayUnit:"FCU8-DU121-13", displaySizeInch:8.4, touchPanel:false, is_active:true, display_order:1 },
    { code:"FCA80H-4A",  systemModelName:"FCA80H-4A",  seriesName:"M80シリーズ", modelName:"M80 TypeA", ncControlUnit:"FCU8-MU512-001", displayUnit:"FCU8-DU141-32", displaySizeInch:10.4, touchPanel:true, is_active:true, display_order:2 },
    { code:"FCA830H-4SV",systemModelName:"FCA830H-4SV",seriesName:"M800VSシリーズ",modelName:"M830VS", ncControlUnit:"FCU8-MU551-001", displayUnit:"FCU8-DU142-31", displaySizeInch:10.4, touchPanel:true, is_active:true, display_order:3 }
  ],
  sales_company_master: [
    { code:"MEJ", display_name:"三菱電機（日本）", is_active:true, can_be_contract_owner:true, company_type:"SALES", display_order:1 },
    { code:"MEE", display_name:"Mitsubishi Electric Europe", is_active:true, can_be_contract_owner:true, company_type:"SALES", display_order:2 }
  ],
  service_base_master: [
    { code:"MEAK", display_name:"MEAK (Korea)", is_active:true, can_be_contract_owner:true, company_type:"SERVICE", display_order:1 },
    { code:"MEB",  display_name:"MEB (Belgium/Europe)", is_active:true, can_be_contract_owner:true, company_type:"SERVICE", display_order:2 }
  ],
  country_master: [
    { code:"JP", display_name:"日本", is_active:true, display_order:1 },
    { code:"US", display_name:"アメリカ合衆国", is_active:true, display_order:2 },
    { code:"DE", display_name:"ドイツ", is_active:true, display_order:3 }
  ],
  mtb_master: [
    { code:"DMGMORI", display_name:"DMG MORI", is_active:true, display_order:1 },
    { code:"MAZAK",   display_name:"MAZAK", is_active:true, display_order:2 }
  ],
  contract_holder_type_master: [
    { code:"MTB",     display_name:"MTB",     description:"機械メーカが契約者となる場合", is_active:true, display_order:1 },
    { code:"DEALER",  display_name:"Dealer",  description:"代理店が契約者となる場合", is_active:true, display_order:2 },
    { code:"ENDUSER", display_name:"EndUser", description:"エンドユーザが契約者となる場合", is_active:true, display_order:3 }
  ],
  contract_type_master: [
    { code:"FULL",  display_name:"FULL",  description:"フル契約",  standard_period_month:24, is_active:true, display_order:1 },
    { code:"PARTS", display_name:"PARTS", description:"パーツ契約", standard_period_month:24, is_active:true, display_order:2 },
    { code:"EWC",   display_name:"EWC",   description:"延長保証契約", standard_period_month:12, is_active:true, display_order:3 }
  ],
};

async function loadJson(path, fallback) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('fetch failed');
    return await res.json();
  } catch (e) {
    console.warn(`マスタ読込失敗（フォールバック使用）: ${path}`, e);
    return fallback;
  }
}

export async function loadMasters() {
  const [ncSystems, salesCompanies, serviceBases, countries, mtb, contractHolderTypes, contractTypes] = await Promise.all([
    loadJson('./data/nc_system_master.json',          FALLBACK.nc_system_master),
    loadJson('./data/sales_company_master.json',      FALLBACK.sales_company_master),
    loadJson('./data/service_base_master.json',       FALLBACK.service_base_master),
    loadJson('./data/country_master.json',            FALLBACK.country_master),
    loadJson('./data/mtb_master.json',                FALLBACK.mtb_master),
    loadJson('./data/contract_holder_type_master.json', FALLBACK.contract_holder_type_master),
    loadJson('./data/contract_type_master.json',      FALLBACK.contract_type_master),
  ]);

  const userMasters = getUserMasters();
  const overrides   = getMasterOverrides();

  function merge(base, user) {
    if (!user || !user.length) return base;
    const codes = new Set(base.map(m => m.code));
    return [...base, ...user.filter(m => !codes.has(m.code))];
  }

  /** Apply is_active overrides stored by toggleMasterItem */
  function applyOverrides(list, masterType) {
    const mt = overrides[masterType];
    if (!mt) return list;
    return list.map(m => mt.hasOwnProperty(m.code) ? { ...m, is_active: mt[m.code] } : m);
  }

  return {
    ncSystems:           applyOverrides(merge(ncSystems, userMasters.ncSystems), 'ncSystem'),
    salesCompanies:      applyOverrides(merge(salesCompanies, userMasters.salesCompanies), 'salesCompany'),
    serviceBases:        applyOverrides(merge(serviceBases, userMasters.serviceBases), 'serviceBase'),
    countries:           applyOverrides(countries, 'country'),
    mtb:                 applyOverrides(merge(mtb, userMasters.mtb), 'mtb'),
    contractHolderTypes: applyOverrides(contractHolderTypes, 'contractHolderType'),
    contractTypes:       applyOverrides(contractTypes, 'contractType'),
  };
}

/** Active items sorted by display_order → code → display_name */
export function activeItems(list) {
  return list
    .filter(m => m.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || (a.code || '').localeCompare(b.code || ''));
}

/** All items for a dropdown; inactive items get "(無効)" suffix */
export function allItemsForDropdown(list, currentCode = '') {
  const sorted = [...list].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return (a.display_order || 0) - (b.display_order || 0);
  });

  return sorted.map(m => {
    const isCurrentInactive = !m.is_active && m.code === currentCode;
    const show = m.is_active || isCurrentInactive;
    if (!show) return null;
    const baseName = m.display_name || m.systemModelName || m.code;
    const label = m.is_active ? baseName : `${baseName}（無効）`;
    return { value: m.code, label };
  }).filter(Boolean);
}

/** Build <option> HTML for a select, respecting active/inactive */
export function buildSelectOptions(list, currentCode = '', placeholder = '選択してください') {
  const items = allItemsForDropdown(list, currentCode);
  const opts = [`<option value="">${placeholder}</option>`];
  items.forEach(item => {
    const sel = item.value === currentCode ? ' selected' : '';
    const val = escAttr(item.value);
    const lbl = escContent(item.label);
    opts.push(`<option value="${val}"${sel}>${lbl}</option>`);
  });
  return opts.join('');
}

/** Build combined contract-owner options (sales + service, can_be_contract_owner) */
export function buildContractOwnerOptions(masters, currentCode = '') {
  const combined = [
    ...masters.salesCompanies.filter(m => m.can_be_contract_owner),
    ...masters.serviceBases.filter(m => m.can_be_contract_owner),
  ];
  // Deduplicate by code (prefer salesCompany if duplicated)
  const seen = new Set();
  const unique = combined.filter(m => {
    if (seen.has(m.code)) return false;
    seen.add(m.code);
    return true;
  });
  return buildSelectOptions(unique, currentCode);
}

/** Look up display name by code in a list */
export function findDisplayName(list, code, fallback = '') {
  if (!code) return fallback;
  const found = list.find(m => m.code === code);
  if (!found) return code;
  const baseName = found.display_name || found.systemModelName || found.code;
  return found.is_active ? baseName : `${baseName}（無効）`;
}
