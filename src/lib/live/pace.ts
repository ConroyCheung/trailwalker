import { SECTIONS, type Section } from "../../data/sections";
import type { ElevCodeNode } from "../../data/elevCode";

export const DEFAULT_TARGET_HOURS = 36;
export const HOURS_WEIGHT_SUM = SECTIONS.reduce((n, s) => n + s.hours, 0);

export function allocatedHours(targetHours: number, sectionId: number): number {
  const section = SECTIONS[sectionId - 1];
  if (!section || HOURS_WEIGHT_SUM <= 0) return 0;
  return targetHours * (section.hours / HOURS_WEIGHT_SUM);
}

export function clampKm(section: Section, km: number): number {
  return Math.min(section.km, Math.max(0, km));
}

/** 段內進度：已過最近節點 + 下一個節點 */
export function terrainAt(section: Section, kmInSection: number): {
  current: ElevCodeNode;
  next: ElevCodeNode | null;
  index: number;
} {
  const km = clampKm(section, kmInSection);
  const nodes = section.elevCode;
  let index = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].kmAt <= km + 1e-6) index = i;
    else break;
  }
  return {
    current: nodes[index],
    next: index + 1 < nodes.length ? nodes[index + 1] : null,
    index,
  };
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type SectionEta = {
  sectionId: number;
  from: string;
  to: string;
  allocatedMs: number;
  /** 按目標分配累加嘅預計到站 */
  budgetArriveAt: number;
  /** 按而家 pace 縮放嘅預計到站 */
  paceArriveAt: number;
};

export type LiveEtaSnapshot = {
  elapsedMs: number;
  currentRemainBudgetMs: number;
  currentRemainPaceMs: number;
  paceFactor: number;
  aheadMs: number;
  rows: SectionEta[];
};

/**
 * @param elapsedInCurrentMs 本段已用時間（唔計暫停）
 * @param kmInSection 本段已行 km
 * @param fromSectionId 今日起點段
 * @param toSectionId 今日結束段（含）
 * @param nowTs 而家
 */
export function buildEtaSnapshot(opts: {
  targetHours: number;
  currentSectionId: number;
  fromSectionId: number;
  toSectionId: number;
  kmInSection: number;
  elapsedInCurrentMs: number;
  nowTs: number;
}): LiveEtaSnapshot {
  const {
    targetHours,
    currentSectionId,
    fromSectionId,
    toSectionId,
    kmInSection,
    elapsedInCurrentMs,
    nowTs,
  } = opts;

  const section = SECTIONS[currentSectionId - 1];
  const allocMs = allocatedHours(targetHours, currentSectionId) * 3600_000;
  const km = clampKm(section, kmInSection);
  const remainKm = Math.max(0, section.km - km);

  const currentRemainBudgetMs = Math.max(0, allocMs - elapsedInCurrentMs);

  let paceMsPerKm = allocMs / Math.max(section.km, 0.01);
  let paceFactor = 1;
  if (km >= 0.3 && elapsedInCurrentMs > 60_000) {
    paceMsPerKm = elapsedInCurrentMs / km;
    const plannedMsPerKm = allocMs / Math.max(section.km, 0.01);
    paceFactor = paceMsPerKm / plannedMsPerKm;
  }
  const currentRemainPaceMs = remainKm * paceMsPerKm;

  /** 相對預算：正＝慢／遲，負＝快／早 */
  const progressRatio = section.km > 0 ? km / section.km : 0;
  const expectedElapsed = allocMs * progressRatio;
  const aheadMs = elapsedInCurrentMs - expectedElapsed;

  const start = Math.max(1, Math.min(fromSectionId, toSectionId));
  const end = Math.min(10, Math.max(fromSectionId, toSectionId));

  const rows: SectionEta[] = [];
  let budgetCursor = nowTs + currentRemainBudgetMs;
  let paceCursor = nowTs + currentRemainPaceMs;

  for (let id = currentSectionId; id <= end; id++) {
    if (id < start) continue;
    const s = SECTIONS[id - 1];
    const allocatedMs = allocatedHours(targetHours, id) * 3600_000;

    if (id === currentSectionId) {
      rows.push({
        sectionId: id,
        from: s.from,
        to: s.to,
        allocatedMs,
        budgetArriveAt: budgetCursor,
        paceArriveAt: paceCursor,
      });
      continue;
    }

    budgetCursor += allocatedMs;
    paceCursor += allocatedMs * paceFactor;
    rows.push({
      sectionId: id,
      from: s.from,
      to: s.to,
      allocatedMs,
      budgetArriveAt: budgetCursor,
      paceArriveAt: paceCursor,
    });
  }

  return {
    elapsedMs: elapsedInCurrentMs,
    currentRemainBudgetMs,
    currentRemainPaceMs,
    paceFactor,
    aheadMs,
    rows,
  };
}
