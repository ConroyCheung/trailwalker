import { SECTIONS } from "../../data/sections";
import { DEFAULT_TARGET_HOURS } from "./pace";

const LIVE_KEY = "tw-live-v2";
const LIVE_KEY_LEGACY = "tw-live-v1";

export type LiveStatus = "idle" | "running" | "paused" | "ended";

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
};

export type LiveSession = {
  targetHours: number;
  startSectionId: number;
  endSectionId: number;
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
};

export function defaultLiveSession(sectionId = 1): LiveSession {
  const id = Math.min(10, Math.max(1, sectionId));
  return {
    targetHours: DEFAULT_TARGET_HOURS,
    startSectionId: id,
    endSectionId: 10,
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
  };
}

export function loadLiveSession(): LiveSession {
  try {
    const raw = localStorage.getItem(LIVE_KEY) ?? localStorage.getItem(LIVE_KEY_LEGACY);
    if (!raw) return defaultLiveSession();
    const parsed = JSON.parse(raw) as Partial<LiveSession>;
    const base = defaultLiveSession(parsed.currentSectionId ?? parsed.startSectionId ?? 1);
    return {
      ...base,
      ...parsed,
      targetHours: clampTarget(parsed.targetHours ?? base.targetHours),
      startSectionId: clampSection(parsed.startSectionId ?? base.startSectionId),
      endSectionId: clampSection(parsed.endSectionId ?? base.endSectionId),
      currentSectionId: clampSection(parsed.currentSectionId ?? base.currentSectionId),
      kmInSection: Math.max(0, Number(parsed.kmInSection) || 0),
      sectionPausedMs: Math.max(0, Number(parsed.sectionPausedMs) || 0),
      practicePausedMs: Math.max(0, Number(parsed.practicePausedMs) || 0),
      gpsKmTotal: Math.max(0, Number(parsed.gpsKmTotal) || 0),
      gpsOn: Boolean(parsed.gpsOn),
      gpsFollow: parsed.gpsFollow !== false,
      autoSection: parsed.autoSection !== false,
      lastGpsLat: numOrNull(parsed.lastGpsLat),
      lastGpsLng: numOrNull(parsed.lastGpsLng),
      sectionElapsedLog: parsed.sectionElapsedLog && typeof parsed.sectionElapsedLog === "object" ? parsed.sectionElapsedLog : {},
      summary: parsed.summary ?? null,
      status: isStatus(parsed.status) ? parsed.status : "idle",
    };
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

function clampTarget(h: number): number {
  if (!Number.isFinite(h)) return DEFAULT_TARGET_HOURS;
  return Math.min(48, Math.max(20, Math.round(h * 2) / 2));
}

function isStatus(v: unknown): v is LiveStatus {
  return v === "idle" || v === "running" || v === "paused" || v === "ended";
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
  return SECTIONS[session.currentSectionId - 1]?.km ?? 0;
}

export function buildSummary(session: LiveSession, nowTs: number): LiveSummary {
  return {
    endedAt: nowTs,
    practiceMs: practiceElapsedMs({ ...session, pausedAt: session.pausedAt ?? nowTs }, nowTs),
    fromSectionId: session.startSectionId,
    toSectionId: session.endSectionId,
    lastSectionId: session.currentSectionId,
    kmInLastSection: session.kmInSection,
    gpsKmTotal: session.gpsKmTotal,
    targetHours: session.targetHours,
  };
}
