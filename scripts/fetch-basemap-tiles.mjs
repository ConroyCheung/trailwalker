/**
 * Download dark basemap tiles along OTW route corridor into public/map-tiles.
 * Offline Live map uses these first; online can still fall back to CDN.
 *
 *   node scripts/fetch-basemap-tiles.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "map-tiles");
const routeFile = path.join(root, "src", "data", "routeTrack.ts");

const ZOOMS = [11, 12, 13];
const PAD_DEG = 0.04;
const TILE_URL = (z, x, y) => `https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
const CONCURRENCY = 4;
const DELAY_MS = 40;

function lon2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function lat2tile(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadRouteBBox() {
  const text = fs.readFileSync(routeFile, "utf8");
  const m = text.match(/const ROUTE_ROWS[^=]*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("ROUTE_ROWS not found");
  const rows = JSON.parse(m[1]);
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const [lat, lng] of rows) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return {
    minLat: minLat - PAD_DEG,
    maxLat: maxLat + PAD_DEG,
    minLng: minLng - PAD_DEG,
    maxLng: maxLng + PAD_DEG,
  };
}

function listTiles(bbox) {
  const tiles = [];
  for (const z of ZOOMS) {
    const x0 = lon2tile(bbox.minLng, z);
    const x1 = lon2tile(bbox.maxLng, z);
    const y0 = lat2tile(bbox.maxLat, z); // north = smaller y
    const y1 = lat2tile(bbox.minLat, z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) tiles.push({ z, x, y });
    }
  }
  return tiles;
}

async function fetchOne({ z, x, y }) {
  const dest = path.join(outDir, String(z), String(x), `${y}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 200) return "skip";
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(TILE_URL(z, x, y), {
    headers: { "User-Agent": "trailwalker-offline-basemap/1.0 (local build)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${z}/${x}/${y}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return "ok";
}

async function pool(items, limit, worker) {
  let i = 0;
  let ok = 0,
    skip = 0,
    fail = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      try {
        const r = await worker(item);
        if (r === "skip") skip++;
        else ok++;
      } catch (e) {
        fail++;
        console.warn("fail", item, e.message);
      }
      if (DELAY_MS) await sleep(DELAY_MS);
      if ((ok + skip + fail) % 50 === 0) {
        console.log(`progress ${ok + skip + fail}/${items.length} (ok ${ok} skip ${skip} fail ${fail})`);
      }
    }
  });
  await Promise.all(runners);
  return { ok, skip, fail };
}

const bbox = loadRouteBBox();
const tiles = listTiles(bbox);
console.log("bbox", bbox);
console.log("tiles", tiles.length, "zooms", ZOOMS.join(","));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "Carto Dark Matter (basemaps.cartocdn.com/dark_all)",
      zooms: ZOOMS,
      bbox,
      tileCount: tiles.length,
      template: "/map-tiles/{z}/{x}/{y}.png",
    },
    null,
    2,
  ),
);

const result = await pool(tiles, CONCURRENCY, fetchOne);
console.log("done", result);
if (result.fail > tiles.length * 0.2) process.exit(1);
