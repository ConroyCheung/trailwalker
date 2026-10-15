import { useEffect, useMemo, useRef } from "react";
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
  const sectionLayerRef = useRef<L.Polyline | null>(null);
  const doneLayerRef = useRef<L.Polyline | null>(null);
  const posMarkerRef = useRef<L.CircleMarker | null>(null);
  const snapMarkerRef = useRef<L.CircleMarker | null>(null);
  const fittedKeyRef = useRef<string | null>(null);

  const dayLatLngs = useMemo(() => {
    if (training) return [] as L.LatLngExpression[];
    const start = Math.min(startSectionId, endSectionId);
    const end = Math.max(startSectionId, endSectionId);
    return ROUTE_TRACK.filter((p) => p.sectionId >= start && p.sectionId <= end).map(
      (p) => [p.lat, p.lng] as L.LatLngExpression,
    );
  }, [startSectionId, endSectionId, training]);

  const sectionLatLngs = useMemo(() => {
    if (training) {
      return training.track.map((p) => [p.lat, p.lng] as L.LatLngExpression);
    }
    return ROUTE_TRACK.filter((p) => p.sectionId === currentSectionId).map(
      (p) => [p.lat, p.lng] as L.LatLngExpression,
    );
  }, [currentSectionId, training]);

  const doneLatLngs = useMemo(() => {
    if (training) {
      const along =
        trackMatch && !trackMatch.offTrack && trackMatch.kmAlong != null
          ? trackMatch.kmAlong
          : progressKm;
      return training.track
        .filter((p) => p.kmAlong <= along + 0.05)
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
  }, [startSectionId, endSectionId, currentSectionId, trackMatch, training, progressKm]);

  const fitKey = training ? `t:${training.id}` : `s:${currentSectionId}`;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: MAX_NATIVE_ZOOM + 1,
      minZoom: 10,
    });

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
    const section = L.polyline([], {
      color: "#5cb87a",
      weight: 5,
      opacity: 0.95,
    }).addTo(map);
    const done = L.polyline([], {
      color: "#c9a66b",
      weight: 5,
      opacity: 0.95,
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
      color: "#c9a66b",
      weight: 1,
      fillColor: "#c9a66b",
      fillOpacity: 0.9,
    });

    mapRef.current = map;
    dayLayerRef.current = day;
    sectionLayerRef.current = section;
    doneLayerRef.current = done;
    posMarkerRef.current = pos;
    snapMarkerRef.current = snap;

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      fittedKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    dayLayerRef.current?.setLatLngs(dayLatLngs);
  }, [dayLatLngs]);

  useEffect(() => {
    const map = mapRef.current;
    const section = sectionLayerRef.current;
    if (!map || !section) return;
    section.setLatLngs(sectionLatLngs);
    if (sectionLatLngs.length >= 2 && fittedKeyRef.current !== fitKey) {
      fittedKeyRef.current = fitKey;
      map.fitBounds(L.latLngBounds(sectionLatLngs as L.LatLngTuple[]), {
        padding: [28, 28],
        maxZoom: 14,
      });
    }
  }, [sectionLatLngs, fitKey]);

  useEffect(() => {
    doneLayerRef.current?.setLatLngs(doneLatLngs);
  }, [doneLatLngs]);

  useEffect(() => {
    const map = mapRef.current;
    const pos = posMarkerRef.current;
    const snap = snapMarkerRef.current;
    if (!map || !pos || !snap) return;

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
  }, [geo, trackMatch, follow]);

  return (
    <div className="live-map-wrap">
      <div ref={containerRef} className="live-map" role="img" aria-label="練行路線地圖" />
      <div className="live-map-legend">
        <span className="leg-route">{training ? "來回" : "本段"}</span>
        <span className="leg-done">已行</span>
        <span className="leg-pos">GPS</span>
      </div>
    </div>
  );
}
