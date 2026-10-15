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
  /** 由而家到呢個節點嘅距離（km） */
  distanceKm?: number;
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

/**
 * 預計到站跟地形密碼細段（elevCode），唔係大段 CP。
 * 由而家段內節點起，再接下一段範圍內嘅節點。
 */
export function buildElevCodeEtaSnapshot(opts: {
  targetHours: number;
  currentSectionId: number;
  fromSectionId: number;
  toSectionId: number;
  /** 起段內起點 kmAt（預設 0） */
  fromKmAt?: number;
  /** 止段內終點 kmAt（預設該段終） */
  toKmAt?: number;
  kmInSection: number;
  elapsedInCurrentMs: number;
  nowTs: number;
}): LiveEtaSnapshot {
  const {
    targetHours,
    currentSectionId,
    fromSectionId,
    toSectionId,
    fromKmAt = 0,
    toKmAt,
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
    paceFactor = paceMsPerKm / (allocMs / Math.max(section.km, 0.01));
  }
  const currentRemainPaceMs = remainKm * paceMsPerKm;
  const progressRatio = section.km > 0 ? km / section.km : 0;
  const aheadMs = elapsedInCurrentMs - allocMs * progressRatio;

  const start = Math.max(1, Math.min(fromSectionId, toSectionId));
  const end = Math.min(10, Math.max(fromSectionId, toSectionId));
  const endCap = toKmAt ?? SECTIONS[end - 1]?.km ?? 0;

  type ElevWp = {
    sectionId: number;
    place: string;
    elevM: number;
    /** 該段內 kmAt */
    kmAt: number;
  };

  const waypoints: ElevWp[] = [];
  for (let id = Math.max(currentSectionId, start); id <= end; id++) {
    const s = SECTIONS[id - 1];
    if (!s) continue;
    for (const n of s.elevCode) {
      if (n.kmAt <= 1e-6) continue; // 段起點唔當抵達
      if (id === start && n.kmAt <= fromKmAt + 0.05) continue;
      if (id === end && n.kmAt > endCap + 0.05) continue;
      if (id === currentSectionId && n.kmAt <= km + 0.05) continue;
      waypoints.push({
        sectionId: id,
        place: n.place,
        elevM: n.elevM,
        kmAt: n.kmAt,
      });
    }
  }

  const rows: SectionEta[] = [];
  let budgetCursor = nowTs;
  let paceCursor = nowTs;
  let prevSectionId = currentSectionId;
  let prevKm = km;
  let distFromHere = 0;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (wp.sectionId !== prevSectionId) {
      prevSectionId = wp.sectionId;
      prevKm = 0;
    }
    const seg = Math.max(0, wp.kmAt - prevKm);
    distFromHere += seg;
    const s = SECTIONS[wp.sectionId - 1];
    const sectionAllocMs = allocatedHours(targetHours, wp.sectionId) * 3600_000;
    const budgetMsPerKm = sectionAllocMs / Math.max(s.km, 0.01);
    const paceHere =
      wp.sectionId === currentSectionId ? paceMsPerKm : budgetMsPerKm * paceFactor;

    budgetCursor += seg * budgetMsPerKm;
    paceCursor += seg * paceHere;

    rows.push({
      sectionId: wp.sectionId,
      from: "而家",
      to: wp.elevM > 0 ? `${wp.place} · ${wp.elevM}m` : wp.place,
      allocatedMs: seg * budgetMsPerKm,
      budgetArriveAt: budgetCursor,
      paceArriveAt: paceCursor,
      distanceKm: +distFromHere.toFixed(2),
    });
    prevKm = wp.kmAt;
  }

  if (rows.length === 0) {
    rows.push({
      sectionId: currentSectionId,
      from: "而家",
      to: section.to,
      allocatedMs: currentRemainBudgetMs,
      budgetArriveAt: nowTs + currentRemainBudgetMs,
      paceArriveAt: nowTs + currentRemainPaceMs,
      distanceKm: +remainKm.toFixed(2),
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

type TrainingWaypoint = {
  place: string;
  elevM: number;
  /** 練習累計 kmAlong（去＋返） */
  kmAlong: number;
  leg: "out" | "back";
};

/**
 * 練行 ETA 跟地形密碼：去程節點 → 山頂 → 回程倒序同一串節點。
 * elevNodes 用 race 段內 kmAt；只取 ≤ turnRaceKm（例如針山山頂 2.0）。
 */
export function buildTrainingEtaSnapshot(opts: {
  name: string;
  totalKm: number;
  kmAlong: number;
  targetHours: number;
  elapsedMs: number;
  nowTs: number;
  /** 轉折對應 race elevCode kmAt（針山山頂 2.0） */
  turnRaceKm: number;
  /** 去程實際 track 長度（kmAlong 到山頂） */
  outKmAlong: number;
  elevNodes: ElevCodeNode[];
}): LiveEtaSnapshot {
  const totalKm = Math.max(opts.totalKm, 0.01);
  const km = Math.min(totalKm, Math.max(0, opts.kmAlong));
  const remainKm = Math.max(0, totalKm - km);
  const allocMs = Math.max(opts.targetHours, 0.01) * 3600_000;
  const currentRemainBudgetMs = Math.max(0, allocMs - opts.elapsedMs);

  let paceMsPerKm = allocMs / totalKm;
  let paceFactor = 1;
  if (km >= 0.2 && opts.elapsedMs > 60_000) {
    paceMsPerKm = opts.elapsedMs / km;
    paceFactor = paceMsPerKm / (allocMs / totalKm);
  }
  const currentRemainPaceMs = remainKm * paceMsPerKm;
  const progressRatio = km / totalKm;
  const aheadMs = opts.elapsedMs - allocMs * progressRatio;

  const turnRaceKm = Math.max(opts.turnRaceKm, 0.01);
  const outKm = Math.max(opts.outKmAlong, 0.01);
  const nodes = opts.elevNodes
    .filter((n) => n.kmAt <= turnRaceKm + 0.05)
    .slice()
    .sort((a, b) => a.kmAt - b.kmAt);

  const raceToOutAlong = (raceKm: number) => (Math.min(turnRaceKm, Math.max(0, raceKm)) / turnRaceKm) * outKm;

  const waypoints: TrainingWaypoint[] = [];
  for (const n of nodes) {
    if (n.kmAt <= 1e-6) continue; // 起點唔當「抵達」
    waypoints.push({
      place: n.place,
      elevM: n.elevM,
      kmAlong: +raceToOutAlong(n.kmAt).toFixed(3),
      leg: "out",
    });
  }
  // 回程：山頂之後倒序（含返抵起點）
  for (let i = nodes.length - 2; i >= 0; i--) {
    const n = nodes[i];
    const along = outKm + (outKm - raceToOutAlong(n.kmAt));
    waypoints.push({
      place: n.kmAt <= 1e-6 ? "返抵起點" : n.place,
      elevM: n.elevM,
      kmAlong: +Math.min(totalKm, along).toFixed(3),
      leg: "back",
    });
  }

  // 若 elev 無起點，仍保證有返抵
  if (!waypoints.some((w) => w.leg === "back" && w.kmAlong >= totalKm - 0.05)) {
    waypoints.push({
      place: "返抵起點",
      elevM: nodes[0]?.elevM ?? 0,
      kmAlong: +totalKm.toFixed(3),
      leg: "back",
    });
  }

  const remaining = waypoints.filter((w) => w.kmAlong > km + 0.04);
  const rows: SectionEta[] = [];
  let budgetCursor = opts.nowTs;
  let paceCursor = opts.nowTs;
  let prevAlong = km;
  const denom = Math.max(remainKm, 0.01);

  for (let i = 0; i < remaining.length; i++) {
    const wp = remaining[i];
    const seg = Math.max(0, wp.kmAlong - prevAlong);
    const frac = seg / denom;
    const segBudget = currentRemainBudgetMs * frac;
    const segPace = seg * paceMsPerKm;
    budgetCursor += segBudget;
    paceCursor += segPace;
    const from =
      i === 0
        ? "而家"
        : remaining[i - 1].place;
    rows.push({
      sectionId: i,
      from,
      to: wp.elevM > 0 ? `${wp.place} · ${wp.elevM}m` : wp.place,
      allocatedMs: segBudget,
      budgetArriveAt: budgetCursor,
      paceArriveAt: paceCursor,
      distanceKm: +(wp.kmAlong - km).toFixed(2),
    });
    prevAlong = wp.kmAlong;
  }

  if (rows.length === 0) {
    rows.push({
      sectionId: 0,
      from: "而家",
      to: "返抵起點",
      allocatedMs: currentRemainBudgetMs,
      budgetArriveAt: opts.nowTs + currentRemainBudgetMs,
      paceArriveAt: opts.nowTs + currentRemainPaceMs,
      distanceKm: +remainKm.toFixed(2),
    });
  }

  return {
    elapsedMs: opts.elapsedMs,
    currentRemainBudgetMs,
    currentRemainPaceMs,
    paceFactor,
    aheadMs,
    rows,
  };
}
