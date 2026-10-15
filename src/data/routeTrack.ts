import { SECTIONS } from "./sections";
import { haversineKm } from "../lib/live/geo";

/**
 * 麥徑稀疏路線點（約略，離線認段／偏離提示用，唔當精確導航）。
 * 每段若干頂點；載入時按官方段距重標 kmInSection。
 */
type RawVertex = { lat: number; lng: number; label?: string };

/** sectionId → 由段起至段終嘅頂點（含兩端） */
const RAW_BY_SECTION: Record<number, RawVertex[]> = {
  1: [
    { lat: 22.3975, lng: 114.3208, label: "北潭涌" },
    { lat: 22.3912, lng: 114.3405, label: "萬宜西壩一帶" },
    { lat: 22.3855, lng: 114.3528, label: "萬宜東壩" },
    { lat: 22.3758, lng: 114.3612, label: "浪茄" },
    { lat: 22.3720, lng: 114.3685, label: "西灣山" },
    { lat: 22.3809, lng: 114.3722, label: "CP1 西灣" },
  ],
  2: [
    { lat: 22.3809, lng: 114.3722, label: "CP1 西灣" },
    { lat: 22.3865, lng: 114.3680, label: "鹹田灣" },
    { lat: 22.3955, lng: 114.3585, label: "大浪坳" },
    { lat: 22.4058, lng: 114.3492, label: "赤徑" },
    { lat: 22.4167, lng: 114.3403, label: "CP2 北潭凹" },
  ],
  3: [
    { lat: 22.4167, lng: 114.3403, label: "CP2 北潭凹" },
    { lat: 22.4205, lng: 114.3255, label: "雞公山一帶" },
    { lat: 22.4188, lng: 114.3082, label: "牛耳石" },
    { lat: 22.4145, lng: 114.2910, label: "蚺蛇尖東" },
    { lat: 22.4092, lng: 114.2748, label: "CP3 企嶺下" },
  ],
  4: [
    { lat: 22.4092, lng: 114.2748, label: "CP3 企嶺下" },
    { lat: 22.4055, lng: 114.2585, label: "馬鞍山郊野公園" },
    { lat: 22.3998, lng: 114.2450, label: "天梯／金字塔一帶" },
    { lat: 22.3925, lng: 114.2305, label: "麥理浩徑高原" },
    { lat: 22.3885, lng: 114.2186, label: "CP4 黃泥頭" },
  ],
  5: [
    { lat: 22.3885, lng: 114.2186, label: "CP4 黃泥頭" },
    { lat: 22.3775, lng: 114.2055, label: "沙田坳道" },
    { lat: 22.3655, lng: 114.1938, label: "獅子山一帶" },
    { lat: 22.3555, lng: 114.1845, label: "鷹巢山" },
    { lat: 22.3486, lng: 114.1792, label: "CP5 筆架山" },
  ],
  6: [
    { lat: 22.3486, lng: 114.1792, label: "CP5 筆架山" },
    { lat: 22.3525, lng: 114.1705, label: "鷹巢山落斜" },
    { lat: 22.3568, lng: 114.1628, label: "金山路" },
    { lat: 22.3598, lng: 114.1556, label: "CP6 走私坳" },
  ],
  7: [
    { lat: 22.3598, lng: 114.1556, label: "CP6 走私坳" },
    { lat: 22.3655, lng: 114.1510, label: "針山腳" },
    { lat: 22.3728, lng: 114.1475, label: "針山" },
    { lat: 22.3795, lng: 114.1450, label: "草山" },
    { lat: 22.3854, lng: 114.1432, label: "CP7 鉛礦坳" },
  ],
  8: [
    { lat: 22.3854, lng: 114.1432, label: "CP7 鉛礦坳" },
    { lat: 22.3925, lng: 114.1385, label: "大帽山道" },
    { lat: 22.4005, lng: 114.1320, label: "白波道一帶" },
    { lat: 22.4108, lng: 114.1235, label: "CP8 荃錦坳" },
  ],
  9: [
    { lat: 22.4108, lng: 114.1235, label: "CP8 荃錦坳" },
    { lat: 22.4155, lng: 114.1085, label: "大欖涌水塘東" },
    { lat: 22.4205, lng: 114.0920, label: "大欖林道" },
    { lat: 22.4275, lng: 114.0702, label: "CP9 吉慶橋" },
  ],
  10: [
    { lat: 22.4275, lng: 114.0702, label: "CP9 吉慶橋" },
    { lat: 22.4325, lng: 114.0555, label: "大棠" },
    { lat: 22.4388, lng: 114.0405, label: "大欖林道西" },
    { lat: 22.4455, lng: 114.0300, label: "M178–M193" },
    { lat: 22.4508, lng: 114.0228, label: "終點 哈羅" },
  ],
};

export type RoutePoint = {
  lat: number;
  lng: number;
  sectionId: number;
  /** 本段內進度 km（0 → section.km） */
  kmInSection: number;
  /** 全場累計 km */
  kmAt: number;
  label?: string;
};

function buildRoute(): RoutePoint[] {
  const out: RoutePoint[] = [];
  let globalKm = 0;

  for (const section of SECTIONS) {
    const raw = RAW_BY_SECTION[section.id];
    if (!raw || raw.length < 2) continue;

    const segLens: number[] = [];
    let rawSum = 0;
    for (let i = 1; i < raw.length; i++) {
      const d = haversineKm(raw[i - 1].lat, raw[i - 1].lng, raw[i].lat, raw[i].lng);
      segLens.push(d);
      rawSum += d;
    }
    const scale = rawSum > 0 ? section.km / rawSum : 1;

    let local = 0;
    raw.forEach((v, i) => {
      if (i > 0) local += segLens[i - 1] * scale;
      // 段與段交界：跳過同座標重複點（除首段起點）
      if (i === 0 && section.id > 1 && out.length > 0) {
        const prev = out[out.length - 1];
        if (Math.abs(prev.lat - v.lat) < 1e-5 && Math.abs(prev.lng - v.lng) < 1e-5) {
          return;
        }
      }
      out.push({
        lat: v.lat,
        lng: v.lng,
        sectionId: section.id,
        kmInSection: Math.min(section.km, Math.round(local * 100) / 100),
        kmAt: Math.round((globalKm + local) * 100) / 100,
        label: v.label,
      });
    });
    globalKm += section.km;
  }
  return out;
}

export const ROUTE_TRACK: RoutePoint[] = buildRoute();

export const OFF_TRACK_KM = 0.35;
