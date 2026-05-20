// Per-step and full validation for CNC service records

function memoCheck(value, label) {
  if (value && value.length > 300) return `${label}は300文字以内で入力してください。`;
  return null;
}

export function validateStep1(record) {
  const errors = [], warnings = [];

  if (!record.nc_serial_no?.trim()) errors.push('NCシリアル番号は必須です。');

  for (const [field, label] of [['machine_memo','機械メモ'],['nc_sales_memo','NC販売メモ']]) {
    const e = memoCheck(record[field], label);
    if (e) errors.push(e);
  }

  return { errors, warnings };
}

export function validateStep2(record) {
  const errors = [], warnings = [];

  for (const [field, label] of [
    ['machine_agent_memo','機械代理店メモ'],
    ['shipment_memo','出荷メモ'],
    ['local_dealer_memo','現地機械販売店メモ'],
    ['end_user_memo','エンドユーザメモ'],
  ]) {
    const e = memoCheck(record[field], label);
    if (e) errors.push(e);
  }

  const { nc_sales_date: sales, export_date: exp, installation_date: inst } = record;
  if (sales && exp && exp < sales)
    warnings.push('警告: 機械輸出日がNC販売日より前になっています。');
  if (exp && inst && inst < exp)
    warnings.push('警告: 設置日が機械輸出日より前になっています。');

  return { errors, warnings };
}

export function validateStep3(record) {
  const errors = [], warnings = [];
  const contractNos = [];

  (record.contracts || []).forEach((c, i) => {
    const row = i + 1;
    if (!c.contract_type_code) errors.push(`契約${row}行目: 契約タイプは必須です。`);
    const period = parseInt(c.contract_period_month, 10);
    if (!c.contract_period_month || isNaN(period) || period < 1)
      errors.push(`契約${row}行目: 契約期間は1以上の整数で入力してください。`);
    if (!c.contract_start_date) errors.push(`契約${row}行目: 契約開始日は必須です。`);

    const e = memoCheck(c.contract_memo, `契約${row}行目の契約メモ`);
    if (e) errors.push(e);

    if (c.contract_no) {
      if (contractNos.includes(c.contract_no))
        warnings.push(`警告: 契約番号「${c.contract_no}」が重複しています。`);
      else contractNos.push(c.contract_no);
    }

    const inst = record.installation_date;
    if (inst && c.contract_start_date && c.contract_start_date < inst)
      warnings.push(`警告: 契約${row}行目の契約開始日が設置日より前になっています。`);
  });

  return { errors, warnings };
}

export function validateAll(record, existingRecords = [], editingSerial = null) {
  const s1 = validateStep1(record);
  const s2 = validateStep2(record);
  const s3 = validateStep3(record);

  const errors   = [...s1.errors,   ...s2.errors,   ...s3.errors];
  const warnings = [...s1.warnings, ...s2.warnings, ...s3.warnings];

  // Duplicate check for new records
  if (record.nc_serial_no && record.nc_serial_no !== editingSerial) {
    if (existingRecords.some(r => r.nc_serial_no === record.nc_serial_no))
      errors.push('NCシリアル番号が既に登録されています。');
  }

  return { errors, warnings };
}

// Kept for backward-compat (legacy single-form validation)
export function validateRecord(record, masters, records) {
  const { errors } = validateAll(record, records);
  return errors;
}

