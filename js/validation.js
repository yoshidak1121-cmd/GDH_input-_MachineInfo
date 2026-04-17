function inMaster(value, candidates) {
  return !value || candidates.includes(value);
}

export function validateRecord(record, masters, records) {
  const errors = [];

  if (!record.ncSerial?.trim()) errors.push("NCシリアル番号は必須です。");
  if (!record.contractNumber?.trim()) errors.push("契約番号は必須です。");

  if (record.contractMonths && !/^\d+$/.test(record.contractMonths)) {
    errors.push("契約期間(月数)は数値のみ入力してください。");
  }

  ["machineMemo", "ncSaleMemo", "machineAgencyMemo", "shipmentMemo", "localDealerMemo", "endUserMemo", "contractMemo", "address", "userNote"].forEach((field) => {
    if ((record[field] || "").length > 300) errors.push(`${field} は300文字以内で入力してください。`);
  });

  if (!inMaster(record.ncSystemModel, masters.ncSystems.map((x) => x.systemModelName))) errors.push("NCシステム型名が不正です。");
  if (!inMaster(record.machineMaker, masters.mtb)) errors.push("機械メーカが不正です。");
  if (!inMaster(record.ncSalesCompany, masters.salesCompanies)) errors.push("NC販売会社が不正です。");
  if (!inMaster(record.exportCountry, masters.countries)) errors.push("機械輸出先が不正です。");
  if (!inMaster(record.userCountry, masters.countries)) errors.push("ユーザ国が不正です。");
  if (!inMaster(record.serviceBase, masters.serviceBases)) errors.push("三菱サービス拠点が不正です。");
  if (!inMaster(record.contractCompany, [...masters.salesCompanies, ...masters.serviceBases])) errors.push("三菱契約受託会社が不正です。");

  if (records.some((r) => r.ncSerial === record.ncSerial)) {
    errors.push("NCシリアル番号が重複しています。");
  }

  return errors;
}
