import { useRef, type PointerEvent } from "react";

type Opts = {
  onLeft: () => void;
  onRight: () => void;
};

export function useSwipe({ onLeft, onRight }: Opts) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return {
    onPointerDown: (e: PointerEvent) => {
      startX.current = e.clientX;
      startY.current = e.clientY;
    },
    onPointerUp: (e: PointerEvent) => {
      if (startX.current == null || startY.current == null) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      startX.current = null;
      startY.current = null;
      if (Math.abs(dx) < 56) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.15) return;
      if (dx < 0) onLeft();
      else onRight();
    },
  };
}
