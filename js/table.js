const DISPLAY_FIELDS = [
  ["ncSerial", "NCシリアル番号"],
  ["ncSystemModel", "NCシステム型名"],
  ["machineSerial", "機械シリアル番号"],
  ["endUser", "エンドユーザ"],
  ["contractNumber", "契約番号"],
  ["installationDate", "設置日"],
  ["contractStartDate", "契約開始日"],
];

export function renderCurrentValues(tableBody, record) {
  tableBody.innerHTML = DISPLAY_FIELDS.map(([key, label]) => `<tr><th>${label}</th><td>${record[key] || ""}</td></tr>`).join("");
}

export function renderRecords(tableBody, records) {
  tableBody.innerHTML = records.map((r, idx) => {
    return `<tr><td>${idx + 1}</td><td>${r.ncSerial || ""}</td><td>${r.ncSystemModel || ""}</td><td>${r.machineSerial || ""}</td><td>${r.endUser || ""}</td><td>${r.contractNumber || ""}</td></tr>`;
  }).join("");
}

export function recordsToClipboardText(records) {
  const header = ["No", "NCシリアル番号", "NCシステム型名", "機械シリアル番号", "エンドユーザ", "契約番号"];
  const rows = records.map((r, i) => [i + 1, r.ncSerial, r.ncSystemModel, r.machineSerial, r.endUser, r.contractNumber]);
  return [header, ...rows].map((line) => line.map((x) => `${x ?? ""}`).join("\t")).join("\n");
}

export function renderMasterReference(target, masters) {
  const chunks = [
    ["NCシステム型名マスタ", masters.ncSystems.map((m) => `${m.systemModelName} / ${m.seriesName} / ${m.modelName}`)],
    ["販売会社マスタ", masters.salesCompanies],
    ["サービス拠点マスタ", masters.serviceBases],
    ["国マスタ", masters.countries],
    ["MTBマスタ", masters.mtb],
  ];

  target.innerHTML = chunks.map(([title, rows]) => `
    <details>
      <summary>${title}</summary>
      <ul>${rows.map((r) => `<li>${r}</li>`).join("")}</ul>
    </details>
  `).join("");
}
