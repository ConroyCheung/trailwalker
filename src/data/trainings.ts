import { haversineKm } from "../lib/live/geo";
import { ROUTE_TRACK } from "./routeTrack";
import { SECTIONS } from "./sections";

export type TrainingPoint = {
  lat: number;
  lng: number;
  /** 練習累計 km（去＋返） */
  kmAlong: number;
  leg: "out" | "back";
  /** 對應 OTW 段內 km（地形／elevCode） */
  raceKmInSection: number;
  label?: string;
};

export type TrainingDef = {
  id: string;
  name: string;
  blurb: string;
  /** 預設目標用時（小時） */
  defaultHours: number;
  /** 對應 race 段（地圖／計劃參考） */
  raceSectionId: number;
  /** 去程轉折：段內 km（針山山頂 ≈ 2.0） */
  turnRaceKm: number;
  track: TrainingPoint[];
  totalKm: number;
};

/** 第 7 段 elevCode：針山山頂 kmAt 2.0 */
const NEEDLE_SUMMIT_RACE_KM = 2.0;

export function oabTrainingId(
  sectionId: number,
  turnRaceKm: number,
  startRaceKm = 0,
): string {
  if (startRaceKm <= 0.05) return `oab:${sectionId}:${turnRaceKm.toFixed(2)}`;
  return `oab:${sectionId}:${startRaceKm.toFixed(2)}:${turnRaceKm.toFixed(2)}`;
}

export function parseOabTrainingId(
  id: string,
): { sectionId: number; startRaceKm: number; turnRaceKm: number } | null {
  const three = /^oab:(\d+):([\d.]+):([\d.]+)$/.exec(id.trim());
  if (three) {
    const sectionId = Number(three[1]);
    const startRaceKm = Number(three[2]);
    const turnRaceKm = Number(three[3]);
    if (![sectionId, startRaceKm, turnRaceKm].every(Number.isFinite)) return null;
    return { sectionId, startRaceKm, turnRaceKm };
  }
  const two = /^oab:(\d+):([\d.]+)$/.exec(id.trim());
  if (!two) return null;
  const sectionId = Number(two[1]);
  const turnRaceKm = Number(two[2]);
  if (!Number.isFinite(sectionId) || !Number.isFinite(turnRaceKm)) return null;
  return { sectionId, startRaceKm: 0, turnRaceKm };
}

function buildOutAndBack(
  sectionId: number,
  turnRaceKm: number,
  labels: { start: string; turn: string; end: string },
  startRaceKm = 0,
): TrainingPoint[] {
  const outSrc = ROUTE_TRACK.filter(
    (p) =>
      p.sectionId === sectionId &&
      p.kmInSection >= startRaceKm - 0.04 &&
      p.kmInSection <= turnRaceKm + 0.04,
  );
  if (outSrc.length < 2) return [];

  const out: TrainingPoint[] = [];
  let km = 0;
  for (let i = 0; i < outSrc.length; i++) {
    const p = outSrc[i];
    if (i > 0) {
      const prev = outSrc[i - 1];
      km += haversineKm(prev.lat, prev.lng, p.lat, p.lng);
    }
    out.push({
      lat: p.lat,
      lng: p.lng,
      kmAlong: +km.toFixed(3),
      leg: "out",
      raceKmInSection: p.kmInSection,
      label: i === 0 ? labels.start : undefined,
    });
  }
  out[out.length - 1] = {
    ...out[out.length - 1],
    label: labels.turn,
  };

  const track = [...out];
  for (let i = outSrc.length - 2; i >= 0; i--) {
    const p = outSrc[i];
    const prev = track[track.length - 1];
    km += haversineKm(prev.lat, prev.lng, p.lat, p.lng);
    track.push({
      lat: p.lat,
      lng: p.lng,
      kmAlong: +km.toFixed(3),
      leg: "back",
      raceKmInSection: p.kmInSection,
      label: i === 0 ? labels.end : undefined,
    });
  }
  return track;
}

/** 由地形起→轉折即時組來回 track；路線點不足則 null */
export function makeOabTraining(
  sectionId: number,
  turnRaceKm: number,
  startRaceKm = 0,
): TrainingDef | null {
  const section = SECTIONS[sectionId - 1];
  if (!section) return null;
  const startNode =
    section.elevCode.find((n) => Math.abs(n.kmAt - startRaceKm) < 0.06) ??
    section.elevCode.filter((n) => n.kmAt <= startRaceKm + 0.01).at(-1) ??
    section.elevCode[0];
  const turnNode =
    section.elevCode.find((n) => Math.abs(n.kmAt - turnRaceKm) < 0.06) ??
    section.elevCode.filter((n) => n.kmAt <= turnRaceKm + 0.01).at(-1);
  if (!startNode || !turnNode) return null;
  if (turnNode.kmAt < startNode.kmAt + 0.35) return null;

  const track = buildOutAndBack(
    sectionId,
    turnNode.kmAt,
    {
      start: startNode.place,
      turn: turnNode.place,
      end: `返抵${startNode.place}`,
    },
    startNode.kmAt,
  );
  if (track.length < 4) return null;

  const totalKm = track[track.length - 1].kmAlong;
  const defaultHours = Math.min(6, Math.max(0.75, Math.round((totalKm / 3) * 4) / 4));

  return {
    id: oabTrainingId(sectionId, turnNode.kmAt, startNode.kmAt),
    name: `${turnNode.place}來回`,
    blurb: `由${startNode.place}上${turnNode.place}（${turnNode.elevM}m），原路返。`,
    defaultHours,
    raceSectionId: sectionId,
    turnRaceKm: turnNode.kmAt,
    track,
    totalKm,
  };
}

const needleTrack = buildOutAndBack(7, NEEDLE_SUMMIT_RACE_KM, {
  start: "CP6／針山腳",
  turn: "針山山頂",
  end: "返抵起點",
});

/** 預設練行（兼容舊 session） */
export const TRAININGS: TrainingDef[] = [
  {
    id: "needle-hill-oab",
    name: "針山來回",
    blurb: "沿第 7 段上針山山頂，原路返 CP6／山腳。適合今晚練行測試 GPS／地圖。",
    defaultHours: 1.5,
    raceSectionId: 7,
    turnRaceKm: NEEDLE_SUMMIT_RACE_KM,
    track: needleTrack,
    totalKm: needleTrack.length ? needleTrack[needleTrack.length - 1].kmAlong : 0,
  },
];

const oabCache = new Map<string, TrainingDef | null>();

export function getTraining(id: string | null | undefined): TrainingDef | null {
  if (!id) return null;
  const preset = TRAININGS.find((t) => t.id === id);
  if (preset) return preset;

  const parsed = parseOabTrainingId(id);
  if (!parsed) return null;
  const cacheKey = oabTrainingId(parsed.sectionId, parsed.turnRaceKm, parsed.startRaceKm);
  if (oabCache.has(cacheKey)) return oabCache.get(cacheKey)!;
  const built = makeOabTraining(parsed.sectionId, parsed.turnRaceKm, parsed.startRaceKm);
  oabCache.set(cacheKey, built);
  return built;
}

/** 預設來回：針山山頂 */
export const DEFAULT_OAB_TRAINING_ID = oabTrainingId(7, NEEDLE_SUMMIT_RACE_KM);

/** 練習進度 → race 段內 km（去程遞增、回程遞減） */
export function trainingRaceKm(training: TrainingDef, kmAlong: number): number {
  const turn = training.turnRaceKm;
  const along = Math.max(0, Math.min(training.totalKm, kmAlong));
  const pts = training.track;
  if (pts.length === 0) return 0;
  let best = pts[0];
  let bestD = Math.abs(pts[0].kmAlong - along);
  for (const p of pts) {
    const d = Math.abs(p.kmAlong - along);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  if (bestD < 0.15) return best.raceKmInSection;
  if (along <= turn) return Math.min(turn, along);
  return Math.max(0, 2 * turn - along);
}
