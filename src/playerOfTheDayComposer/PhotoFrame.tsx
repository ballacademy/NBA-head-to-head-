import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  clampPan,
  clampZoom,
  photoZoom,
  type PhotoPan,
} from "./playerOfTheDayState";

interface PhotoFrameProps {
  src: string | null;
  label: string;
  pan: PhotoPan;
  custom: boolean;
  empty: boolean;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
}

const PHOTO_CHROME_CLASSES = [
  "pod-photo__tool",
  "pod-photo__tools",
  "pod-photo__file",
  "pod-photo__pick",
  "pod-photo__zoom",
] as const;

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

export function PhotoFrame({
  src,
  label,
  pan,
  custom,
  empty,
  onPan,
  onUpload,
  onPick,
}: PhotoFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    pan: PhotoPan;
  } | null>(null);
  const zoom = photoZoom(pan);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !custom || empty) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.12 : -0.12;
      onPan(clampPan({ ...pan, zoom: zoom + delta }));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [custom, empty, onPan, pan, zoom]);

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

  return (
    <div
      ref={rootRef}
      className={["pod-photo", empty ? "is-empty" : "", custom ? "is-custom" : ""]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => {
        if (empty || event.button !== 0 || isPhotoChromeTarget(event.target)) {
          return;
        }
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        drag.current = {
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          pan,
        };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.pointer !== event.pointerId) {
          return;
        }
        const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const span = Math.max(1, zoom);
        onPan(
          clampPan({
            x: start.pan.x - dx / Math.max(1, box.width * span),
            y: start.pan.y - dy / Math.max(1, box.height * span),
            zoom: photoZoom(start.pan),
          }),
        );
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointer === event.pointerId) {
          drag.current = null;
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {src ? (
        <img
          className="pod-photo__img"
          src={src}
          alt=""
          draggable={false}
          style={{
            objectPosition: `${pan.x * 100}% ${pan.y * 100}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${pan.x * 100}% ${pan.y * 100}%`,
          }}
        />
      ) : (
        <button type="button" className="pod-photo__pick" onClick={onPick}>
          Pick player
        </button>
      )}
      <div
        className="pod-photo__tools"
        onPointerDown={stopChromePointer}
        onPointerUp={stopChromePointer}
      >
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
            }}
          />
        </label>
        {empty ? null : (
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
        )}
        {custom ? (
          <div className="pod-photo__zoom">
            <button
              type="button"
              className="pod-photo__tool"
              aria-label={`Zoom out photo for ${label}`}
              onClick={() => bumpZoom(-0.25)}
            >
              −
            </button>
            <span>{zoom.toFixed(1)}×</span>
            <button
              type="button"
              className="pod-photo__tool"
              aria-label={`Zoom in photo for ${label}`}
              onClick={() => bumpZoom(0.25)}
            >
              +
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
