const FALLBACK = {
  nc_system_master: [
    { systemModelName: "FCA80P-2EA", seriesName: "E80シリーズ", modelName: "E80 TypeA", ncControlUnit: "FCU8-MU514-001", displayUnit: "FCU8-DU121-13", displaySizeInch: 8.4, touchPanel: false },
    { systemModelName: "FCA80H-4A", seriesName: "M80シリーズ", modelName: "M80 TypeA", ncControlUnit: "FCU8-MU512-001", displayUnit: "FCU8-DU141-32", displaySizeInch: 10.4, touchPanel: true },
    { systemModelName: "FCA830H-4SV", seriesName: "M800VSシリーズ", modelName: "M830VS", ncControlUnit: "FCU8-MU551-001", displayUnit: "FCU8-DU142-31", displaySizeInch: 10.4, touchPanel: true }
  ],
  sales_company_master: ["Mitsubishi Electric Japan", "Mitsubishi Electric Europe", "Mitsubishi Electric Americas"],
  service_base_master: ["Tokyo Service", "Nagoya Service", "Frankfurt Service", "Chicago Service"],
  country_master: ["JP", "US", "DE", "CN", "TH", "IN"],
  mtb_master: ["DMG MORI", "MAZAK", "OKUMA", "牧野フライス"],
  user_master: [
    {
      userId: "U001",
      userType: "MTB",
      companyName: "DMG MORI",
      departmentName: "製造技術部",
      contactName: "山田 太郎",
      email: "taro.yamada@example.com",
      phone: "+81-3-1111-2222",
      country: "JP",
      address: "東京都千代田区1-1-1",
    },
    {
      userId: "U002",
      userType: "Dealer",
      companyName: "Global Machines GmbH",
      departmentName: "Sales",
      contactName: "Anna Müller",
      email: "anna.mueller@example.com",
      phone: "+49-69-5555-0101",
      country: "DE",
      address: "Mainzer Landstraße 10, Frankfurt",
    },
  ],
};

async function loadJson(path, fallbackData) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("fetch failed");
    return await res.json();
  } catch (error) {
    console.warn(`マスタ読込に失敗したためフォールバックを使用します: ${path}`, error);
    return fallbackData;
  }
}

export async function loadMasters() {
  const [ncSystems, salesCompanies, serviceBases, countries, mtb, users] = await Promise.all([
    loadJson("./data/nc_system_master.json", FALLBACK.nc_system_master),
    loadJson("./data/sales_company_master.json", FALLBACK.sales_company_master),
    loadJson("./data/service_base_master.json", FALLBACK.service_base_master),
    loadJson("./data/country_master.json", FALLBACK.country_master),
    loadJson("./data/mtb_master.json", FALLBACK.mtb_master),
    loadJson("./data/user_master.json", FALLBACK.user_master),
  ]);

  return {
    ncSystems,
    salesCompanies,
    serviceBases,
    countries,
    mtb,
    users,
    userIds: users.map((u) => u.userId),
    userTypes: [...new Set(users.map((u) => u.userType))],
  };
}
