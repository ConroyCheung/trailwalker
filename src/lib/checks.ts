const KEY = "tw-checks-v1";

function load(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function save(map: Record<string, boolean>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function isChecked(itemKey: string): boolean {
  return Boolean(load()[itemKey]);
}

export function toggleChecked(itemKey: string): boolean {
  const map = load();
  const next = !map[itemKey];
  if (next) map[itemKey] = true;
  else delete map[itemKey];
  save(map);
  return next;
}

export function itemKey(sectionId: number, tab: "supplies" | "gear", itemId: string) {
  return `s${sectionId}:${tab}:${itemId}`;
}

export function buyKey(itemId: string) {
  return `buy:${itemId}`;
}
