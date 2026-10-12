import {
  clampPan,
  photoRotate,
  photoZoom,
  type PhotoPan,
} from "./playerOfTheDayState";

export interface PhotoPoint {
  x: number;
  y: number;
}

export const photoPointDistance = (a: PhotoPoint, b: PhotoPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const photoPointMid = (a: PhotoPoint, b: PhotoPoint): PhotoPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const zoomFromPinch = (
  startZoom: number,
  startDistance: number,
  currentDistance: number,
) => {
  if (!(startDistance > 0) || !(currentDistance > 0)) {
    return startZoom;
  }
  return startZoom * (currentDistance / startDistance);
};

export const zoomFromWheelDelta = (zoom: number, deltaY: number) => {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return zoom;
  }
  return zoom * Math.exp(-deltaY * 0.0025);
};

export const panFromPointerDrag = (
  start: PhotoPan,
  dx: number,
  dy: number,
  width: number,
  height: number,
): PhotoPan => {
  const span = Math.max(1, photoZoom(start));
  return clampPan({
    x: start.x - dx / Math.max(1, width * span),
    y: start.y - dy / Math.max(1, height * span),
    zoom: photoZoom(start),
    rotate: photoRotate(start),
  });
};

export const panFromPinch = (
  start: PhotoPan,
  startDistance: number,
  currentDistance: number,
  startMid: PhotoPoint,
  currentMid: PhotoPoint,
  width: number,
  height: number,
): PhotoPan => {
  const nextZoom = zoomFromPinch(photoZoom(start), startDistance, currentDistance);
  const span = Math.max(1, photoZoom(start));
  return clampPan({
    x: start.x - (currentMid.x - startMid.x) / Math.max(1, width * span),
    y: start.y - (currentMid.y - startMid.y) / Math.max(1, height * span),
    zoom: nextZoom,
    rotate: photoRotate(start),
  });
};
