import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import "../instagramComposer/photoGrade.css";
import {
  panFromPinch,
  panFromPointerDrag,
  photoPointDistance,
  photoPointMid,
  zoomFromWheelDelta,
  type PhotoPoint,
} from "./photoGestures";
import {
  imageFilesFromDataTransfer,
  imageFilesFromList,
} from "../instagramComposer/composerPhotoDrop";
import {
  COMPOSER_SLOT_ATTR,
  COMPOSER_SLOT_SWAP_THRESHOLD,
  composerSlotFromPoint,
} from "../instagramComposer/composerSlotSwap";
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
  vignette?: boolean;
  pop?: boolean;
  pickLabel?: string;
  changeLabel?: string;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onUploadMany?: (dataUrls: string[]) => void;
  onPick: () => void;
  slotSwapEnabled?: boolean;
}

const PHOTO_CHROME_CLASSES = [
  "pod-photo__tool",
  "pod-photo__file",
  "pod-photo__paste",
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

export const dataUrlFromImageFile = (file: File) =>
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
  vignette = false,
  pop = false,
  pickLabel = "Pick player",
  changeLabel = "Change player",
  onPan,
  onUpload,
  onUploadMany,
  onPick,
  slotSwapEnabled = false,
}: PhotoFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  panRef.current = pan;
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;
  const pointers = useRef(new Map<number, PhotoPoint>());
  const gesture = useRef<Gesture | null>(null);
  const gestureScale = useRef(photoZoom(pan));
  const swapMode = useRef(false);
  const originPan = useRef(pan);
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

  const applyImageFiles = async (files: File[]) => {
    if (!files.length) {
      return;
    }
    if (onUploadMany && files.length > 1) {
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await dataUrlFromImageFile(file));
      }
      onUploadMany(urls);
      return;
    }
    onUpload(await dataUrlFromImageFile(files[0]!));
  };

  const handleFiles = async (files: FileList | null) => {
    await applyImageFiles(imageFilesFromList(files));
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
      className={[
        "pod-photo",
        filled ? "" : "is-empty",
        custom ? "is-custom" : "",
        vignette ? "is-vignette" : "",
        pop ? "is-pop" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={0}
      onKeyDown={(event) => {
        if (!filled) {
          return;
        }
        const step = event.shiftKey ? 0.06 : 0.02;
        const current = panRef.current;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onPanRef.current(clampPan({ ...current, x: current.x - step }));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onPanRef.current(clampPan({ ...current, x: current.x + step }));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onPanRef.current(clampPan({ ...current, y: current.y - step }));
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          onPanRef.current(clampPan({ ...current, y: current.y + step }));
        }
      }}
      onPaste={(event) => {
        event.stopPropagation();
        void dataUrlFromClipboard(event.nativeEvent).then((dataUrl) => {
          if (!dataUrl) {
            return;
          }
          event.preventDefault();
          onUpload(dataUrl);
        });
      }}
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
        swapMode.current = false;
        originPan.current = { ...panRef.current };
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
        const current = gesture.current;
        if (
          slotSwapEnabled &&
          current?.type === "pan" &&
          pointers.current.size < 2
        ) {
          const over = composerSlotFromPoint(event.clientX, event.clientY);
          const homeRaw = rootRef.current
            ?.closest(`[${COMPOSER_SLOT_ATTR}]`)
            ?.getAttribute(COMPOSER_SLOT_ATTR);
          const home = Number.parseInt(homeRaw ?? "", 10);
          const traveled = Math.hypot(
            event.clientX - current.x,
            event.clientY - current.y,
          );
          if (
            over != null &&
            Number.isInteger(home) &&
            over !== home &&
            traveled > COMPOSER_SLOT_SWAP_THRESHOLD
          ) {
            if (!swapMode.current) {
              swapMode.current = true;
              onPanRef.current({ ...originPan.current });
            }
            return;
          }
        }
        if (swapMode.current) {
          return;
        }
        applyMove(event.currentTarget);
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        swapMode.current = false;
        beginGesture();
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        swapMode.current = false;
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
        void imageFilesFromDataTransfer(event.dataTransfer).then((files) =>
          applyImageFiles(files),
        );
      }}
    >
      {src ? (
        <>
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
            {vignette ? (
              <div className="pod-photo__vignette" aria-hidden="true" />
            ) : null}
          </div>
          {pop ? (
            <div className="pod-photo__pop-rim" aria-hidden="true">
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
          ) : null}
        </>
      ) : (
        <button type="button" className="pod-photo__pick" onClick={onPick}>
          {pickLabel}
        </button>
      )}
      <div className="pod-photo__tools">
        <label className="pod-photo__tool">
          Upload photo
          <input
            className="pod-photo__file"
            type="file"
            accept="image/*"
            multiple
            aria-label={`Upload photo for ${label}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.currentTarget.value = "";
              event.currentTarget.blur();
            }}
          />
        </label>
        {onUploadMany ? (
          <label className="pod-photo__tool">
            Folder
            <input
              className="pod-photo__file"
              type="file"
              accept="image/*"
              multiple
              // @ts-expect-error webkitdirectory is the folder-drop affordance
              webkitdirectory=""
              aria-label={`Upload photo folder for ${label}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.currentTarget.value = "";
                event.currentTarget.blur();
              }}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="pod-photo__tool pod-photo__paste"
          aria-label={`Paste photo for ${label}`}
          onPointerDown={stopChromePointer}
          onClick={(event) => {
            event.stopPropagation();
            void readPhotoFromClipboard().then((dataUrl) => {
              if (dataUrl) {
                onUpload(dataUrl);
              }
            });
          }}
        >
          Paste photo
        </button>
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
            {changeLabel}
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
  const files = event.clipboardData?.files;
  if (files?.length) {
    const file = [...files].find((item) => item.type.startsWith("image/"));
    if (file) {
      return dataUrlFromImageFile(file);
    }
  }
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
      return dataUrlFromImageFile(file);
    }
  }
  return null;
};

export const readPhotoFromClipboard = async () => {
  const clipboard = navigator.clipboard as Clipboard & {
    read?: () => Promise<ClipboardItem[]>;
  };
  if (typeof clipboard?.read !== "function") {
    return null;
  }
  try {
    const items = await clipboard.read();
    for (const item of items) {
      const type = item.types.find((token) => token.startsWith("image/"));
      if (!type) {
        continue;
      }
      const blob = await item.getType(type);
      return dataUrlFromImageFile(new File([blob], "paste.png", { type: blob.type || type }));
    }
  } catch {
    return null;
  }
  return null;
};
