/** Haversine 距離（km） */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type GpsSample = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  at: number;
};

/**
 * 過濾抖動／飛點。通過則回傳應累加嘅 km，否則 0。
 * - 精度差過 threshold → 唔計
 * - 位移細過 minStep → 當抖動
 * - 單次躍遷大過 maxStep → 當飛點（唔累加，但呼叫端應更新 last 以免卡住）
 */
export function gpsStepKm(
  prev: GpsSample | null,
  next: GpsSample,
  opts?: { maxAccuracyM?: number; minStepKm?: number; maxStepKm?: number },
): { addKm: number; acceptAsLast: boolean; reason: "first" | "ok" | "inaccurate" | "jitter" | "jump" } {
  const maxAccuracyM = opts?.maxAccuracyM ?? 45;
  const minStepKm = opts?.minStepKm ?? 0.008; // ~8m
  const maxStepKm = opts?.maxStepKm ?? 0.18; // ~180m／一次更新

  if (next.accuracyM != null && next.accuracyM > maxAccuracyM) {
    return { addKm: 0, acceptAsLast: false, reason: "inaccurate" };
  }
  if (!prev) return { addKm: 0, acceptAsLast: true, reason: "first" };

  const d = haversineKm(prev.lat, prev.lng, next.lat, next.lng);
  if (d < minStepKm) return { addKm: 0, acceptAsLast: false, reason: "jitter" };
  if (d > maxStepKm) return { addKm: 0, acceptAsLast: true, reason: "jump" };
  return { addKm: d, acceptAsLast: true, reason: "ok" };
}

export function formatSpeedKmh(speedMps: number | null | undefined): string | null {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) return null;
  const kmh = speedMps * 3.6;
  if (kmh < 0.3) return "0 km/h";
  return `${kmh.toFixed(1)} km/h`;
}
