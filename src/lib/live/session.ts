import { findElevPick } from "../../data/elevPicks";
import { SECTIONS } from "../../data/sections";
import { DEFAULT_OAB_TRAINING_ID, getTraining } from "../../data/trainings";
import { DEFAULT_TARGET_HOURS } from "./pace";

const LIVE_KEY = "tw-live-v2";
const LIVE_KEY_LEGACY = "tw-live-v1";

export type LiveStatus = "idle" | "ready" | "running" | "paused" | "ended";

export type LiveSummary = {
  endedAt: number;
  practiceMs: number;
  fromSectionId: number;
  toSectionId: number;
  /** 最後所在段 */
  lastSectionId: number;
  kmInLastSection: number;
  gpsKmTotal: number;
  targetHours: number;
  trainingId?: string | null;
  trainingName?: string | null;
};

export type LiveSession = {
  targetHours: number;
  startSectionId: number;
  endSectionId: number;
  /** OTW：起點地形細段段內 kmAt */
  startKmAt: number;
  /** OTW：終點地形細段段內 kmAt（相對 endSectionId） */
  endKmAt: number;
  currentSectionId: number;
  kmInSection: number;
  /** 本段開始時間戳；換段時重置 */
  sectionStartedAt: number | null;
  /** 本段暫停累積 ms */
  sectionPausedMs: number;
  pausedAt: number | null;
  /** 整場練習開始 */
  practiceStartedAt: number | null;
  /** 整場暫停累積 ms */
  practicePausedMs: number;
  status: LiveStatus;
  gpsOn: boolean;
  /** GPS 跟蹤進度（開住先累距／認路推 slider） */
  gpsFollow: boolean;
  /** 在軌道上時自動切段 */
  autoSection: boolean;
  lastGpsLat: number | null;
  lastGpsLng: number | null;
  gpsKmTotal: number;
  /** 已完成段嘅實際用時（換段時寫入） */
  sectionElapsedLog: Record<string, number>;
  summary: LiveSummary | null;
  /** 自訂練行（例如針山來回）；null = OTW 段範圍 */
  trainingId: string | null;
  /** 練行目標用時（小時） */
  trainingTargetHours: number;
  /** 計劃練習開始時間（HH:MM，本地）—— ready 時 ETA 用呢個做基準 */
  plannedStartTime: string;
};

/** 而家時間 → "HH:MM" */
export function formatTimeInput(ts = Date.now()): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 將 HH:MM 轉成今日（或明日）時間戳。
 * 若已過超過 6 小時，當明日；否則仍用今日（准遲起步）。
 */
export function plannedStartTimestamp(clock: string, nowTs = Date.now()): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!m) return nowTs;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  const d = new Date(nowTs);
  d.setHours(h, min, 0, 0);
  if (d.getTime() < nowTs - 6 * 3600_000) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function clampPlannedStartTime(v: unknown, fallback = formatTimeInput()): string {
  if (typeof v !== "string") return fallback;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function sectionEndKmAt(sectionId: number): number {
  const s = SECTIONS[sectionId - 1];
  if (!s) return 0;
  return s.elevCode.at(-1)?.kmAt ?? s.km;
}

export function defaultLiveSession(sectionId = 1): LiveSession {
  const id = Math.min(10, Math.max(1, sectionId));
  return {
    targetHours: DEFAULT_TARGET_HOURS,
    startSectionId: id,
    endSectionId: 10,
    startKmAt: 0,
    endKmAt: sectionEndKmAt(10),
    currentSectionId: id,
    kmInSection: 0,
    sectionStartedAt: null,
    sectionPausedMs: 0,
    pausedAt: null,
    practiceStartedAt: null,
    practicePausedMs: 0,
    status: "idle",
    gpsOn: false,
    gpsFollow: true,
    autoSection: true,
    lastGpsLat: null,
    lastGpsLng: null,
    gpsKmTotal: 0,
    sectionElapsedLog: {},
    summary: null,
    trainingId: null,
    trainingTargetHours: 1.5,
    plannedStartTime: formatTimeInput(),
  };
}

/** 確保新欄位齊（HMR／舊 localStorage／partial patch 都唔缺 startKmAt） */
export function normalizeLiveSession(raw: Partial<LiveSession> | null | undefined): LiveSession {
  const base = defaultLiveSession(raw?.currentSectionId ?? raw?.startSectionId ?? 1);
  if (!raw) return base;
  let trainingId =
    typeof raw.trainingId === "string" && getTraining(raw.trainingId) ? raw.trainingId : null;
  if (trainingId === "needle-hill-oab") trainingId = DEFAULT_OAB_TRAINING_ID;
  const training = getTraining(trainingId);
  const startSectionId = clampSection(raw.startSectionId ?? base.startSectionId);
  const endSectionId = clampSection(raw.endSectionId ?? base.endSectionId);
  const startKmAt = clampKmAt(startSectionId, raw.startKmAt ?? 0);
  const endKmAt = clampKmAt(endSectionId, raw.endKmAt ?? sectionEndKmAt(endSectionId));
  return {
    ...base,
    ...raw,
    targetHours: clampTarget(raw.targetHours ?? base.targetHours),
    startSectionId,
    endSectionId,
    startKmAt,
    endKmAt,
    currentSectionId: clampSection(raw.currentSectionId ?? base.currentSectionId),
    kmInSection: Math.max(0, Number(raw.kmInSection) || 0),
    sectionPausedMs: Math.max(0, Number(raw.sectionPausedMs) || 0),
    practicePausedMs: Math.max(0, Number(raw.practicePausedMs) || 0),
    gpsKmTotal: Math.max(0, Number(raw.gpsKmTotal) || 0),
    gpsOn: Boolean(raw.gpsOn),
    gpsFollow: raw.gpsFollow !== false,
    autoSection: trainingId ? false : raw.autoSection !== false,
    lastGpsLat: numOrNull(raw.lastGpsLat),
    lastGpsLng: numOrNull(raw.lastGpsLng),
    sectionElapsedLog:
      raw.sectionElapsedLog && typeof raw.sectionElapsedLog === "object" ? raw.sectionElapsedLog : {},
    summary: raw.summary ?? null,
    status: isStatus(raw.status) ? raw.status : "idle",
    trainingId,
    trainingTargetHours: clampTrainingHours(
      raw.trainingTargetHours ?? training?.defaultHours ?? base.trainingTargetHours,
    ),
    plannedStartTime: clampPlannedStartTime(raw.plannedStartTime, base.plannedStartTime),
  };
}

export function loadLiveSession(): LiveSession {
  try {
    const raw = localStorage.getItem(LIVE_KEY) ?? localStorage.getItem(LIVE_KEY_LEGACY);
    if (!raw) return defaultLiveSession();
    return normalizeLiveSession(JSON.parse(raw) as Partial<LiveSession>);
  } catch {
    return defaultLiveSession();
  }
}

export function saveLiveSession(session: LiveSession) {
  localStorage.setItem(LIVE_KEY, JSON.stringify(session));
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clampSection(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function clampKmAt(sectionId: number, kmAt: number): number {
  const s = SECTIONS[sectionId - 1];
  if (!s) return 0;
  if (!Number.isFinite(kmAt)) return 0;
  const max = sectionEndKmAt(sectionId);
  const clamped = Math.min(max, Math.max(0, kmAt));
  // 貼近最近地形節點，避免浮點／舊資料偏差
  const hit = findElevPick(`${sectionId}:${clamped.toFixed(2)}`);
  if (hit) return hit.kmAt;
  let best = s.elevCode[0]?.kmAt ?? 0;
  let bestD = Math.abs(best - clamped);
  for (const n of s.elevCode) {
    const d = Math.abs(n.kmAt - clamped);
    if (d < bestD) {
      best = n.kmAt;
      bestD = d;
    }
  }
  return best;
}

export { sectionEndKmAt };

function clampTarget(h: number): number {
  if (!Number.isFinite(h)) return DEFAULT_TARGET_HOURS;
  return Math.min(48, Math.max(20, Math.round(h * 2) / 2));
}

function isStatus(v: unknown): v is LiveStatus {
  return v === "idle" || v === "ready" || v === "running" || v === "paused" || v === "ended";
}

export function elapsedInSectionMs(session: LiveSession, nowTs: number): number {
  if (!session.sectionStartedAt) return 0;
  const end = session.pausedAt ?? nowTs;
  return Math.max(0, end - session.sectionStartedAt - session.sectionPausedMs);
}

export function practiceElapsedMs(session: LiveSession, nowTs: number): number {
  if (!session.practiceStartedAt) return 0;
  const end = session.status === "ended" && session.summary ? session.summary.endedAt : session.pausedAt ?? nowTs;
  return Math.max(0, end - session.practiceStartedAt - session.practicePausedMs);
}

export function currentSectionKmCap(session: LiveSession): number {
  const training = getTraining(session.trainingId);
  if (training) return training.totalKm;
  return SECTIONS[session.currentSectionId - 1]?.km ?? 0;
}

export function buildSummary(session: LiveSession, nowTs: number): LiveSummary {
  const training = getTraining(session.trainingId);
  return {
    endedAt: nowTs,
    practiceMs: practiceElapsedMs({ ...session, pausedAt: session.pausedAt ?? nowTs }, nowTs),
    fromSectionId: session.startSectionId,
    toSectionId: session.endSectionId,
    lastSectionId: session.currentSectionId,
    kmInLastSection: session.kmInSection,
    gpsKmTotal: session.gpsKmTotal,
    targetHours: training ? session.trainingTargetHours : session.targetHours,
    trainingId: session.trainingId,
    trainingName: training?.name ?? null,
  };
}

function clampTrainingHours(h: number): number {
  if (!Number.isFinite(h)) return 1.5;
  return Math.min(6, Math.max(0.5, Math.round(h * 4) / 4));
}
