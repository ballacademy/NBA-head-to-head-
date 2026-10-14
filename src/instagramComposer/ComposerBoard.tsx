import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

/** Design-px 4:5 board, scaled as a unit so type/overlays match the PNG. */
export function ComposerBoard({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const sync = () => {
      const width = node.clientWidth;
      if (width > 0) {
        setScale(width / GRAPHIC_WIDTH);
      }
    };
    sync();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="sc-stage__board">
      <div
        className="sc-stage__board-inner"
        style={{
          width: GRAPHIC_WIDTH,
          height: GRAPHIC_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const boardUnitFromNode = (node: HTMLElement) => {
  const width = node.offsetWidth;
  return width > 0 ? width / GRAPHIC_WIDTH : 1;
};
