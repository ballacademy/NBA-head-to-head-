import { useRef } from "react";
import type { PhotoPan } from "./playerOfTheDayState";
import { clampPan } from "./playerOfTheDayState";

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
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    pan: PhotoPan;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    onUpload(await readFile(file));
  };

  return (
    <div
      className={["pod-photo", empty ? "is-empty" : "", custom ? "is-custom" : ""]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => {
        if (empty || event.button !== 0) {
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
        onPan(
          clampPan({
            x: start.pan.x - dx / Math.max(1, box.width),
            y: start.pan.y - dy / Math.max(1, box.height),
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
          }}
        />
      ) : (
        <button type="button" className="pod-photo__pick" onClick={onPick}>
          Pick player
        </button>
      )}
      <div className="pod-photo__tools">
        <button
          type="button"
          className="pod-photo__tool"
          onClick={() => fileRef.current?.click()}
        >
          Upload photo
        </button>
        {empty ? null : (
          <button type="button" className="pod-photo__tool" onClick={onPick}>
            Change player
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        className="pod-photo__file"
        type="file"
        accept="image/*"
        aria-label={`Upload photo for ${label}`}
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
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
