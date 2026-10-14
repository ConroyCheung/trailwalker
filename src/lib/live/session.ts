import { SECTIONS } from "../../data/sections";
import { DEFAULT_TARGET_HOURS } from "./pace";

const LIVE_KEY = "tw-live-v1";

export type LiveStatus = "idle" | "running" | "paused" | "ended";

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
  status: LiveStatus;
  gpsOn: boolean;
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
    status: "idle",
    gpsOn: false,
  };
}

export function loadLiveSession(): LiveSession {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
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
      gpsOn: Boolean(parsed.gpsOn),
      status: isStatus(parsed.status) ? parsed.status : "idle",
    };
  } catch {
    return defaultLiveSession();
  }
}

export function saveLiveSession(session: LiveSession) {
  localStorage.setItem(LIVE_KEY, JSON.stringify(session));
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

export function currentSectionKmCap(session: LiveSession): number {
  return SECTIONS[session.currentSectionId - 1]?.km ?? 0;
}
