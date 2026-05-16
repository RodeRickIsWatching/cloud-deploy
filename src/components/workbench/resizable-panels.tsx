import { useRef } from "react";

type DragDelta = {
  deltaX: number;
  deltaY: number;
};

type ResizeHandleProps = {
  ariaLabel: string;
  orientation?: "horizontal" | "vertical";
  onDrag: (delta: DragDelta) => void;
};

export function ResizeHandle({ ariaLabel, orientation = "vertical", onDrag }: ResizeHandleProps) {
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startPoint.current = { x: event.clientX, y: event.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!startPoint.current) {
        return;
      }

      onDrag({
        deltaX: moveEvent.clientX - startPoint.current.x,
        deltaY: moveEvent.clientY - startPoint.current.y
      });
    };

    const handlePointerUp = () => {
      startPoint.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={orientation === "vertical" ? "w-1 cursor-col-resize bg-border hover:bg-primary" : "h-1 cursor-row-resize bg-border hover:bg-primary"}
      onPointerDown={handlePointerDown}
    />
  );
}
