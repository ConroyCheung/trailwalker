const SECTION_KEY = "tw-section-v1";
const TAB_KEY = "tw-tab-v1";

export type TabId = "supplies" | "gear" | "buy";

export function loadSection(): number {
  const n = Number(localStorage.getItem(SECTION_KEY));
  if (Number.isInteger(n) && n >= 1 && n <= 10) return n;
  return 1;
}

export function saveSection(id: number) {
  localStorage.setItem(SECTION_KEY, String(id));
}

export function loadTab(): TabId {
  const t = localStorage.getItem(TAB_KEY);
  if (t === "gear" || t === "buy") return t;
  return "supplies";
}

export function saveTab(tab: TabId) {
  localStorage.setItem(TAB_KEY, tab);
}
