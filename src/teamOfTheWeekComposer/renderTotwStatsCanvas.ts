import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePathStroke,
  paintPurpleTitleGlow,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  TWS_BA_INSET,
  TWS_BA_SIZE,
  TWS_BRAND_SIZE,
  TWS_HEAD_H,
  TWS_HEAD_SIZE,
  TWS_NAME_SIZE,
  TWS_NOTE_SIZE,
  TWS_PAD_X,
  TWS_PLAYER_W,
  TWS_SECTION_H,
  TWS_SECTION_SIZE,
  TWS_SLOT_SIZE,
  TWS_TITLE_SIZE,
  TWS_TITLE_TRACK,
  TWS_VALUE_SIZE,
  TWS_WEEK_H,
  TWS_WEEK_SIZE,
  twsHeaderH,
  twsRowH,
  twsStatColW,
  twsTableWidth,
} from "./totwStatsLayout";
import {
  TOTW_STATS_FIELDS,
  TOTW_STATS_NOTE,
  totwStatsFieldValue,
  totwStatsHasRows,
  totwStatsSheetName,
  type TotwStatsSheet,
} from "./totwStatsExport";

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

const withShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.82)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
};

export interface TotwStatsRenderLook {
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
}

export const renderTotwStatsCanvas = async (
  sheet: TotwStatsSheet,
  options: TotwStatsRenderLook = {},
  scale = 2,
) => {
  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open stats canvas");
  }

  await document.fonts?.ready.catch(() => undefined);
  await document.fonts
    ?.load(`italic 900 ${TWS_TITLE_SIZE * scale}px ${POSTER_FONT}`)
    .catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);
  const s = scale;
  const look = options.look ?? "white";
  const showBa = options.showBa === true;
  const showBrand = !showBa;
  const showSections = sheet.sections.length > 1;
  const sectionCount = showSections ? sheet.sections.length : 0;
  const rowCount = sheet.sections.reduce(
    (total, section) => total + section.rows.length,
    0,
  );
  const rowH = twsRowH(Math.max(1, rowCount), showBrand, Math.max(1, sectionCount));

  if (options.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const paintBrand = () => {
    withShadow(context, s, () => {
      context.font = `900 ${TWS_BRAND_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      setLetterSpacing(context, 0.18 * TWS_BRAND_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(sheet.brand.toUpperCase(), width / 2, (TWS_PAD_X + 6) * s);
      setLetterSpacing(context, 0);
    });
  };
  if (showBrand) {
    if (options.purpleFlair) {
      paintPurpleTitleGlow(context, s, paintBrand);
    } else {
      paintBrand();
    }
  }

  const titleY = (showBrand ? 58 : 36) * s;
  context.font = `italic 900 ${TWS_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, TWS_TITLE_TRACK * TWS_TITLE_SIZE * s);
  withShadow(context, s, () => {
    context.fillStyle = "#fff";
    context.fillText(sheet.title.toUpperCase(), width / 2, titleY);
  });
  setLetterSpacing(context, 0);

  const weekText = sheet.week.trim().toUpperCase() || "WEEK";
  context.font = `900 ${TWS_WEEK_SIZE * s}px ${POSTER_FONT}`;
  const weekW = Math.max(280 * s, context.measureText(weekText).width + 44 * s);
  const weekH = TWS_WEEK_H * s;
  const weekX = (width - weekW) / 2;
  const weekY = titleY + 28 * s;
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(weekX + weekW * 0.06, weekY);
  context.lineTo(weekX + weekW * 0.94, weekY);
  context.lineTo(weekX + weekW, weekY + weekH);
  context.lineTo(weekX, weekY + weekH);
  context.closePath();
  context.fill();
  if (options.purpleFlair) {
    paintPurplePathStroke(context, s);
  }
  context.fillStyle = "#111";
  context.fillText(weekText, width / 2, weekY + weekH / 2);

  context.font = `700 ${TWS_NOTE_SIZE * s}px ${POSTER_FONT}`;
  context.fillStyle = "#d4d4d8";
  setLetterSpacing(context, 0.14 * TWS_NOTE_SIZE * s);
  context.fillText(TOTW_STATS_NOTE.toUpperCase(), width / 2, weekY + weekH + 16 * s);
  setLetterSpacing(context, 0);

  if (!totwStatsHasRows(sheet)) {
    context.font = `800 ${18 * s}px ${POSTER_FONT}`;
    context.fillStyle = "#a1a1aa";
    context.fillText("FILL THE LINEUP TO EXPORT THESE WEEK STATS.", width / 2, height / 2);
    return canvas;
  }

  let y = twsHeaderH(showBrand) * s;
  const tableX = TWS_PAD_X * s;
  const tableW = twsTableWidth * s;
  const playerW = TWS_PLAYER_W * s;
  const statW = twsStatColW * s;
  const colX = (index: number) => tableX + playerW + index * statW;

  for (const section of sheet.sections) {
    if (showSections) {
      context.font = `italic 900 ${TWS_SECTION_SIZE * s}px ${POSTER_FONT}`;
      context.fillStyle = "#fff";
      context.textAlign = "center";
      context.fillText(section.caption.toUpperCase(), width / 2, y + TWS_SECTION_H * 0.55 * s);
      y += TWS_SECTION_H * s;
    }
    const tableH = (TWS_HEAD_H + rowH * section.rows.length) * s;
    context.fillStyle = "rgba(8, 8, 8, 0.42)";
    context.fillRect(tableX, y, tableW, tableH);
    paintCellFrame(context, tableX, y, tableW, tableH, look, s);

    const headY = y;
    context.fillStyle = "#a1a1aa";
    context.font = `900 ${TWS_HEAD_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("PLAYER", tableX + 10 * s, headY + (TWS_HEAD_H * s) / 2);
    context.textAlign = "center";
    TOTW_STATS_FIELDS.forEach((field, index) => {
      context.fillText(
        field.label,
        colX(index) + statW / 2,
        headY + (TWS_HEAD_H * s) / 2,
      );
    });
    context.strokeStyle = "rgba(255, 255, 255, 0.22)";
    context.lineWidth = Math.max(1, s * 0.7);
    context.beginPath();
    context.moveTo(tableX, headY + TWS_HEAD_H * s);
    context.lineTo(tableX + tableW, headY + TWS_HEAD_H * s);
    context.stroke();

    section.rows.forEach((row, index) => {
      const rowY = headY + (TWS_HEAD_H + rowH * index) * s;
      const rowHeight = rowH * s;
      if (index % 2 === 1) {
        context.fillStyle = "rgba(255, 255, 255, 0.045)";
        context.fillRect(tableX, rowY, tableW, rowHeight);
      }
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillStyle = "#facc15";
      context.font = `900 ${TWS_SLOT_SIZE * s}px ${POSTER_FONT}`;
      context.fillText(row.slot, tableX + 10 * s, rowY + rowHeight / 2);
      context.fillStyle = "#fff";
      const nameX = tableX + 48 * s;
      const label = totwStatsSheetName(row).toUpperCase();
      let nameSize = TWS_NAME_SIZE * s;
      context.font = `900 ${nameSize}px ${POSTER_FONT}`;
      const maxNameW = playerW - 58 * s;
      while (nameSize > 10 * s && context.measureText(label).width > maxNameW) {
        nameSize -= s;
        context.font = `900 ${nameSize}px ${POSTER_FONT}`;
      }
      context.fillText(label, nameX, rowY + rowHeight / 2);
      context.fillStyle = "#fff";
      context.font = `900 ${TWS_VALUE_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      TOTW_STATS_FIELDS.forEach((field, fieldIndex) => {
        context.fillText(
          totwStatsFieldValue(row, field.key),
          colX(fieldIndex) + statW / 2,
          rowY + rowHeight / 2,
        );
      });
    });

    y += tableH + 12 * s;
  }

  if (showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = TWS_BA_SIZE * s;
      const inset = TWS_BA_INSET * s;
      if (options.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
