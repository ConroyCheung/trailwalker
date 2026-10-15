import type { NodeRole } from "./elevCode";
import { SECTIONS } from "./sections";

export type ElevPick = {
  key: string;
  sectionId: number;
  kmAt: number;
  place: string;
  elevM: number;
  role: NodeRole;
};

export function elevPickKey(sectionId: number, kmAt: number): string {
  const km = Number.isFinite(kmAt) ? kmAt : 0;
  const sid = Number.isFinite(sectionId) ? sectionId : 1;
  return `${sid}:${km.toFixed(2)}`;
}

export function parseElevPickKey(key: string): { sectionId: number; kmAt: number } | null {
  const m = /^(\d+):([\d.]+)$/.exec(key.trim());
  if (!m) return null;
  const sectionId = Number(m[1]);
  const kmAt = Number(m[2]);
  if (!Number.isFinite(sectionId) || !Number.isFinite(kmAt)) return null;
  return { sectionId, kmAt };
}

export function listElevPicks(opts?: { roles?: NodeRole[] }): ElevPick[] {
  const roles = opts?.roles;
  const out: ElevPick[] = [];
  for (const s of SECTIONS) {
    for (const n of s.elevCode) {
      if (roles && !roles.includes(n.role)) continue;
      out.push({
        key: elevPickKey(s.id, n.kmAt),
        sectionId: s.id,
        kmAt: n.kmAt,
        place: n.place,
        elevM: n.elevM,
        role: n.role,
      });
    }
  }
  return out;
}

export function compareElevPick(
  a: { sectionId: number; kmAt: number },
  b: { sectionId: number; kmAt: number },
): number {
  if (a.sectionId !== b.sectionId) return a.sectionId - b.sectionId;
  return a.kmAt - b.kmAt;
}

export function findElevPick(key: string): ElevPick | null {
  const parsed = parseElevPickKey(key);
  if (!parsed) return null;
  const section = SECTIONS[parsed.sectionId - 1];
  if (!section) return null;
  const node = section.elevCode.find((n) => Math.abs(n.kmAt - parsed.kmAt) < 0.06);
  if (!node) return null;
  return {
    key: elevPickKey(section.id, node.kmAt),
    sectionId: section.id,
    kmAt: node.kmAt,
    place: node.place,
    elevM: node.elevM,
    role: node.role,
  };
}

/** 來回轉折用：極高點，離段起夠遠先有意義 */
export function listOabTurnPicks(): ElevPick[] {
  return listElevPicks({ roles: ["high"] }).filter((p) => p.kmAt >= 0.4);
}

export function elevPickLabel(p: ElevPick): string {
  const elev = p.elevM > 0 ? ` · ${p.elevM}m` : "";
  return `${p.place}${elev} · 第${p.sectionId}段`;
}

/** 起→止地形範圍距離（km） */
export function elevRangeKm(
  startSectionId: number,
  startKmAt: number,
  endSectionId: number,
  endKmAt: number,
): number {
  const a = { sectionId: startSectionId, kmAt: startKmAt };
  const b = { sectionId: endSectionId, kmAt: endKmAt };
  if (compareElevPick(a, b) > 0) {
    return elevRangeKm(endSectionId, endKmAt, startSectionId, startKmAt);
  }
  if (startSectionId === endSectionId) {
    return Math.max(0, endKmAt - startKmAt);
  }
  let km = 0;
  const startSec = SECTIONS[startSectionId - 1];
  if (startSec) km += Math.max(0, startSec.km - startKmAt);
  for (let id = startSectionId + 1; id < endSectionId; id++) {
    km += SECTIONS[id - 1]?.km ?? 0;
  }
  km += Math.max(0, endKmAt);
  return +km.toFixed(2);
}
