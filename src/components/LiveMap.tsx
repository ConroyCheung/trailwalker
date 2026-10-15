import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTE_TRACK } from "../data/routeTrack";
import type { TrainingDef } from "../data/trainings";
import type { GeoFix } from "../hooks/useGeolocation";
import type { TrackMatch } from "../lib/live/trackMatch";

type Props = {
  currentSectionId: number;
  startSectionId: number;
  endSectionId: number;
  geo: GeoFix | null;
  trackMatch: TrackMatch | null;
  follow: boolean;
  /** 有則用練行 track（針山來回等） */
  training?: TrainingDef | null;
  /** 練行進度 kmAlong */
  progressKm?: number;
};

/** Bundled offline corridor tiles only — never hits CARTO CDN (no API key / watermark). */
const LOCAL_TILES = "/map-tiles/{z}/{x}/{y}.png";
const MAX_NATIVE_ZOOM = 14;

const COLOR_ROUTE = "#5cb87a";
const COLOR_DONE = "#c9a66b";

export function LiveMap({
  currentSectionId,
  startSectionId,
  endSectionId,
  geo,
  trackMatch,
  follow,
  training = null,
  progressKm = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const dayLayerRef = useRef<L.Polyline | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const doneLayerRef = useRef<L.Polyline | null>(null);
  const posMarkerRef = useRef<L.CircleMarker | null>(null);
  const snapMarkerRef = useRef<L.CircleMarker | null>(null);
  const fittedKeyRef = useRef<string | null>(null);
  const [mapGen, setMapGen] = useState(0);

  const alongKm = useMemo(() => {
    if (!training) return progressKm;
    if (trackMatch && !trackMatch.offTrack && trackMatch.kmAlong != null) {
      return trackMatch.kmAlong;
    }
    return progressKm;
  }, [training, trackMatch, progressKm]);

  const outEndKm = useMemo(() => {
    if (!training) return 0;
    return training.track.filter((p) => p.leg === "out").at(-1)?.kmAlong ?? training.totalKm / 2;
  }, [training]);

  /** 方案 B：過轉折後當回程 */
  const onBack = useMemo(() => {
    if (!training) return false;
    if (trackMatch && !trackMatch.offTrack && trackMatch.leg === "back") return true;
    if (trackMatch && !trackMatch.offTrack && trackMatch.leg === "out") return false;
    return alongKm > outEndKm + 0.05;
  }, [training, trackMatch, alongKm, outEndKm]);

  const dayLatLngs = useMemo(() => {
    if (training) return [] as L.LatLngExpression[];
    const start = Math.min(startSectionId, endSectionId);
    const end = Math.max(startSectionId, endSectionId);
    return ROUTE_TRACK.filter((p) => p.sectionId >= start && p.sectionId <= end).map(
      (p) => [p.lat, p.lng] as L.LatLngExpression,
    );
  }, [startSectionId, endSectionId, training]);

  /** 而家顯示嘅計劃線：去程淨 out；回程收起 out，淨 back */
  const routeLatLngs = useMemo(() => {
    if (!training) {
      return ROUTE_TRACK.filter((p) => p.sectionId === currentSectionId).map(
        (p) => [p.lat, p.lng] as L.LatLngExpression,
      );
    }
    const leg = onBack ? "back" : "out";
    return training.track
      .filter((p) => p.leg === leg)
      .map((p) => [p.lat, p.lng] as L.LatLngExpression);
  }, [training, currentSectionId, onBack]);

  /** fit 成條來回一次，轉折唔跳 zoom */
  const fitLatLngs = useMemo(() => {
    if (training) {
      return training.track.map((p) => [p.lat, p.lng] as L.LatLngExpression);
    }
    return routeLatLngs;
  }, [training, routeLatLngs]);

  const doneLatLngs = useMemo(() => {
    if (training) {
      if (onBack) {
        // 回程已行：淨回程段由轉折行到而家
        return training.track
          .filter((p) => p.leg === "back" && p.kmAlong <= alongKm + 0.05)
          .map((p) => [p.lat, p.lng] as L.LatLngExpression);
      }
      return training.track
        .filter((p) => p.leg === "out" && p.kmAlong <= alongKm + 0.05)
        .map((p) => [p.lat, p.lng] as L.LatLngExpression);
    }
    const start = Math.min(startSectionId, endSectionId);
    return ROUTE_TRACK.filter((p) => {
      if (p.sectionId < start) return false;
      if (p.sectionId < currentSectionId) return true;
      if (p.sectionId > currentSectionId) return false;
      if (!trackMatch || trackMatch.sectionId !== currentSectionId) return p.kmInSection <= 0;
      return p.kmInSection <= trackMatch.kmInSection + 0.05;
    }).map((p) => [p.lat, p.lng] as L.LatLngExpression);
  }, [
    training,
    onBack,
    alongKm,
    startSectionId,
    endSectionId,
    currentSectionId,
    trackMatch,
  ]);

  const fitKey = training ? `t:${training.id}` : `s:${currentSectionId}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const staleId = (el as unknown as { _leaflet_id?: number })._leaflet_id;
    if (staleId != null) {
      el.innerHTML = "";
      delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    let map: L.Map;
    try {
      map = L.map(el, {
        zoomControl: false,
        attributionControl: true,
        maxZoom: MAX_NATIVE_ZOOM + 1,
        minZoom: 10,
      });
    } catch (err) {
      console.error("LiveMap init failed", err);
      el.innerHTML = "";
      delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
      try {
        map = L.map(el, {
          zoomControl: false,
          attributionControl: true,
          maxZoom: MAX_NATIVE_ZOOM + 1,
          minZoom: 10,
        });
      } catch (err2) {
        console.error("LiveMap retry failed", err2);
        return;
      }
    }

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer(LOCAL_TILES, {
      maxZoom: MAX_NATIVE_ZOOM + 1,
      maxNativeZoom: MAX_NATIVE_ZOOM,
      minZoom: 10,
      attribution: "離線底圖 · OTW 走廊",
      errorTileUrl:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    }).addTo(map);

    const day = L.polyline([], {
      color: "#3d7a55",
      weight: 3,
      opacity: 0.35,
    }).addTo(map);
    const route = L.polyline([], {
      color: COLOR_ROUTE,
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    const done = L.polyline([], {
      color: COLOR_DONE,
      weight: 5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    const pos = L.circleMarker([22.4, 114.2], {
      radius: 8,
      color: "#d7e4db",
      weight: 2,
      fillColor: "#3d7a55",
      fillOpacity: 1,
    });
    const snap = L.circleMarker([22.4, 114.2], {
      radius: 5,
      color: COLOR_DONE,
      weight: 1,
      fillColor: COLOR_DONE,
      fillOpacity: 0.9,
    });

    mapRef.current = map;
    dayLayerRef.current = day;
    routeLayerRef.current = route;
    doneLayerRef.current = done;
    posMarkerRef.current = pos;
    snapMarkerRef.current = snap;

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);

    setMapGen((n) => n + 1);

    return () => {
      ro.disconnect();
      try {
        map.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      dayLayerRef.current = null;
      routeLayerRef.current = null;
      doneLayerRef.current = null;
      posMarkerRef.current = null;
      snapMarkerRef.current = null;
      fittedKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapGen) return;
    try {
      dayLayerRef.current?.setLatLngs(dayLatLngs);
      routeLayerRef.current?.setLatLngs(routeLatLngs);
      doneLayerRef.current?.setLatLngs(doneLatLngs);
      routeLayerRef.current?.bringToFront();
      doneLayerRef.current?.bringToFront();
    } catch (err) {
      console.error("LiveMap route update failed", err);
    }
  }, [mapGen, dayLatLngs, routeLatLngs, doneLatLngs]);

  useEffect(() => {
    if (!mapGen) return;
    const map = mapRef.current;
    if (!map || fitLatLngs.length < 2) return;
    if (fittedKeyRef.current === fitKey) return;
    fittedKeyRef.current = fitKey;
    map.fitBounds(L.latLngBounds(fitLatLngs as L.LatLngTuple[]), {
      padding: [28, 28],
      maxZoom: 14,
    });
  }, [mapGen, fitLatLngs, fitKey]);

  useEffect(() => {
    const map = mapRef.current;
    const pos = posMarkerRef.current;
    const snap = snapMarkerRef.current;
    if (!mapGen || !map || !pos || !snap) return;

    if (geo) {
      pos.setLatLng([geo.lat, geo.lng]);
      if (!map.hasLayer(pos)) pos.addTo(map);
      if (follow) map.panTo([geo.lat, geo.lng], { animate: true });
    }

    if (trackMatch && !trackMatch.offTrack) {
      snap.setLatLng([trackMatch.snap.lat, trackMatch.snap.lng]);
      if (!map.hasLayer(snap)) snap.addTo(map);
    } else if (map.hasLayer(snap)) {
      map.removeLayer(snap);
    }
  }, [mapGen, geo, trackMatch, follow]);

  return (
    <div className="live-map-wrap">
      <div ref={containerRef} className="live-map" role="img" aria-label="練行路線地圖" />
      <div className="live-map-legend">
        {training ? (
          <span className="leg-route">{onBack ? "回程" : "去程"}</span>
        ) : (
          <span className="leg-route">本段</span>
        )}
        <span className="leg-done">已行</span>
        <span className="leg-pos">GPS</span>
      </div>
    </div>
  );
}
