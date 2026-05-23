import { useEffect, useRef, useState, type ReactNode } from "react";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
};

/**
 * Isolated pinch-zoom + pan container. Touch-only (mobile/tablet).
 * Desktop behavior is unchanged — content renders normally.
 */
export function PinchZoomContainer({
  children,
  minScale = 1,
  maxScale = 3,
  className,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    // gesture
    startDist: 0,
    startScale: 1,
    startMidX: 0,
    startMidY: 0,
    startTx: 0,
    startTy: 0,
    panStartX: 0,
    panStartY: 0,
    mode: "idle" as "idle" | "pinch" | "pan",
  });

  const [zoomed, setZoomed] = useState(false);

  const apply = (animate = false) => {
    const el = contentRef.current;
    if (!el) return;
    const { scale, tx, ty } = stateRef.current;
    el.style.transition = animate ? "transform 240ms ease-out" : "none";
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    el.style.transformOrigin = "0 0";
    const isZoomed = scale > 1.01;
    setZoomed((prev) => (prev === isZoomed ? prev : isZoomed));
  };

  const clamp = () => {
    const v = viewportRef.current;
    const c = contentRef.current;
    if (!v || !c) return;
    const s = stateRef.current;
    const cw = c.offsetWidth * s.scale;
    const ch = c.offsetHeight * s.scale;
    const vw = v.clientWidth;
    const vh = v.clientHeight;
    const minTx = Math.min(0, vw - cw);
    const minTy = Math.min(0, vh - ch);
    s.tx = Math.min(0, Math.max(minTx, s.tx));
    s.ty = Math.min(0, Math.max(minTy, s.ty));
  };

  useEffect(() => {
    const v = viewportRef.current;
    if (!v) return;

    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onTouchStart = (e: TouchEvent) => {
      const s = stateRef.current;
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        s.startDist = dist(a, b);
        s.startScale = s.scale;
        const rect = v.getBoundingClientRect();
        s.startMidX = (a.clientX + b.clientX) / 2 - rect.left;
        s.startMidY = (a.clientY + b.clientY) / 2 - rect.top;
        s.startTx = s.tx;
        s.startTy = s.ty;
        s.mode = "pinch";
      } else if (e.touches.length === 1 && s.scale > 1.01) {
        s.panStartX = e.touches[0].clientX - s.tx;
        s.panStartY = e.touches[0].clientY - s.ty;
        s.mode = "pan";
      } else {
        s.mode = "idle";
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const s = stateRef.current;
      if (s.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        const ratio = d / (s.startDist || d);
        const newScale = Math.min(
          maxScale,
          Math.max(minScale, s.startScale * ratio),
        );
        // keep the midpoint stable in content coords
        const k = newScale / s.startScale;
        s.tx = s.startMidX - (s.startMidX - s.startTx) * k;
        s.ty = s.startMidY - (s.startMidY - s.startTy) * k;
        s.scale = newScale;
        clamp();
        apply();
      } else if (s.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        s.tx = e.touches[0].clientX - s.panStartX;
        s.ty = e.touches[0].clientY - s.panStartY;
        clamp();
        apply();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const s = stateRef.current;
      if (e.touches.length === 0) s.mode = "idle";
      else if (e.touches.length === 1 && s.scale > 1.01) {
        s.panStartX = e.touches[0].clientX - s.tx;
        s.panStartY = e.touches[0].clientY - s.ty;
        s.mode = "pan";
      }
    };

    v.addEventListener("touchstart", onTouchStart, { passive: false });
    v.addEventListener("touchmove", onTouchMove, { passive: false });
    v.addEventListener("touchend", onTouchEnd);
    v.addEventListener("touchcancel", onTouchEnd);
    return () => {
      v.removeEventListener("touchstart", onTouchStart);
      v.removeEventListener("touchmove", onTouchMove);
      v.removeEventListener("touchend", onTouchEnd);
      v.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [minScale, maxScale]);

  const reset = () => {
    const s = stateRef.current;
    s.scale = 1;
    s.tx = 0;
    s.ty = 0;
    apply(true);
  };

  return (
    <div
      ref={viewportRef}
      className={cn("relative overflow-hidden", className)}
      style={{ touchAction: "pan-x pan-y", WebkitOverflowScrolling: "touch" }}
    >
      <div ref={contentRef} className="will-change-transform">
        {children}
      </div>
      {zoomed && (
        <button
          type="button"
          onClick={reset}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background shadow-lg backdrop-blur transition-opacity hover:bg-foreground"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Tilbakestill zoom
        </button>
      )}
    </div>
  );
}