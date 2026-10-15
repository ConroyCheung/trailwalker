/**
 * Build Live ROUTE_TRACK from OTW 2026 official Google My Map KML (base),
 * cross-checked against nicholas-fong MacLehose track + AFCD section GPX.
 *
 * Prerequisites (download into tmp/gpx/):
 *   # 1 base — OTW 2026 official Google My Map KML
 *   curl -sL "https://www.google.com/maps/d/kml?mid=17KKPiqSM3PdpfHOTeC347SdbvtmKTa4&forcekml=1" -o tmp/gpx/otw100.kml
 *   # 3 cross-check — nicholas-fong MacLehose track
 *   curl -sL "https://raw.githubusercontent.com/nicholas-fong/Hong-Kong-Trails-GPX-KML/main/MacLehose-Trail/GPX-Track/MacLehose-Trail-track.gpx" -o tmp/gpx/maclehose-track.gpx
 *   # 2 cross-check — AFCD 郊野樂行 section 1 sample
 *   curl -sL "https://www.hiking.gov.hk/console/public/uploads/others/file/gpx/MacLehoseTrail(Section1)PakTamChungtoLongKe.gpx" -o tmp/gpx/hk-s1.gpx
 *
 * Finish leg (official text baked into ROUTE_SOURCE.finishNote):
 *   M001–M174 → 右轉元荃古道 C6119–C6124 → 大棠 → 大欖林道 → M178–M193 → 青盈路 → 哈羅
 *
 * Usage:
 *   node scripts/build-route-track.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const gpxDir = path.join(root, "tmp", "gpx");

const SECTION_KM = [15.5, 8.6, 10.2, 12.7, 8.5, 6.1, 7.4, 9.7, 11.3, 10.8];
const STEP_M = 40; // decimate spacing (~40m keeps snap accurate, smaller bundle)

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function parseKmlCoords(text) {
  const blocks = [...text.matchAll(/<coordinates>\s*([^<]+)<\/coordinates>/g)];
  const lines = [];
  const points = [];
  for (const m of blocks) {
    const pts = m[1]
      .trim()
      .split(/\s+/)
      .map((tok) => {
        const [lng, lat] = tok.split(",").map(Number);
        return { lat, lng };
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (pts.length > 5) lines.push(pts);
    else if (pts.length === 1) points.push(pts[0]);
  }
  return { lines, points };
}

function parseGpxTrack(text) {
  const pts = [];
  for (const m of text.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)) {
    pts.push({ lat: Number(m[1]), lng: Number(m[2]) });
  }
  if (!pts.length) {
    for (const m of text.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)) {
      pts.push({ lat: Number(m[1]), lng: Number(m[2]) });
    }
  }
  // also rtept
  for (const m of text.matchAll(/<rtept\s+lat="([^"]+)"\s+lon="([^"]+)"/g)) {
    pts.push({ lat: Number(m[1]), lng: Number(m[2]) });
  }
  return pts;
}

function parseOtwCps(kml) {
  const cps = [];
  const parts = kml.split(/<Placemark>/).slice(1);
  for (const p of parts) {
    const nameM = p.match(/<name>([\s\S]*?)<\/name>/);
    if (!nameM || !p.includes("<Point>")) continue;
    let name = nameM[1].replace(/<[^>]+>/g, "").trim();
    const coordM = p.match(/<coordinates>\s*([^<\s]+)/);
    if (!coordM) continue;
    const [lng, lat] = coordM[1].split(",").map(Number);
    const lower = name.toLowerCase();
    let sectionEnds = null;
    if (/start point|起點|pak tam chung|北潭涌/i.test(name) && !/cp\d|檢查站/i.test(name)) sectionEnds = 0;
    else if (/finish|終點|harrow|哈羅/i.test(name)) sectionEnds = 10;
    else {
      const cp = name.match(/CP\s*(\d)|(\d+)\s*號檢查站|一號|二號|三號|四號|五號|六號|七號|八號|九號/i);
      if (/一號|CP\s*1\b/i.test(name)) sectionEnds = 1;
      else if (/二號|CP\s*2\b/i.test(name)) sectionEnds = 2;
      else if (/三號|CP\s*3\b/i.test(name)) sectionEnds = 3;
      else if (/四號|CP\s*4\b/i.test(name)) sectionEnds = 4;
      else if (/五號|CP\s*5\b/i.test(name)) sectionEnds = 5;
      else if (/六號|CP\s*6\b/i.test(name)) sectionEnds = 6;
      else if (/七號|CP\s*7\b/i.test(name)) sectionEnds = 7;
      else if (/八號|CP\s*8\b/i.test(name)) sectionEnds = 8;
      else if (/九號|CP\s*9\b/i.test(name)) sectionEnds = 9;
    }
    if (sectionEnds == null || !Number.isFinite(lat)) continue;
    cps.push({ sectionEnds, lat, lng, name });
  }
  cps.sort((a, b) => a.sectionEnds - b.sectionEnds);
  return cps;
}

function pathLength(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += haversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  return n;
}

function decimate(pts, stepKm) {
  if (pts.length === 0) return [];
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += haversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
    if (acc >= stepKm) {
      out.push(pts[i]);
      acc = 0;
    }
  }
  const last = pts[pts.length - 1];
  const prev = out[out.length - 1];
  if (prev.lat !== last.lat || prev.lng !== last.lng) out.push(last);
  return out;
}

function nearestIndex(pts, lat, lng) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = haversineKm(lat, lng, pts[i].lat, pts[i].lng);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { index: best, distanceKm: bestD };
}

/** Sample every Nth point of A; mean distance to nearest on B */
function meanNearest(a, b, stride = 20) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += stride) {
    sum += nearestIndex(b, a[i].lat, a[i].lng).distanceKm;
    n++;
  }
  return n ? sum / n : Infinity;
}

function splitByCheckpoints(line, cps) {
  const idxs = cps.map((cp) => nearestIndex(line, cp.lat, cp.lng));
  // ensure monotonic indices
  for (let i = 1; i < idxs.length; i++) {
    if (idxs[i].index <= idxs[i - 1].index) {
      idxs[i].index = Math.min(line.length - 1, idxs[i - 1].index + 1);
    }
  }
  const sections = [];
  for (let s = 0; s < 10; s++) {
    const start = idxs[s].index;
    const end = idxs[s + 1].index;
    const slice = line.slice(start, end + 1);
    sections.push({
      sectionId: s + 1,
      startCp: cps[s],
      endCp: cps[s + 1],
      startSnapM: idxs[s].distanceKm * 1000,
      endSnapM: idxs[s + 1].distanceKm * 1000,
      rawKm: pathLength(slice),
      points: slice,
    });
  }
  return sections;
}

function scaleSection(points, targetKm) {
  const raw = pathLength(points);
  const scale = raw > 0 ? targetKm / raw : 1;
  const out = [];
  let local = 0;
  points.forEach((p, i) => {
    if (i > 0) {
      local += haversineKm(points[i - 1].lat, points[i - 1].lng, p.lat, p.lng) * scale;
    }
    out.push({
      lat: +p.lat.toFixed(6),
      lng: +p.lng.toFixed(6),
      kmInSection: +Math.min(targetKm, local).toFixed(3),
    });
  });
  if (out.length) out[out.length - 1].kmInSection = targetKm;
  return out;
}

// ——— main ———
const otwPath = path.join(gpxDir, "otw100.kml");
const macPath = path.join(gpxDir, "maclehose-track.gpx");
const s1Path = path.join(gpxDir, "hk-s1.gpx");

if (!fs.existsSync(otwPath)) {
  console.error("Missing", otwPath);
  process.exit(1);
}

const otwKml = fs.readFileSync(otwPath, "utf8");
const { lines } = parseKmlCoords(otwKml);
const line = lines.sort((a, b) => b.length - a.length)[0];
const cps = parseOtwCps(otwKml);

console.log("OTW line points:", line.length, "km≈", pathLength(line).toFixed(2));
console.log(
  "OTW CPs:",
  cps.map((c) => `${c.sectionEnds}@${c.lat.toFixed(5)},${c.lng.toFixed(5)}`).join(" | "),
);

if (cps.length < 11) {
  console.error("Expected 11 CP/start/finish points, got", cps.length);
  process.exit(1);
}

const sections = splitByCheckpoints(line, cps);
const report = [];

let crossMac = null;
let crossS1 = null;
if (fs.existsSync(macPath)) {
  const mac = parseGpxTrack(fs.readFileSync(macPath, "utf8"));
  crossMac = {
    points: mac.length,
    km: pathLength(mac),
    meanDistToOtwKm: meanNearest(mac, line, 40),
    meanDistOtwToMacKm: meanNearest(line, mac, 40),
  };
  console.log(
    "Cross-check nicholas-fong:",
    `${crossMac.points} pts`,
    `${crossMac.km.toFixed(1)} km`,
    `mean↔OTW ${((crossMac.meanDistToOtwKm + crossMac.meanDistOtwToMacKm) / 2 * 1000).toFixed(0)} m`,
  );
}
if (fs.existsSync(s1Path)) {
  const s1 = parseGpxTrack(fs.readFileSync(s1Path, "utf8"));
  // AFCD s1 is Pak Tam Chung to Long Ke (partial section 1)
  const otwS1 = sections[0].points;
  crossS1 = {
    points: s1.length,
    km: pathLength(s1),
    meanDistToOtwS1Km: meanNearest(s1, otwS1, 10),
  };
  console.log(
    "Cross-check AFCD S1→LongKe:",
    `${crossS1.points} pts`,
    `${crossS1.km.toFixed(1)} km`,
    `mean→OTW S1 ${(crossS1.meanDistToOtwS1Km * 1000).toFixed(0)} m`,
  );
}

const routePoints = [];
let globalKm = 0;
for (const sec of sections) {
  const targetKm = SECTION_KM[sec.sectionId - 1];
  const dense = decimate(sec.points, STEP_M / 1000);
  const scaled = scaleSection(dense, targetKm);
  scaled.forEach((p, i) => {
    // skip duplicate joint except first section start
    if (sec.sectionId > 1 && i === 0 && routePoints.length) return;
    routePoints.push({
      lat: p.lat,
      lng: p.lng,
      sectionId: sec.sectionId,
      kmInSection: p.kmInSection,
      kmAt: +(globalKm + p.kmInSection).toFixed(3),
    });
  });
  report.push({
    sectionId: sec.sectionId,
    rawKm: +sec.rawKm.toFixed(2),
    targetKm,
    snapStartM: +sec.startSnapM.toFixed(1),
    snapEndM: +sec.endSnapM.toFixed(1),
    keptPts: scaled.length,
    endName: sec.endCp.name.replace(/\s+/g, " ").slice(0, 60),
  });
  globalKm += targetKm;
}

console.log("Built ROUTE_TRACK points:", routePoints.length, "totalKm", globalKm.toFixed(1));
console.table(report);

const cpExport = [
  { id: "start", name: "北潭涌起步", sectionEnds: 0, official: "Pak Tam Chung" },
  { id: "cp1", name: "CP1 西灣", sectionEnds: 1, official: "Sai Wan" },
  { id: "cp2", name: "CP2 北潭凹", sectionEnds: 2, official: "Pak Tam Au" },
  { id: "cp3", name: "CP3 企嶺下", sectionEnds: 3, official: "Kei Ling Ha" },
  { id: "cp4", name: "CP4 黃泥頭／基維爾營", sectionEnds: 4, official: "Gilwell Campsite" },
  { id: "cp5", name: "CP5 筆架山", sectionEnds: 5, official: "Beacon Hill" },
  { id: "cp6", name: "CP6 走私坳", sectionEnds: 6, official: "Smugglers Ridge" },
  { id: "cp7", name: "CP7 鉛礦坳", sectionEnds: 7, official: "Lead Mine Pass" },
  { id: "cp8", name: "CP8 荃錦坳／大帽山", sectionEnds: 8, official: "Tai Mo Shan" },
  { id: "cp9", name: "CP9 吉慶橋／大欖涌", sectionEnds: 9, official: "Tai Lam Chung Reservoir" },
  { id: "finish", name: "終點 哈羅", sectionEnds: 10, official: "Harrow International School Hong Kong" },
].map((meta) => {
  const cp = cps.find((c) => c.sectionEnds === meta.sectionEnds);
  return {
    ...meta,
    lat: +cp.lat.toFixed(6),
    lng: +cp.lng.toFixed(6),
  };
});

const outTrack = path.join(root, "src", "data", "routeTrack.ts");
const outMeta = path.join(root, "src", "data", "routeTrack.meta.json");

const header = `/**
 * Live 認路 polyline — 由 OTW 2026 官方 Google My Map KML 生成。
 * 終段跟官方改道：M001–M174 → 元荃古道 C6119–C6124 → 大棠 → 大欖林道 → M178–M193 → 青盈路 → 哈羅。
 * 交叉核對：nicholas-fong MacLehose track、郊野樂行 AFCD 第1段 GPX。
 * 重新生成：node scripts/build-route-track.mjs
 * @generated
 */
`;

/** Compact rows: [lat, lng, sectionId, kmInSection, kmAt] */
const rows = routePoints.map((p) => [p.lat, p.lng, p.sectionId, p.kmInSection, p.kmAt]);

const body = `${header}export type RoutePoint = {
  lat: number;
  lng: number;
  sectionId: number;
  /** 本段內進度 km（0 → section.km） */
  kmInSection: number;
  /** 全場累計 km */
  kmAt: number;
  label?: string;
};

type RouteRow = readonly [lat: number, lng: number, sectionId: number, kmInSection: number, kmAt: number];

const ROUTE_ROWS: RouteRow[] = ${JSON.stringify(rows)};

export const ROUTE_TRACK: RoutePoint[] = ROUTE_ROWS.map(([lat, lng, sectionId, kmInSection, kmAt]) => ({
  lat,
  lng,
  sectionId,
  kmInSection,
  kmAt,
}));

/** 偏離閾值（km）；官方密線可收緊 */
export const OFF_TRACK_KM = 0.12;

export const ROUTE_SOURCE = {
  base: "OTW 2026 Google My Map (Route of OTW 2026 100km)",
  mapId: "17KKPiqSM3PdpfHOTeC347SdbvtmKTa4",
  finishNote:
    "M001–M174 → 右轉元荃古道 C6119–C6124 → 大棠 → 大欖林道 → M178–M193 → 青盈路 → 哈羅終點",
  generatedAt: ${JSON.stringify(new Date().toISOString())},
  pointCount: ${routePoints.length},
} as const;
`;

fs.writeFileSync(outTrack, body, "utf8");
fs.writeFileSync(
  outMeta,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      report,
      crossMac,
      crossS1,
      checkpoints: cpExport,
    },
    null,
    2,
  ),
  "utf8",
);

const cpTs = path.join(root, "src", "data", "checkpoints.ts");
const cpBody = `import { haversineKm } from "../lib/live/geo";

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

export const CHECKPOINTS: Checkpoint[] = ${JSON.stringify(cpExport, null, 2)};

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
`;
fs.writeFileSync(cpTs, cpBody, "utf8");

console.log("Wrote", outTrack);
console.log("Wrote", cpTs);
console.log("Wrote", outMeta);
