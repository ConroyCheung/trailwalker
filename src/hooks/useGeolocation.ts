import { useEffect, useState } from "react";

export type GeoFix = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  at: number;
};

export type GeoState = {
  fix: GeoFix | null;
  error: string | null;
  watching: boolean;
};

export function useGeolocation(enabled: boolean): GeoState {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setWatching(false);
      return;
    }
    if (!navigator.geolocation) {
      setError("呢部機唔支援定位");
      setWatching(false);
      return;
    }

    setError(null);
    setWatching(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          altitudeM: pos.coords.altitude,
          speedMps: pos.coords.speed,
          at: pos.timestamp || Date.now(),
        });
        setError(null);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "未授權定位"
            : err.code === err.POSITION_UNAVAILABLE
              ? "定位暫時唔到"
              : "定位逾時";
        setError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      setWatching(false);
    };
  }, [enabled]);

  return { fix, error, watching };
}
