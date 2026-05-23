import { useState, type ReactNode } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
};

function ResetButton({ visible }: { visible: boolean }) {
  const { resetTransform } = useControls();
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => resetTransform()}
      className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background shadow-lg backdrop-blur hover:bg-foreground"
    >
      <Minimize2 className="h-3.5 w-3.5" />
      Tilbakestill zoom
    </button>
  );
}

/**
 * Pinch-zoom + pan container powered by react-zoom-pan-pinch.
 * Isolated to its subtree — the rest of the page is unaffected.
 * Supports pinch zoom, pan when zoomed, double-tap to zoom, and reset.
 */
export function PinchZoomContainer({
  children,
  minScale = 1,
  maxScale = 4,
  className,
}: Props) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <TransformWrapper
        initialScale={1}
        minScale={minScale}
        maxScale={maxScale}
        limitToBounds
        centerOnInit={false}
        smooth
        wheel={{ step: 0.1, smoothStep: 0.005 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "toggle", step: 1.5, animationTime: 200 }}
        panning={{ velocityDisabled: false }}
        onTransformed={(_, state) => {
          const isZoomed = state.scale > 1.01;
          setZoomed((prev) => (prev === isZoomed ? prev : isZoomed));
        }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%" }}
        >
          {children}
        </TransformComponent>
        <ResetButton visible={zoomed} />
      </TransformWrapper>
    </div>
  );
}
