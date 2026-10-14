import { useEffect, useState } from "react";

export function useOnline() {
  const get = () => (typeof navigator === "undefined" ? true : navigator.onLine);
  const [online, setOnline] = useState(get);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
