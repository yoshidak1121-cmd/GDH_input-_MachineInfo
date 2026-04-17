function inMaster(value, candidates) {
  return !value || candidates.includes(value);
}

const memoFieldLabels = {
  machineMemo: "機械メモ",
  ncSaleMemo: "NC販売メモ",
  machineAgencyMemo: "機械代理店メモ",
  shipmentMemo: "出荷メモ",
  localDealerMemo: "現地機械販売店メモ",
  endUserMemo: "エンドユーザメモ",
  contractMemo: "契約メモ",
  address: "住所",
  userNote: "備考",
};

export function validateRecord(record, masters, records) {
  const errors = [];

  if (!record.ncSerial?.trim()) errors.push("NCシリアル番号は必須です。");
  if (!record.contractNumber?.trim()) errors.push("契約番号は必須です。");

  if (record.contractMonths) {
    const monthsText = record.contractMonths.trim();
    const monthsNumber = Number(monthsText);
    if (!/^\d+$/.test(monthsText) || !Number.isInteger(monthsNumber) || monthsNumber < 0) {
      errors.push("契約期間(月数)は0以上の整数で入力してください。");
    }
  }

  Object.keys(memoFieldLabels).forEach((field) => {
    if ((record[field] || "").length > 300) errors.push(`${memoFieldLabels[field]}は300文字以内で入力してください。`);
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
