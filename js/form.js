export function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function fillSelect(select, values, formatter = (v) => ({ value: v, label: v })) {
  const current = select.value;
  const options = ['<option value="">選択してください</option>', ...values.map((v) => {
    const item = formatter(v);
    return `<option value="${item.value}">${item.label}</option>`;
  })];
  select.innerHTML = options.join("");
  select.value = current;
}
