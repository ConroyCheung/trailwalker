import { haversineKm } from "../lib/live/geo";

/**
 * 毅行者檢查站座標 — 取自 OTW 2026 官方 Google My Map Placemarks。
 * 名稱保留計劃用叫法；official 欄對照大會英文名。
 */
export type Checkpoint = {
  id: string;
  name: string;
  /** 到達此點＝完成第 N 段；起步＝0 */
  sectionEnds: number;
  lat: number;
  lng: number;
  official?: string;
};

export const CHECKPOINTS: Checkpoint[] = [
  {
    "id": "start",
    "name": "北潭涌起步",
    "sectionEnds": 0,
    "official": "Pak Tam Chung",
    "lat": 22.397723,
    "lng": 114.320271
  },
  {
    "id": "cp1",
    "name": "CP1 西灣",
    "sectionEnds": 1,
    "official": "Sai Wan",
    "lat": 22.397038,
    "lng": 114.370942
  },
  {
    "id": "cp2",
    "name": "CP2 北潭凹",
    "sectionEnds": 2,
    "official": "Pak Tam Au",
    "lat": 22.420687,
    "lng": 114.331959
  },
  {
    "id": "cp3",
    "name": "CP3 企嶺下",
    "sectionEnds": 3,
    "official": "Kei Ling Ha",
    "lat": 22.404924,
    "lng": 114.279085
  },
  {
    "id": "cp4",
    "name": "CP4 黃泥頭／基維爾營",
    "sectionEnds": 4,
    "official": "Gilwell Campsite",
    "lat": 22.360976,
    "lng": 114.222039
  },
  {
    "id": "cp5",
    "name": "CP5 筆架山",
    "sectionEnds": 5,
    "official": "Beacon Hill",
    "lat": 22.349699,
    "lng": 114.169198
  },
  {
    "id": "cp6",
    "name": "CP6 走私坳",
    "sectionEnds": 6,
    "official": "Smugglers Ridge",
    "lat": 22.366957,
    "lng": 114.15164
  },
  {
    "id": "cp7",
    "name": "CP7 鉛礦坳",
    "sectionEnds": 7,
    "official": "Lead Mine Pass",
    "lat": 22.412036,
    "lng": 114.158132
  },
  {
    "id": "cp8",
    "name": "CP8 荃錦坳／大帽山",
    "sectionEnds": 8,
    "official": "Tai Mo Shan",
    "lat": 22.404616,
    "lng": 114.106063
  },
  {
    "id": "cp9",
    "name": "CP9 吉慶橋／大欖涌",
    "sectionEnds": 9,
    "official": "Tai Lam Chung Reservoir",
    "lat": 22.396164,
    "lng": 114.045698
  },
  {
    "id": "finish",
    "name": "終點 哈羅",
    "sectionEnds": 10,
    "official": "Harrow International School Hong Kong",
    "lat": 22.375889,
    "lng": 113.990569
  }
];

export type NearestCheckpoint = {
  checkpoint: Checkpoint;
  distanceKm: number;
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
    suggestedSectionId = best.sectionEnds >= 10 ? 10 : best.sectionEnds + 1;
  } else {
    suggestedSectionId = best.sectionEnds;
  }

  return {
    checkpoint: best,
    distanceKm: bestD,
    suggestedSectionId,
  };
}
