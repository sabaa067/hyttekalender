import { useState, type ReactNode } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
};

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-foreground/85 text-background shadow-lg backdrop-blur transition hover:bg-foreground active:scale-95";
  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-20 flex flex-col gap-2">
      <button type="button" aria-label="Zoom inn" className={btn} onClick={() => zoomIn(0.4)}>
        <Plus className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Zoom ut" className={btn} onClick={() => zoomOut(0.4)}>
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Tilbakestill"
        className={btn}
        onClick={() => resetTransform()}
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Dedicated spreadsheet viewport: fixed-height window that pans and zooms
 * its children freely (no bounds), much like Google Sheets mobile.
 *
 * - Pinch to zoom, double-tap to zoom, drag/pan with one finger at any zoom
 * - Zooms out below 1× to fit wide content on small screens
 * - Touch action locked so only the viewport reacts, never the page
 */
export function PinchZoomContainer({
  children,
  minScale = 0.35,
  maxScale = 5,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        "h-[70vh] sm:h-[78vh]",
        className,
      )}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <TransformWrapper
        initialScale={1}
        minScale={minScale}
        maxScale={maxScale}
        limitToBounds={false}
        centerOnInit
        smooth
        wheel={{ step: 0.12, smoothStep: 0.008 }}
        pinch={{ step: 6 }}
        doubleClick={{ mode: "toggle", step: 1.6, animationTime: 220 }}
        panning={{
          velocityDisabled: false,
          allowLeftClickPan: true,
          excluded: ["input", "textarea"],
        }}
        velocityAnimation={{ sensitivity: 1, animationTime: 400 }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ display: "inline-block" }}
        >
          {children}
        </TransformComponent>
        <ZoomControls />
      </TransformWrapper>
    </div>
  );
}
