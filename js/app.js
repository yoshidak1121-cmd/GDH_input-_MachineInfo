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
const liveSummaryBody = document.querySelector("#live-summary-body");
const toggleLiveSummaryBtn = document.querySelector("#toggle-live-summary-btn");
const masterRef = document.querySelector("#master-reference");

const records = [];
let masters = null;

function setMessage(text, type = "error") {
  errorEl.textContent = text;
  errorEl.classList.remove("error", "success");
  if (text) errorEl.classList.add(type);
}

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

function setLiveSummaryVisible(visible) {
  liveSummaryBody.hidden = !visible;
  toggleLiveSummaryBtn.textContent = visible ? "折りたたむ" : "表示";
  toggleLiveSummaryBtn.setAttribute("aria-expanded", visible ? "true" : "false");
}

async function main() {
  masters = await loadMasters();
  bindMasterOptions();
  updateCurrentView();
  setLiveSummaryVisible(false);

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
      setMessage(errors[0], "error");
      return;
    }

    records.push(record);
    renderRecords(recordsBody, records);
    setMessage("登録しました。", "success");
  });

  clearBtn.addEventListener("click", () => {
    form.reset();
    applyNcSystemAttributes("");
    setMessage("");
    updateCurrentView();
  });

  copyBtn.addEventListener("click", async () => {
    const text = recordsToClipboardText(records);
    try {
      await navigator.clipboard.writeText(text);
      setMessage("一覧をクリップボードへコピーしました。", "success");
    } catch {
      setMessage("コピーに失敗しました。", "error");
    }
  });

  toggleLiveSummaryBtn.addEventListener("click", () => {
    setLiveSummaryVisible(liveSummaryBody.hidden);
  });
}

main();
