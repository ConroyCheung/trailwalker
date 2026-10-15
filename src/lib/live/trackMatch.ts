import { OFF_TRACK_KM, ROUTE_TRACK } from "../../data/routeTrack";
import { SECTIONS } from "../../data/sections";
import type { TrainingDef } from "../../data/trainings";
import { haversineKm } from "./geo";

export type TrackMatch = {
  sectionId: number;
  kmInSection: number;
  kmAt: number;
  /** 離最近路段距離（km） */
  distanceKm: number;
  offTrack: boolean;
  label?: string;
  /** 最近頂點／投影點 */
  snap: { lat: number; lng: number };
  /** training 模式：練習累計 km（去＋返） */
  kmAlong?: number;
  leg?: "out" | "back";
};

/** 本地平面近似（香港一帶夠用） */
function toXY(lat: number, lng: number, lat0: number, lng0: number) {
  const x = ((lng - lng0) * Math.PI) / 180 * Math.cos((lat0 * Math.PI) / 180) * 6371;
  const y = ((lat - lat0) * Math.PI) / 180 * 6371;
  return { x, y };
}

function fromXY(x: number, y: number, lat0: number, lng0: number) {
  const lat = lat0 + (y / 6371) * (180 / Math.PI);
  const lng = lng0 + (x / (6371 * Math.cos((lat0 * Math.PI) / 180))) * (180 / Math.PI);
  return { lat, lng };
}

type Candidate = {
  distanceKm: number;
  sectionId: number;
  kmInSection: number;
  kmAt: number;
  label?: string;
  snap: { lat: number; lng: number };
};

/**
 * 找最近路線段投影；用嚟認段、估段內 km、判斷偏離。
 */
export function nearestOnTrack(lat: number, lng: number): TrackMatch {
  const track = ROUTE_TRACK;
  if (track.length === 0) {
    return {
      sectionId: 1,
      kmInSection: 0,
      kmAt: 0,
      distanceKm: Infinity,
      offTrack: true,
      snap: { lat, lng },
    };
  }

  let best: Candidate | null = null;
  const lat0 = lat;
  const lng0 = lng;
  const p = toXY(lat, lng, lat0, lng0);

  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    // 跨段接駁：用後一段屬性
    const sectionId = b.sectionId;
    const section = SECTIONS[sectionId - 1];
    const A = toXY(a.lat, a.lng, lat0, lng0);
    const B = toXY(b.lat, b.lng, lat0, lng0);
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const len2 = abx * abx + aby * aby;
    let t = 0;
    if (len2 > 1e-12) {
      t = ((p.x - A.x) * abx + (p.y - A.y) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const sx = A.x + abx * t;
    const sy = A.y + aby * t;
    const snap = fromXY(sx, sy, lat0, lng0);
    const distanceKm = haversineKm(lat, lng, snap.lat, snap.lng);

    const kmInSection =
      a.sectionId === b.sectionId
        ? a.kmInSection + (b.kmInSection - a.kmInSection) * t
        : b.kmInSection * t; // 跨段短接：偏向下一段起點

    const kmAt = a.kmAt + (b.kmAt - a.kmAt) * t;
    const label = t < 0.5 ? a.label : b.label;

    if (!best || distanceKm < best.distanceKm) {
      best = {
        distanceKm,
        sectionId,
        kmInSection: Math.min(section?.km ?? kmInSection, Math.max(0, kmInSection)),
        kmAt,
        label,
        snap,
      };
    }
  }

  // 亦比較頂點（避免短段漏判）
  for (const v of track) {
    const d = haversineKm(lat, lng, v.lat, v.lng);
    if (!best || d < best.distanceKm) {
      best = {
        distanceKm: d,
        sectionId: v.sectionId,
        kmInSection: v.kmInSection,
        kmAt: v.kmAt,
        label: v.label,
        snap: { lat: v.lat, lng: v.lng },
      };
    }
  }

  const match = best!;
  return {
    ...match,
    offTrack: match.distanceKm > OFF_TRACK_KM,
  };
}

export function formatOffTrack(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return "偏離路線";
  if (distanceKm < 1) return `偏離約 ${Math.round(distanceKm * 1000)} m`;
  return `偏離約 ${distanceKm.toFixed(1)} km`;
}

type TrainingCandidate = {
  distanceKm: number;
  kmAlong: number;
  raceKmInSection: number;
  label?: string;
  leg: "out" | "back";
  snap: { lat: number; lng: number };
};

/**
 * 練行 track（例如針山來回）最近投影。
 * kmInSection／kmAt 用練習累計 kmAlong，方便沿用 Live 進度欄。
 */
export function nearestOnTraining(lat: number, lng: number, training: TrainingDef): TrackMatch {
  const track = training.track;
  if (track.length === 0) {
    return {
      sectionId: training.raceSectionId,
      kmInSection: 0,
      kmAt: 0,
      kmAlong: 0,
      distanceKm: Infinity,
      offTrack: true,
      snap: { lat, lng },
      leg: "out",
    };
  }

  let best: TrainingCandidate | null = null;
  const lat0 = lat;
  const lng0 = lng;
  const p = toXY(lat, lng, lat0, lng0);

  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    const A = toXY(a.lat, a.lng, lat0, lng0);
    const B = toXY(b.lat, b.lng, lat0, lng0);
    const abx = B.x - A.x;
    const aby = B.y - A.y;
    const len2 = abx * abx + aby * aby;
    let t = 0;
    if (len2 > 1e-12) {
      t = ((p.x - A.x) * abx + (p.y - A.y) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const sx = A.x + abx * t;
    const sy = A.y + aby * t;
    const snap = fromXY(sx, sy, lat0, lng0);
    const distanceKm = haversineKm(lat, lng, snap.lat, snap.lng);
    const kmAlong = a.kmAlong + (b.kmAlong - a.kmAlong) * t;
    const raceKmInSection = a.raceKmInSection + (b.raceKmInSection - a.raceKmInSection) * t;
    const leg = t < 0.5 ? a.leg : b.leg;
    const label = t < 0.5 ? a.label : b.label;

    if (!best || distanceKm < best.distanceKm) {
      best = {
        distanceKm,
        kmAlong,
        raceKmInSection,
        label,
        leg,
        snap,
      };
    }
  }

  for (const v of track) {
    const d = haversineKm(lat, lng, v.lat, v.lng);
    if (!best || d < best.distanceKm) {
      best = {
        distanceKm: d,
        kmAlong: v.kmAlong,
        raceKmInSection: v.raceKmInSection,
        label: v.label,
        leg: v.leg,
        snap: { lat: v.lat, lng: v.lng },
      };
    }
  }

  const match = best!;
  const kmAlong = Math.min(training.totalKm, Math.max(0, match.kmAlong));
  return {
    sectionId: training.raceSectionId,
    kmInSection: kmAlong,
    kmAt: kmAlong,
    kmAlong,
    distanceKm: match.distanceKm,
    offTrack: match.distanceKm > OFF_TRACK_KM,
    label: match.label,
    snap: match.snap,
    leg: match.leg,
  };
}
