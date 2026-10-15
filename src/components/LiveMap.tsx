import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTE_TRACK } from "../data/routeTrack";
import type { GeoFix } from "../hooks/useGeolocation";
import type { TrackMatch } from "../lib/live/trackMatch";

type Props = {
  currentSectionId: number;
  startSectionId: number;
  endSectionId: number;
  geo: GeoFix | null;
  trackMatch: TrackMatch | null;
  follow: boolean;
};

const LOCAL_TILES = "/map-tiles/{z}/{x}/{y}.png";
const ONLINE_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export function LiveMap({
  currentSectionId,
  startSectionId,
  endSectionId,
  geo,
  trackMatch,
  follow,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const doneLayerRef = useRef<L.Polyline | null>(null);
  const posMarkerRef = useRef<L.CircleMarker | null>(null);
  const snapMarkerRef = useRef<L.CircleMarker | null>(null);

  const routeLatLngs = useMemo(() => {
    const start = Math.min(startSectionId, endSectionId);
    const end = Math.max(startSectionId, endSectionId);
    return ROUTE_TRACK.filter((p) => p.sectionId >= start && p.sectionId <= end).map(
      (p) => [p.lat, p.lng] as L.LatLngExpression,
    );
  }, [startSectionId, endSectionId]);

  const doneLatLngs = useMemo(() => {
    const start = Math.min(startSectionId, endSectionId);
    return ROUTE_TRACK.filter((p) => {
      if (p.sectionId < start) return false;
      if (p.sectionId < currentSectionId) return true;
      if (p.sectionId > currentSectionId) return false;
      if (!trackMatch || trackMatch.sectionId !== currentSectionId) return p.kmInSection <= 0;
      return p.kmInSection <= trackMatch.kmInSection + 0.05;
    }).map((p) => [p.lat, p.lng] as L.LatLngExpression);
  }, [startSectionId, endSectionId, currentSectionId, trackMatch]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 16,
      minZoom: 10,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    const local = L.tileLayer(LOCAL_TILES, {
      maxZoom: 13,
      maxNativeZoom: 13,
      minZoom: 10,
      attribution: "離線底圖 · Carto Dark",
      errorTileUrl:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    });

    const online = L.tileLayer(ONLINE_TILES, {
      maxZoom: 16,
      subdomains: "abcd",
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM',
    });

    // Prefer local pack; when online and zoomed in, online layer sits under for higher zoom
    online.addTo(map);
    local.addTo(map);
    local.setZIndex(2);
    online.setZIndex(1);

    const route = L.polyline([], {
      color: "#5cb87a",
      weight: 4,
      opacity: 0.85,
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
    routeLayerRef.current = route;
    doneLayerRef.current = done;
    posMarkerRef.current = pos;
    snapMarkerRef.current = snap;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const route = routeLayerRef.current;
    if (!map || !route) return;
    route.setLatLngs(routeLatLngs);
    if (routeLatLngs.length >= 2) {
      map.fitBounds(L.latLngBounds(routeLatLngs as L.LatLngTuple[]), { padding: [24, 24], maxZoom: 13 });
    }
  }, [routeLatLngs]);

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
        <span className="leg-route">今日路線</span>
        <span className="leg-done">已行</span>
        <span className="leg-pos">GPS</span>
      </div>
    </div>
  );
}
