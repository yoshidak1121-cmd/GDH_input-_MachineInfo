import { loadMasters } from "./master.js";
import { fillSelect, formToObject } from "./form.js";
import { validateRecord } from "./validation.js";
import { renderCurrentValues, renderRecords, recordsToClipboardText, renderMasterReference } from "./table.js";

const form = document.querySelector("#registration-form");
const currentValuesBody = document.querySelector("#current-values-table tbody");
const recordsBody = document.querySelector("#records-table tbody");
const errorEl = document.querySelector("#form-error");
const clearBtn = document.querySelector("#clear-btn");
const copyBtn = document.querySelector("#copy-list-btn");
const masterRef = document.querySelector("#master-reference");

const records = [];
let masters;

function updateCurrentView() {
  const record = formToObject(form);
  renderCurrentValues(currentValuesBody, record);
}

function applyNcSystemAttributes(modelName) {
  const attrs = masters.ncSystems.find((x) => x.systemModelName === modelName);
  const set = (name, value = "") => { form.elements[name].value = value; };

  if (!attrs) {
    ["seriesName", "modelName", "controlUnit", "displayUnit", "displaySizeInch", "touchPanel"].forEach((f) => set(f, ""));
    return;
  }

  set("seriesName", attrs.seriesName);
  set("modelName", attrs.modelName);
  set("controlUnit", attrs.ncControlUnit);
  set("displayUnit", attrs.displayUnit);
  set("displaySizeInch", attrs.displaySizeInch);
  set("touchPanel", attrs.touchPanel ? "TRUE" : "FALSE");
}

function bindMasterOptions() {
  fillSelect(form.elements.ncSystemModel, masters.ncSystems, (m) => ({ value: m.systemModelName, label: m.systemModelName }));
  fillSelect(form.elements.machineMaker, masters.mtb);
  fillSelect(form.elements.ncSalesCompany, masters.salesCompanies);
  fillSelect(form.elements.exportCountry, masters.countries);
  fillSelect(form.elements.userCountry, masters.countries);
  fillSelect(form.elements.serviceBase, masters.serviceBases);
  fillSelect(form.elements.contractCompany, [...masters.salesCompanies, ...masters.serviceBases]);
  renderMasterReference(masterRef, masters);
}

function onInstallationDateChange() {
  if (!form.elements.contractStartDate.value && form.elements.installationDate.value) {
    form.elements.contractStartDate.value = form.elements.installationDate.value;
  }
}

async function main() {
  masters = await loadMasters();
  bindMasterOptions();
  updateCurrentView();

  form.addEventListener("input", updateCurrentView);
  form.elements.ncSystemModel.addEventListener("change", (e) => {
    applyNcSystemAttributes(e.target.value);
    updateCurrentView();
  });

  form.elements.installationDate.addEventListener("change", () => {
    onInstallationDateChange();
    updateCurrentView();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = formToObject(form);
    const errors = validateRecord(record, masters, records);
    if (errors.length > 0) {
      errorEl.textContent = errors[0];
      return;
    }

    records.push(record);
    renderRecords(recordsBody, records);
    errorEl.textContent = "登録しました。";
  });

  clearBtn.addEventListener("click", () => {
    form.reset();
    applyNcSystemAttributes("");
    errorEl.textContent = "";
    updateCurrentView();
  });

  copyBtn.addEventListener("click", async () => {
    const text = recordsToClipboardText(records);
    try {
      await navigator.clipboard.writeText(text);
      errorEl.textContent = "一覧をクリップボードへコピーしました。";
    } catch {
      errorEl.textContent = "コピーに失敗しました。";
    }
  });
}

main();
