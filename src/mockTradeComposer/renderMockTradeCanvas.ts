import { headlinePanelHex } from "../headlineComposer/headlineLayout";
import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerNameStyle } from "../instagramComposer/composerNameStyle";
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
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { salaryLabelForPlayer } from "../lib/playerSalaries";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_WIDTH,
  MT_TITLE_SIZE,
  mockTradeBoardHeight,
  mockTradeLayout,
} from "./mockTradeLayout";
import {
  compactMockTradeDraft,
  mockTradePickLabel,
  mockTradePlayerLockup,
  mockTradeTeamCount,
  type MockTradeDraft,
} from "./mockTradeState";

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
  }
};

const roundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
};

export type MockTradeRenderInput = MockTradeDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
};

export const renderMockTradeCanvas = async (
  input: MockTradeRenderInput,
  scale = 2,
) => {
  const width = GRAPHIC_WIDTH * scale;
  const height = mockTradeBoardHeight(input.story) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open canvas");
  }
  await document.fonts?.ready.catch(() => undefined);
  const s = scale;
  const field = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, field, width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const board = compactMockTradeDraft(input);
  const teamCount = mockTradeTeamCount(board);
  const layout = mockTradeLayout(
    teamCount,
    board.sides.map((side) => side.players.length),
    board.sides.map((side) => side.picks.length),
    Boolean(input.story),
  );

  for (const [sideIndex, column] of layout.columns.entries()) {
    const side = board.sides[sideIndex]!;
    const x = column.x * s;
    const y = column.y * s;
    const w = column.w * s;
    const h = column.h * s;
    context.fillStyle = headlinePanelHex(side.teamId);
    context.fillRect(x, y, w, h);
    const wash = context.createLinearGradient(x, y, x, y + h);
    wash.addColorStop(0, "rgba(255,255,255,0.08)");
    wash.addColorStop(0.42, "rgba(0,0,0,0.16)");
    wash.addColorStop(1, "rgba(0,0,0,0.38)");
    context.fillStyle = wash;
    context.fillRect(x, y, w, h);

    const team = getTeam(side.teamId);
    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        drawCenteredLogo(
          context,
          logo,
          column.logo.x * s,
          column.logo.y * s,
          column.logo.w * s,
          column.logo.h * s,
          {
            cacheKey: `${team.logoSrc}-mock-trade`,
            fitX: 0.9,
            fitY: 0.88,
            shadow: 18,
          },
        );
      }
    } else {
      context.font = `900 ${28 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(255,255,255,0.28)";
      setLetterSpacing(context, 0.18 * 28 * s);
      context.fillText(
        `TEAM ${sideIndex + 1}`,
        (column.logo.x + column.logo.w / 2) * s,
        (column.logo.y + column.logo.h / 2) * s,
      );
      setLetterSpacing(context, 0);
    }

    context.font = `800 ${13 * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255,255,255,0.72)";
    setLetterSpacing(context, 0.28 * 13 * s);
    context.fillText(
      "GETS",
      (column.gets.x + column.gets.w / 2) * s,
      (column.gets.y + column.gets.h / 2) * s,
    );
    setLetterSpacing(context, 0);

    for (const [playerIndex, slot] of column.players.entries()) {
      const person = side.players[playerIndex]!;
      const px = slot.photo.x * s;
      const py = slot.photo.y * s;
      const pw = slot.photo.w * s;
      const ph = slot.photo.h * s;
      context.save();
      roundRect(context, px, py, pw, ph, 10 * s);
      context.clip();
      context.fillStyle = "#111";
      context.fillRect(px, py, pw, ph);
      if (person.photoSrc) {
        const photo = person.photoSrc.startsWith("data:")
          ? await loadImage(person.photoSrc)
          : await loadCorsImage(person.photoSrc);
        if (photo) {
          const dest = coverPanDraw(
            photo.naturalWidth || photo.width,
            photo.naturalHeight || photo.height,
            px,
            py,
            pw,
            ph,
            person.pan.x,
            person.pan.y,
            photoZoom(person.pan),
          );
          context.filter = canvasGradeFilter(input.photoGrade);
          const rotate = photoRotate(person.pan);
          if (rotate) {
            context.translate(px + pw / 2, py + ph / 2);
            context.rotate((rotate * Math.PI) / 180);
            context.drawImage(
              photo,
              dest.dx - px - pw / 2,
              dest.dy - py - ph / 2,
              dest.dw,
              dest.dh,
            );
          } else {
            context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
          }
          context.filter = "none";
          applyPhotoGrade(context, px, py, pw, ph, input.photoGrade);
          paintPhotoVignette(context, px, py, pw, ph, input.photoGrade);
        }
      }
      context.restore();
      paintCellFrame(context, px, py, pw, ph, input.look, s);
      const name = mockTradePlayerLockup(
        person,
        readComposerNameStyle(),
      ).toUpperCase();
      if (name) {
        context.font = `900 ${16 * s}px ${POSTER_FONT}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#fff";
        setLetterSpacing(context, 0.06 * 16 * s);
        context.fillText(
          name,
          (slot.name.x + slot.name.w / 2) * s,
          (slot.name.y + slot.name.h / 2) * s,
          slot.name.w * s,
        );
        setLetterSpacing(context, 0);
      }
      if (input.showSalaries && person.playerId) {
        const cap = salaryLabelForPlayer(undefined, person.playerId);
        if (cap) {
          context.font = `900 ${12 * s}px ${POSTER_FONT}`;
          context.fillStyle = "rgba(250, 204, 21, 0.92)";
          context.textAlign = "center";
          context.textBaseline = "top";
          context.fillText(
            cap,
            (slot.name.x + slot.name.w / 2) * s,
            (slot.name.y + slot.name.h) * s,
            slot.name.w * s,
          );
        }
      }
    }

    for (const [pickIndex, chip] of column.picks.entries()) {
      const pick = side.picks[pickIndex]!;
      const cx = chip.x * s;
      const cy = chip.y * s;
      const cw = chip.w * s;
      const ch = chip.h * s;
      context.fillStyle = "rgba(6,8,12,0.72)";
      roundRect(context, cx, cy, cw, ch, 8 * s);
      context.fill();
      context.strokeStyle =
        pick.cash || pick.twoWay || pick.top4 || pick.swap
          ? "#ffe566"
          : "rgba(255,255,255,0.22)";
      context.lineWidth = 1.5 * s;
      roundRect(context, cx, cy, cw, ch, 8 * s);
      context.stroke();
      context.font = `800 ${13 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle =
        pick.cash || pick.twoWay || pick.top4 || pick.swap ? "#ffe566" : "#fff";
      setLetterSpacing(context, 0.06 * 13 * s);
      context.fillText(
        mockTradePickLabel(pick),
        cx + cw / 2,
        cy + ch / 2,
        cw - 12 * s,
      );
      setLetterSpacing(context, 0);
    }
  }

  const titleX = layout.title.x * s;
  const titleY = layout.title.y * s;
  const titleW = layout.title.w * s;
  const titleH = layout.title.h * s;
  context.fillStyle = "#1c1c1c";
  context.fillRect(titleX, titleY, titleW, titleH);
  paintCellFrame(context, titleX, titleY, titleW, titleH, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, titleX, titleY, titleW, titleH, s);
  }
  context.font = `900 ${MT_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.08 * MT_TITLE_SIZE * s);
  context.fillStyle = "#fff";
  context.fillText(
    input.title.trim().toUpperCase() || "MOCK TRADE",
    titleX + titleW / 2,
    titleY + titleH / 2,
    titleW - 96 * s,
  );
  setLetterSpacing(context, 0);

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = layout.ba.w * s;
      const bx = layout.ba.x * s;
      const by = layout.ba.y * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, bx, by, size);
      }
      context.drawImage(ba, bx, by, size, size);
    }
  }

  return canvas;
};
