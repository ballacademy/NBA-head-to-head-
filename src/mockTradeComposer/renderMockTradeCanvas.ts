import { headlinePanelHex } from "../headlineComposer/headlineLayout";
import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
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
import { paintLetterGradePlate } from "../instagramComposer/paintLetterGrade";
import {
  DEFAULT_LETTER_GRADE,
  parseLetterGrade,
} from "../lib/letterGrade";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_WIDTH,
  MT_NAME_FADE_H,
  MT_RECEIVE_SIZE,
  MT_RECEIVE_SIZE_3,
  MT_TITLE_SIZE,
  mockTradeBoardHeight,
  mockTradeLayout,
} from "./mockTradeLayout";
import {
  compactMockTradeDraft,
  mockTradePickLabel,
  mockTradeReceiveLabel,
  mockTradeSalaryTotalsLabel,
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
        context.save();
        context.globalAlpha = 0.22;
        drawCenteredLogo(
          context,
          logo,
          column.logo.x * s,
          column.logo.y * s,
          column.logo.w * s,
          column.logo.h * s,
          {
            cacheKey: `${team.logoSrc}-mock-trade`,
            fitX: 0.82,
            fitY: 0.82,
            shadow: 18,
          },
        );
        context.restore();
      }
    } else {
      context.font = `900 ${28 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(255,255,255,0.22)";
      setLetterSpacing(context, 0.18 * 28 * s);
      context.fillText(
        `TEAM ${sideIndex + 1}`,
        (column.logo.x + column.logo.w / 2) * s,
        (column.logo.y + column.logo.h / 2) * s,
      );
      setLetterSpacing(context, 0);
    }

    const hero = side.players.length <= 2;
    const fadeTeam = getTeam(side.teamId);
    const fadeLogo = fadeTeam ? await loadImage(fadeTeam.logoSrc) : null;

    for (const [playerIndex, slot] of column.players.entries()) {
      const person = side.players[playerIndex]!;
      const px = slot.photo.x * s;
      const py = slot.photo.y * s;
      const pw = slot.photo.w * s;
      const ph = slot.photo.h * s;
      context.save();
      context.beginPath();
      context.rect(px, py, pw, ph);
      context.clip();
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
      if (person.photoSrc || person.lastName || person.firstName) {
        const fadeH = Math.min(slot.name.h, hero ? MT_NAME_FADE_H : 84) * s;
        drawPlayerNameFade(context, {
          x: px,
          y: py + ph - fadeH,
          w: pw,
          h: fadeH,
          given: person.firstName,
          family: person.lastName,
          logo: fadeLogo,
          logoSrc: fadeTeam?.logoSrc,
          logoSize: (hero ? 28 : 22) * s,
          familySize: (hero ? 32 : 18) * s,
          givenSize: (hero ? 16 : 11) * s,
          scale: s,
          nameStyle: readComposerNameStyle(),
          stat:
            input.showSalaries && person.playerId
              ? salaryLabelForPlayer(undefined, person.playerId)
              : "",
        });
      }
    }

    for (const [pickIndex, chip] of column.picks.entries()) {
      const pick = side.picks[pickIndex]!;
      const cx = chip.x * s;
      const cy = chip.y * s;
      const cw = chip.w * s;
      const ch = chip.h * s;
      context.fillStyle = "#1c1c1c";
      roundRect(context, cx, cy, cw, ch, 6 * s);
      context.fill();
      context.strokeStyle =
        pick.cash || pick.twoWay || pick.top4 || pick.swap
          ? "#ffe566"
          : "rgba(255,255,255,0.28)";
      context.lineWidth = 2 * s;
      roundRect(context, cx, cy, cw, ch, 6 * s);
      context.stroke();
      context.font = `900 ${18 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle =
        pick.cash || pick.twoWay || pick.top4 || pick.swap ? "#ffe566" : "#fff";
      setLetterSpacing(context, 0.02 * 18 * s);
      context.fillText(
        mockTradePickLabel(pick),
        cx + cw / 2,
        cy + ch / 2,
        cw - 12 * s,
      );
      setLetterSpacing(context, 0);
    }

    const receiveLabel = mockTradeReceiveLabel(side);
    if (receiveLabel) {
      const rx = column.receive.x * s;
      const ry = column.receive.y * s;
      const rw = column.receive.w * s;
      const rh = column.receive.h * s;
      const fade = context.createLinearGradient(rx, ry, rx, ry + rh);
      fade.addColorStop(0, "rgba(0,0,0,0.92)");
      fade.addColorStop(0.38, "rgba(0,0,0,0.62)");
      fade.addColorStop(0.76, "rgba(0,0,0,0.2)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = fade;
      context.fillRect(rx, ry, rw, rh);
      const size =
        (teamCount === 3 ? MT_RECEIVE_SIZE_3 : MT_RECEIVE_SIZE) * s;
      context.font = `900 ${size}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillStyle = "#fff";
      context.shadowColor = "rgba(0,0,0,0.72)";
      context.shadowOffsetX = s;
      context.shadowOffsetY = s;
      context.shadowBlur = 0;
      setLetterSpacing(context, (teamCount === 3 ? 0.06 : 0.08) * size);
      context.fillText(receiveLabel, rx + rw / 2, ry + 12 * s, rw - 20 * s);
      setLetterSpacing(context, 0);
      context.shadowColor = "transparent";
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
    }

    if (input.showSalaries) {
      context.font = `800 ${14 * s}px ${POSTER_FONT}`;
      context.fillStyle = "rgba(250, 204, 21, 0.92)";
      context.textAlign = "center";
      context.textBaseline = "top";
      setLetterSpacing(context, 0.1 * 14 * s);
      context.fillText(
        mockTradeSalaryTotalsLabel(board, sideIndex),
        (column.x + column.w / 2) * s,
        (column.y + (receiveLabel ? 46 : 10)) * s,
        (column.w - 20) * s,
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

  if (input.showLetterGrade) {
    paintLetterGradePlate(
      context,
      { x: 22, y: 22, w: 118, h: input.letterGradeReason ? 100 : 88 },
      parseLetterGrade(input.letterGrade ?? DEFAULT_LETTER_GRADE),
      input.letterGradeReason ?? "",
      s,
    );
  }

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
