// Contract table management: add / delete / copy rows, end-date auto-calc

import { buildSelectOptions, buildContractOwnerOptions } from './master.js';

let rowCounter = 0;

/** Calculate contract end date: start + months - 1 day */
export function computeEndDate(startDate, months) {
  if (!startDate || !months) return '';
  const m = parseInt(months, 10);
  if (isNaN(m) || m < 1) return '';
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + m);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(isoDate) {
  return isoDate ? isoDate.replace(/-/g, '/') : '';
}

/** Build a single contract row <tr> element */
export function buildContractRow(masters, data = {}) {
  rowCounter++;
  const id = `cr-${rowCounter}`;

  const holderSel = buildSelectOptions(masters.contractHolderTypes, data.contract_holder_type_code || 'MTB');
  const ownerSel  = buildContractOwnerOptions(masters, data.contract_owner_code || '');
  const baseSel   = buildSelectOptions(masters.serviceBases, data.service_base_code || '');
  const typeSel   = buildSelectOptions(masters.contractTypes, data.contract_type_code || 'FULL');

  const endDate = computeEndDate(data.contract_start_date, data.contract_period_month);

  const tr = document.createElement('tr');
  tr.className = 'contract-row';
  tr.dataset.rowId = id;

  function makeCell(child) {
    const td = document.createElement('td');
    if (typeof child === 'string') td.innerHTML = child; // only for pre-built select HTML
    else td.appendChild(child);
    return td;
  }

  // Row number cell
  const noTd = document.createElement('td');
  noTd.className = 'contract-row-no';
  tr.appendChild(noTd);

  // Dropdown cells (innerHTML of select options is safe because buildSelectOptions escapes values)
  for (const [cls, field, selHtml] of [
    ['f-holder', 'contract_holder_type_code', holderSel],
    ['f-owner',  'contract_owner_code',        ownerSel],
    ['f-base',   'service_base_code',           baseSel],
  ]) {
    const td = document.createElement('td');
    const sel = document.createElement('select');
    sel.className = cls;
    sel.dataset.field = field;
    sel.innerHTML = selHtml;
    td.appendChild(sel);
    tr.appendChild(td);
  }

  // Contract number input
  const noInputTd = document.createElement('td');
  const noInput = document.createElement('input');
  noInput.className = 'f-no'; noInput.dataset.field = 'contract_no';
  noInput.type = 'text'; noInput.maxLength = 20;
  noInput.value = data.contract_no || '';
  noInputTd.appendChild(noInput);
  tr.appendChild(noInputTd);

  // Contract type select
  const typeTd = document.createElement('td');
  const typeSel2 = document.createElement('select');
  typeSel2.className = 'f-type'; typeSel2.dataset.field = 'contract_type_code';
  typeSel2.innerHTML = typeSel;
  typeTd.appendChild(typeSel2);
  tr.appendChild(typeTd);

  // Contract period input
  const periodTd = document.createElement('td');
  const periodInput = document.createElement('input');
  periodInput.className = 'f-period'; periodInput.dataset.field = 'contract_period_month';
  periodInput.type = 'number'; periodInput.min = '1'; periodInput.step = '1';
  periodInput.value = String(data.contract_period_month ?? 24);
  periodInput.style.width = '60px';
  periodTd.appendChild(periodInput);
  tr.appendChild(periodTd);

  // Start date input
  const startTd = document.createElement('td');
  const startInput = document.createElement('input');
  startInput.className = 'f-start'; startInput.dataset.field = 'contract_start_date';
  startInput.type = 'date'; startInput.value = data.contract_start_date || '';
  startTd.appendChild(startInput);
  tr.appendChild(startTd);

  // End date span (auto-calc)
  const endTd = document.createElement('td');
  const endSpan = document.createElement('span');
  endSpan.className = 'f-end contract-end-date';
  endSpan.textContent = formatDateDisplay(endDate);
  endTd.appendChild(endSpan);
  tr.appendChild(endTd);

  // Contract memo textarea
  const memoTd = document.createElement('td');
  const memoArea = document.createElement('textarea');
  memoArea.className = 'f-memo'; memoArea.dataset.field = 'contract_memo';
  memoArea.maxLength = 300; memoArea.rows = 2;
  memoArea.value = data.contract_memo || '';
  memoTd.appendChild(memoArea);
  tr.appendChild(memoTd);

  // Action buttons
  const actionTd = document.createElement('td');
  actionTd.className = 'contract-row-actions';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button'; copyBtn.className = 'btn-sm btn-copy-row';
  copyBtn.title = 'コピー'; copyBtn.textContent = '📋';
  const delBtn = document.createElement('button');
  delBtn.type = 'button'; delBtn.className = 'btn-sm btn-delete-row';
  delBtn.title = '削除'; delBtn.textContent = '🗑';
  actionTd.appendChild(copyBtn); actionTd.appendChild(delBtn);
  tr.appendChild(actionTd);

  // Auto-update end date when start or period changes
  function updateEndDate() {
    endSpan.textContent = formatDateDisplay(computeEndDate(startInput.value, periodInput.value));
  }

  startInput.addEventListener('change', updateEndDate);
  periodInput.addEventListener('input',  updateEndDate);

  return tr;
}

/** Get data object from a contract row */
export function getRowData(tr) {
  const get = (sel) => tr.querySelector(sel);
  return {
    contract_holder_type_code: get('.f-holder')?.value || '',
    contract_owner_code:       get('.f-owner')?.value  || '',
    service_base_code:         get('.f-base')?.value   || '',
    contract_no:               get('.f-no')?.value     || '',
    contract_type_code:        get('.f-type')?.value   || '',
    contract_period_month:     parseInt(get('.f-period')?.value || '24', 10),
    contract_start_date:       get('.f-start')?.value  || '',
    contract_memo:             get('.f-memo')?.value   || '',
  };
}

/** Get all contract rows' data from tbody */
export function getAllContracts(tbody) {
  return [...tbody.querySelectorAll('.contract-row')].map(tr => getRowData(tr));
}

/** Re-number rows after add/delete */
function renumberRows(tbody) {
  tbody.querySelectorAll('.contract-row').forEach((tr, i) => {
    tr.querySelector('.contract-row-no').textContent = i + 1;
  });
}

/** Add a new contract row to tbody */
export function addContractRow(tbody, masters, defaults = {}) {
  const tr = buildContractRow(masters, defaults);
  tbody.appendChild(tr);
  renumberRows(tbody);
  attachRowHandlers(tr, tbody, masters);
  return tr;
}

/** Render all contracts into tbody (clears existing rows) */
export function renderContractTable(tbody, contracts, masters) {
  tbody.innerHTML = '';
  (contracts || []).forEach(c => {
    const tr = buildContractRow(masters, c);
    tbody.appendChild(tr);
    attachRowHandlers(tr, tbody, masters);
  });
  renumberRows(tbody);
}

function attachRowHandlers(tr, tbody, masters) {
  tr.querySelector('.btn-delete-row').addEventListener('click', () => {
    tr.remove();
    renumberRows(tbody);
  });

  tr.querySelector('.btn-copy-row').addEventListener('click', () => {
    const data = getRowData(tr);
    // On copy: clear contract number and start date per spec
    const nextTr = buildContractRow(masters, {
      ...data,
      contract_no: '',
      contract_start_date: '',
      contract_memo: '',
    });
    tr.insertAdjacentElement('afterend', nextTr);
    renumberRows(tbody);
    attachRowHandlers(nextTr, tbody, masters);
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
