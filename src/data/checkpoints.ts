import { haversineKm } from "../lib/live/geo";

/**
 * 毅行者／麥徑關鍵點稀疏座標（約略，只供 Live 最近點提示，唔當導航）。
 * 來源：公開山徑／地圖常見標註，可能有數十米偏差。
 */
export type Checkpoint = {
  id: string;
  name: string;
  /** 到達此點＝完成第 N 段；起步＝0 */
  sectionEnds: number;
  lat: number;
  lng: number;
};

export const CHECKPOINTS: Checkpoint[] = [
  { id: "start", name: "北潭涌起步", sectionEnds: 0, lat: 22.3975, lng: 114.3208 },
  { id: "cp1", name: "CP1 西灣", sectionEnds: 1, lat: 22.3809, lng: 114.3722 },
  { id: "cp2", name: "CP2 北潭凹", sectionEnds: 2, lat: 22.4167, lng: 114.3403 },
  { id: "cp3", name: "CP3 企嶺下", sectionEnds: 3, lat: 22.4092, lng: 114.2748 },
  { id: "cp4", name: "CP4 黃泥頭", sectionEnds: 4, lat: 22.3885, lng: 114.2186 },
  { id: "cp5", name: "CP5 筆架山", sectionEnds: 5, lat: 22.3486, lng: 114.1792 },
  { id: "cp6", name: "CP6 走私坳", sectionEnds: 6, lat: 22.3598, lng: 114.1556 },
  { id: "cp7", name: "CP7 鉛礦坳", sectionEnds: 7, lat: 22.3854, lng: 114.1432 },
  { id: "cp8", name: "CP8 荃錦坳", sectionEnds: 8, lat: 22.4108, lng: 114.1235 },
  { id: "cp9", name: "CP9 吉慶橋", sectionEnds: 9, lat: 22.4275, lng: 114.0702 },
  { id: "finish", name: "終點 哈羅", sectionEnds: 10, lat: 22.4508, lng: 114.0228 },
];

export type NearestCheckpoint = {
  checkpoint: Checkpoint;
  distanceKm: number;
  /** 推測而家响邊段 */
  suggestedSectionId: number;
};

export function nearestCheckpoint(lat: number, lng: number): NearestCheckpoint {
  let best = CHECKPOINTS[0];
  let bestD = Infinity;
  for (const cp of CHECKPOINTS) {
    const d = haversineKm(lat, lng, cp.lat, cp.lng);
    if (d < bestD) {
      bestD = d;
      best = cp;
    }
  }

  let suggestedSectionId: number;
  if (best.sectionEnds === 0) {
    suggestedSectionId = 1;
  } else if (bestD < 0.25) {
    // 已到站附近 → 建議下一段（終點則留喺 10）
    suggestedSectionId = best.sectionEnds >= 10 ? 10 : best.sectionEnds + 1;
  } else {
    // 未到 → 仍响通往此 CP 嘅段
    suggestedSectionId = best.sectionEnds;
  }

  return {
    checkpoint: best,
    distanceKm: bestD,
    suggestedSectionId,
  };
}
