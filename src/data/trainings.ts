import { haversineKm } from "../lib/live/geo";
import { ROUTE_TRACK } from "./routeTrack";

export type TrainingPoint = {
  lat: number;
  lng: number;
  /** 練習累計 km（去＋返） */
  kmAlong: number;
  leg: "out" | "back";
  /** 對應 OTW 第 7 段內 km（地形／elevCode） */
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

function buildOutAndBack(
  sectionId: number,
  turnRaceKm: number,
  labels: { start: string; turn: string; end: string },
): TrainingPoint[] {
  const outSrc = ROUTE_TRACK.filter(
    (p) => p.sectionId === sectionId && p.kmInSection <= turnRaceKm + 0.04,
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

const needleTrack = buildOutAndBack(7, NEEDLE_SUMMIT_RACE_KM, {
  start: "CP6／針山腳",
  turn: "針山山頂",
  end: "返抵起點",
});

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

export function getTraining(id: string | null | undefined): TrainingDef | null {
  if (!id) return null;
  return TRAININGS.find((t) => t.id === id) ?? null;
}

/** 練習進度 → 第 7 段 race km（去程遞增、回程遞減） */
export function trainingRaceKm(training: TrainingDef, kmAlong: number): number {
  const turn = training.turnRaceKm;
  const along = Math.max(0, Math.min(training.totalKm, kmAlong));
  // 用 track 上最近點嘅 raceKm 更準；fallback 對稱估
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
