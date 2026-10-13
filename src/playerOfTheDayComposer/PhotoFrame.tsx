import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  panFromPinch,
  panFromPointerDrag,
  photoPointDistance,
  photoPointMid,
  zoomFromWheelDelta,
  type PhotoPoint,
} from "./photoGestures";
import {
  clampPan,
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  photoRotate,
  photoZoom,
  type PhotoPan,
} from "./playerOfTheDayState";

interface PhotoFrameProps {
  src: string | null;
  label: string;
  pan: PhotoPan;
  custom: boolean;
  empty: boolean;
  zoomStep?: number;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
}

const PHOTO_CHROME_CLASSES = [
  "pod-photo__tool",
  "pod-photo__file",
  "pod-photo__pick",
  "pod-photo__zoom-in",
  "pod-photo__rotate",
] as const;

const PHOTO_SURFACE_CLASS = "pod-photo__surface";

export const photoFrameFilled = (src: string | null) => Boolean(src);

export const isPhotoChromeClassName = (className: string) =>
  PHOTO_CHROME_CLASSES.some((name) => className.split(/\s+/).includes(name));

export const isPhotoChromeTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }
  let node: Element | null = target;
  while (node) {
    if (isPhotoChromeClassName(node.className?.toString?.() ?? "")) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
};

const stopChromePointer = (event: ReactPointerEvent) => {
  event.stopPropagation();
};

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read photo"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });

type Gesture =
  | { type: "pan"; pointer: number; x: number; y: number; pan: PhotoPan }
  | {
      type: "pinch";
      dist: number;
      mid: PhotoPoint;
      pan: PhotoPan;
    };

export function PhotoFrame({
  src,
  label,
  pan,
  custom,
  empty: _empty,
  zoomStep = 0.25,
  onPan,
  onUpload,
  onPick,
}: PhotoFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  panRef.current = pan;
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;
  const pointers = useRef(new Map<number, PhotoPoint>());
  const gesture = useRef<Gesture | null>(null);
  const gestureScale = useRef(photoZoom(pan));
  const zoom = photoZoom(pan);
  const rotate = photoRotate(pan);
  const filled = photoFrameFilled(src);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !filled) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = panRef.current;
      onPanRef.current(
        clampPan({
          ...current,
          zoom: zoomFromWheelDelta(photoZoom(current), event.deltaY),
        }),
      );
    };
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScale.current = photoZoom(panRef.current);
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale;
      if (typeof scale !== "number") {
        return;
      }
      onPanRef.current(
        clampPan({ ...panRef.current, zoom: gestureScale.current * scale }),
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("gesturestart", onGestureStart, { passive: false });
    node.addEventListener("gesturechange", onGestureChange, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("gesturestart", onGestureStart);
      node.removeEventListener("gesturechange", onGestureChange);
    };
  }, [filled]);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    onUpload(await readFile(file));
  };

  const bumpZoom = (delta: number) => {
    onPan(clampPan({ ...pan, zoom: zoom + delta }));
  };

  const beginGesture = () => {
    const pts = [...pointers.current.entries()];
    if (pts.length >= 2) {
      const [, a] = pts[0]!;
      const [, b] = pts[1]!;
      gesture.current = {
        type: "pinch",
        dist: photoPointDistance(a, b),
        mid: photoPointMid(a, b),
        pan: { ...panRef.current },
      };
      return;
    }
    if (pts.length === 1) {
      const [id, point] = pts[0]!;
      gesture.current = {
        type: "pan",
        pointer: id,
        x: point.x,
        y: point.y,
        pan: { ...panRef.current },
      };
      return;
    }
    gesture.current = null;
  };

  const applyMove = (target: HTMLElement) => {
    const box = target.getBoundingClientRect();
    const current = gesture.current;
    if (!current) {
      return;
    }
    if (current.type === "pinch") {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) {
        return;
      }
      onPanRef.current(
        panFromPinch(
          current.pan,
          current.dist,
          photoPointDistance(pts[0]!, pts[1]!),
          current.mid,
          photoPointMid(pts[0]!, pts[1]!),
          box.width,
          box.height,
        ),
      );
      return;
    }
    const point = pointers.current.get(current.pointer);
    if (!point) {
      return;
    }
    onPanRef.current(
      panFromPointerDrag(
        current.pan,
        point.x - current.x,
        point.y - current.y,
        box.width,
        box.height,
      ),
    );
  };

  return (
    <div
      ref={rootRef}
      className={["pod-photo", filled ? "" : "is-empty", custom ? "is-custom" : ""]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => {
        if (
          !filled ||
          isPhotoChromeTarget(event.target) ||
          (event.pointerType === "mouse" && event.button !== 0)
        ) {
          return;
        }
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        beginGesture();
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) {
          return;
        }
        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        applyMove(event.currentTarget);
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        beginGesture();
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        beginGesture();
      }}
      onDragOver={(event) => {
        if (
          [...event.dataTransfer.types].some((type) =>
            type.toLowerCase().includes("files"),
          )
        ) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const file = [...event.dataTransfer.files].find((item) =>
          item.type.startsWith("image/"),
        );
        if (file) {
          void readFile(file).then(onUpload);
        }
      }}
    >
      {src ? (
        <div className={PHOTO_SURFACE_CLASS}>
          <img
            className="pod-photo__img"
            src={src}
            alt=""
            draggable={false}
            style={{
              objectPosition: `${pan.x * 100}% ${pan.y * 100}%`,
              transform: `rotate(${rotate}deg) scale(${zoom})`,
              transformOrigin: `${pan.x * 100}% ${pan.y * 100}%`,
            }}
          />
        </div>
      ) : (
        <button type="button" className="pod-photo__pick" onClick={onPick}>
          Pick player
        </button>
      )}
      <div className="pod-photo__tools">
        <label className="pod-photo__tool">
          Upload photo
          <input
            className="pod-photo__file"
            type="file"
            accept="image/*"
            aria-label={`Upload photo for ${label}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.currentTarget.value = "";
              event.currentTarget.blur();
            }}
          />
        </label>
        {filled ? (
          <button
            type="button"
            className="pod-photo__tool"
            onPointerDown={stopChromePointer}
            onClick={(event) => {
              event.stopPropagation();
              onPick();
            }}
          >
            Change player
          </button>
        ) : null}
        {filled ? (
          <div className="pod-photo__zoom">
            <button
              type="button"
              className="pod-photo__tool"
              aria-label={`Zoom out photo for ${label}`}
              onClick={() => bumpZoom(-zoomStep)}
            >
              −
            </button>
            <span>{zoom.toFixed(1)}×</span>
            <button
              type="button"
              className="pod-photo__tool pod-photo__zoom-in"
              aria-label={`Zoom in photo for ${label}`}
              onClick={() => bumpZoom(zoomStep)}
            >
              +
            </button>
            {custom ? (
              <button
                type="button"
                className="pod-photo__tool pod-photo__rotate"
                aria-label={`Rotate photo for ${label}`}
                onClick={() =>
                  onPan(clampPan({ ...pan, rotate: rotate + 90 }))
                }
              >
                Rotate
              </button>
            ) : null}
            <button
              type="button"
              className="pod-photo__tool"
              aria-label={`Reset photo for ${label}`}
              onClick={() =>
                onPan({
                  ...(custom ? DEFAULT_CUSTOM_PAN : DEFAULT_HEADSHOT_PAN),
                })
              }
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const dataUrlFromClipboard = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) {
    return null;
  }
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (!file) {
        continue;
      }
      return readFile(file);
    }
  }
  return null;
};
