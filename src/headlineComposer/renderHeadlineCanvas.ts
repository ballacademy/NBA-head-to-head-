import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  applyPhotoGrade,
  canvasGradeFilter,
} from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  HL_BODY_LINE,
  HL_BODY_SIZE,
  HL_BODY_TRACK,
  HL_FAMILY_TRACK,
  HL_HEADLINE_TRACK,
  HL_NAME_TRACK,
  HL_SOURCE_SIZE,
  headlinePanelHex,
  headlineSplitLayout,
  parseHeadlineBoardMode,
  parseHeadlineNameScope,
  parseHeadlineNameStack,
  parseHeadlinePanelLeft,
  type HeadlineBoardMode,
  type HeadlineNameScope,
  type HeadlineNameStack,
} from "./headlineLayout";
import {
  composerNameLines,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import {
  headlineLabel,
  splitTeamWordmark,
  teamShortLockup,
  type HeadlineDraft,
} from "./headlineState";

export { canvasToPngBlob };

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const setLetterSpacing = (
  context: CanvasRenderingContext2D,
  tracking: number,
) => {
  const spaced = context as CanvasRenderingContext2D & { letterSpacing: string };
  if (typeof spaced.letterSpacing === "string") {
    spaced.letterSpacing = `${tracking}px`;
    return true;
  }
  return false;
};

const chevronPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rise: number,
  mirror = false,
) => {
  context.beginPath();
  if (mirror) {
    context.moveTo(x, y);
    context.lineTo(x + w - rise, y);
    context.lineTo(x + w, y + h / 2);
    context.lineTo(x + w - rise, y + h);
    context.lineTo(x, y + h);
  } else {
    context.moveTo(x, y + h / 2);
    context.lineTo(x + rise, y);
    context.lineTo(x + w, y);
    context.lineTo(x + w, y + h);
    context.lineTo(x + rise, y + h);
  }
  context.closePath();
};

const noiseTile = (() => {
  let canvas: HTMLCanvasElement | null = null;
  return () => {
    if (canvas) {
      return canvas;
    }
    canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return canvas;
    }
    const image = ctx.createImageData(64, 64);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 110 + ((i * 13) % 70);
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 40;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  };
})();

const paintPanelTexture = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) => {
  context.fillStyle = fill;
  context.fillRect(x, y, w, h);
  const wash = context.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, "rgba(255,255,255,0.14)");
  wash.addColorStop(0.42, "rgba(255,255,255,0.02)");
  wash.addColorStop(1, "rgba(0,0,0,0.22)");
  context.fillStyle = wash;
  context.fillRect(x, y, w, h);
  const tile = noiseTile();
  context.save();
  context.globalAlpha = 0.22;
  context.globalCompositeOperation = "overlay";
  const pattern = context.createPattern(tile, "repeat");
  if (pattern) {
    context.fillStyle = pattern;
    context.fillRect(x, y, w, h);
  }
  context.restore();
};

export interface HeadlineRenderInput {
  headline: string;
  body: string;
  teamId: string | null;
  secondTeamId?: string | null;
  firstName?: string;
  lastName?: string;
  nameScope?: HeadlineNameScope;
  photoSrc: string | null;
  pan: HeadlineDraft["pan"];
  boardMode?: HeadlineBoardMode;
  panelLeft?: boolean;
  nameStack?: HeadlineNameStack;
  storyLine?: string;
  metaLine?: string;
  sourceCredit?: string;
  photoBw?: boolean;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  story?: boolean;
}

export const renderHeadlineCanvas = async (
  input: HeadlineRenderInput,
  scale = 2,
) => {
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const width = GRAPHIC_WIDTH * scale;
  const height = boardH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open canvas");
  }

  const headline = headlineLabel(input.headline);
  const team = getTeam(input.teamId);
  const teamB = getTeam(input.secondTeamId ?? null);
  const marks = splitTeamWordmark(team);
  const stacked =
    parseHeadlineNameScope(input.nameScope) === "player"
      ? composerNameLines(
          input.firstName ?? "",
          input.lastName ?? "",
          readComposerNameStyle(),
        )
      : { given: input.firstName ?? "", family: input.lastName ?? "" };
  const layout = headlineSplitLayout({
    headline,
    body: input.body,
    firstName: stacked.given,
    lastName: stacked.family,
    city: marks.city,
    nick: marks.nick,
    shortName: teamShortLockup(team),
    boardH,
    showBa: input.showBa !== false,
    panelLeft: parseHeadlinePanelLeft(input.panelLeft),
    boardMode: parseHeadlineBoardMode(input.boardMode),
    nameStack: parseHeadlineNameStack(input.nameStack),
    storyLine: input.storyLine ?? "",
    metaLine: input.metaLine ?? "",
    sourceCredit: input.sourceCredit ?? "",
  });

  await document.fonts?.ready.catch(() => undefined);
  await Promise.all([
    document.fonts?.load(
      `italic 900 ${layout.kicker.size * scale}px ${POSTER_FONT}`,
    ),
    document.fonts?.load(`900 ${HL_BODY_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(
      `900 ${Math.max(layout.family.size, 1) * scale}px ${POSTER_FONT}`,
    ),
  ]).catch(() => undefined);

  const s = scale;
  context.fillStyle = "#0b0b0b";
  context.fillRect(0, 0, width, height);

  const photoX = layout.photo.x * s;
  const photoY = layout.photo.y * s;
  const photoW = layout.photo.w * s;
  const photoH = layout.photo.h * s;
  if (input.photoSrc && photoW > 0) {
    const photo = input.photoSrc.startsWith("data:")
      ? await loadImage(input.photoSrc)
      : await loadCorsImage(input.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        photoX,
        photoY,
        photoW,
        photoH,
        input.pan.x,
        input.pan.y,
        photoZoom(input.pan),
      );
      const rotate = photoRotate(input.pan);
      context.save();
      context.beginPath();
      context.rect(photoX, photoY, photoW, photoH);
      context.clip();
      const grade = canvasGradeFilter(input.photoGrade);
      context.filter = input.photoBw
        ? `grayscale(1) ${grade === "none" ? "" : grade}`.trim()
        : grade;
      if (rotate) {
        context.translate(photoX + photoW / 2, photoY + photoH / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - (photoX + photoW / 2),
          dest.dy - (photoY + photoH / 2),
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(context, photoX, photoY, photoW, photoH, input.photoGrade);
      paintPhotoVignette(
        context,
        photoX,
        photoY,
        photoW,
        photoH,
        input.photoGrade,
      );
    }
  }

  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const panelFill = headlinePanelHex(input.teamId);
  paintPanelTexture(
    context,
    layout.panel.x * s,
    0,
    (layout.boardMode === "team-only" ? layout.boardW : layout.panel.w) * s,
    height,
    panelFill,
  );
  if (layout.panelB.w > 0) {
    paintPanelTexture(
      context,
      layout.panelB.x * s,
      0,
      layout.panelB.w * s,
      height,
      headlinePanelHex(input.secondTeamId ?? null),
    );
  }
  if (layout.boardMode !== "team-only") {
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = 28 * s;
    context.shadowOffsetX = layout.panelLeft ? 14 * s : -14 * s;
    context.fillStyle = panelFill;
    context.fillRect(layout.panel.x * s, 0, 2 * s, height);
    context.restore();
  }

  const paintLogo = async (
    src: string,
    box: { x: number; y: number; size: number },
    clipX: number,
    clipW: number,
    key: string,
  ) => {
    if (box.size <= 0 || clipW <= 0) {
      return;
    }
    const logo = await loadImage(src);
    if (!logo) {
      return;
    }
    context.save();
    context.beginPath();
    context.rect(clipX * s, 0, clipW * s, height);
    context.clip();
    drawCenteredLogo(
      context,
      logo,
      box.x * s,
      box.y * s,
      box.size * s,
      box.size * s,
      {
        cacheKey: `${src}-${key}`,
        fitX: 0.94,
        fitY: 0.9,
        shadow: 22 * s,
      },
    );
    context.restore();
  };
  if (team) {
    await paintLogo(
      team.logoSrc,
      layout.logo,
      layout.boardMode === "team-only" ? 0 : layout.panel.x,
      layout.boardMode === "team-only" ? layout.boardW : layout.panel.w,
      "headline-hero",
    );
  }
  if (teamB && layout.logoB.size > 0) {
    await paintLogo(
      teamB.logoSrc,
      layout.logoB,
      layout.panelB.x,
      layout.panelB.w,
      "headline-hero-b",
    );
  }

  const chevX = layout.chevron.x * s;
  const chevY = layout.chevron.y * s;
  const chevW = layout.chevron.w * s;
  const chevH = layout.chevron.h * s;
  const rise = layout.chevron.rise * s;
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 10 * s;
  context.shadowOffsetY = 5 * s;
  chevronPath(context, chevX, chevY, chevW, chevH, rise, layout.chevron.mirror);
  const silver = context.createLinearGradient(0, chevY, 0, chevY + chevH);
  silver.addColorStop(0, "#6d757c");
  silver.addColorStop(0.16, "#c2c9d0");
  silver.addColorStop(0.4, "#eef2f5");
  silver.addColorStop(0.52, "#f8fafc");
  silver.addColorStop(0.8, "#c5ccd3");
  silver.addColorStop(1, "#7a828a");
  context.fillStyle = silver;
  context.fill();
  context.restore();

  context.font = `italic 900 ${layout.kicker.size * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, HL_HEADLINE_TRACK * layout.kicker.size * s);
  context.fillStyle = "#111111";
  const kickerCx = (layout.kicker.x + layout.kicker.w / 2) * s;
  const kickerLine = layout.kicker.size * s;
  const kickerBlock = layout.kicker.lines.length * kickerLine;
  let kickerTy = chevY + chevH / 2 - kickerBlock / 2 + kickerLine / 2;
  layout.kicker.lines.forEach((line) => {
    if (line) {
      context.fillText(line, kickerCx, kickerTy, layout.kicker.w * s);
    }
    kickerTy += kickerLine;
  });
  setLetterSpacing(context, 0);

  const paintStack = (
    lines: string[],
    size: number,
    tracking: number,
    x: number,
    y: number,
    lineHeight: number,
  ) => {
    if (!lines.length || size <= 0) {
      return;
    }
    context.font = `900 ${size * s}px ${POSTER_FONT}`;
    context.textAlign = "left";
    context.textBaseline = "top";
    setLetterSpacing(context, tracking * size * s);
    context.shadowColor = "rgba(0, 0, 0, 0.4)";
    context.shadowBlur = 8 * s;
    context.shadowOffsetY = 2 * s;
    context.fillStyle = "#ffffff";
    lines.forEach((line, index) => {
      if (line) {
        context.fillText(
          line,
          x * s,
          (y + index * size * lineHeight) * s,
          layout.given.w * s,
        );
      }
    });
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    setLetterSpacing(context, 0);
  };

  if (layout.story.text) {
    paintStack(
      [layout.story.text],
      layout.story.size,
      HL_BODY_TRACK,
      layout.story.x,
      layout.story.y,
      1.1,
    );
  }
  paintStack(
    layout.given.lines,
    layout.given.size,
    HL_NAME_TRACK,
    layout.given.x,
    layout.given.y,
    1.08,
  );
  paintStack(
    layout.family.lines,
    layout.family.size,
    HL_FAMILY_TRACK,
    layout.family.x,
    layout.family.y,
    0.98,
  );

  if (layout.meta.text) {
    paintStack(
      [layout.meta.text],
      layout.meta.size,
      HL_BODY_TRACK,
      layout.meta.x,
      layout.meta.y,
      1.1,
    );
  }

  context.font = `900 ${HL_BODY_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  setLetterSpacing(context, HL_BODY_TRACK * HL_BODY_SIZE * s);
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0, 0, 0, 0.4)";
  context.shadowBlur = 8 * s;
  context.shadowOffsetY = 2 * s;
  layout.body.lines.forEach((line, index) => {
    const y = layout.body.y * s + index * HL_BODY_SIZE * HL_BODY_LINE * s;
    context.fillText(line, layout.body.x * s, y, layout.body.w * s);
  });
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  setLetterSpacing(context, 0);

  if (layout.source.text) {
    context.font = `900 ${HL_SOURCE_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "left";
    context.textBaseline = "top";
    setLetterSpacing(context, 0.14 * HL_SOURCE_SIZE * s);
    context.globalAlpha = 0.55;
    context.fillStyle = "#ffffff";
    context.fillText(
      layout.source.text,
      layout.source.x * s,
      layout.source.y * s,
      layout.source.w * s,
    );
    context.globalAlpha = 1;
    setLetterSpacing(context, 0);
  }

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = layout.ba.w * s;
      const insetX = layout.ba.x * s;
      const insetY = layout.ba.y * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, insetX, insetY, size);
      }
      context.drawImage(ba, insetX, insetY, size, size);
    }
  }

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  return canvas;
};
