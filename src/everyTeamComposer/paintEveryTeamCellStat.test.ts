import { describe, expect, it } from "vitest";
import { paintEveryTeamCellStat } from "./renderEveryTeamCanvas";

const mockContext = () => {
  const fills: Array<{ text: string; fill: unknown; x: number; y: number }> = [];
  const rects: unknown[] = [];
  const context = {
    textAlign: "start",
    textBaseline: "alphabetic",
    fillStyle: "" as unknown,
    shadowColor: "",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    font: "",
    letterSpacing: "0px",
    measureText: (value: string) => ({ width: value.length * 10 }),
    fillText: function fillText(this: { fillStyle: unknown }, text: string, x: number, y: number) {
      fills.push({ text, fill: this.fillStyle, x, y });
    },
    createLinearGradient: () => {
      const gradient = { kind: "fade" };
      return {
        addColorStop: () => undefined,
        toString: () => "[object CanvasGradient]",
        ...gradient,
      };
    },
    fillRect: (...args: unknown[]) => {
      rects.push(args);
    },
    save: () => undefined,
    restore: () => undefined,
  };
  return { context: context as unknown as CanvasRenderingContext2D, fills, rects };
};

describe("paintEveryTeamCellStat", () => {
  it("paints gold after the name fade so export stays readable with names off", () => {
    const { context, fills, rects } = mockContext();
    paintEveryTeamCellStat(context, "13.9 REB", 0, 0, 200, 2, true);
    expect(rects.length).toBe(1);
    expect(fills).toEqual([
      expect.objectContaining({
        text: "13.9 REB",
        fill: "#facc15",
      }),
    ]);
  });

  it("skips the fade when names already painted one", () => {
    const { context, fills, rects } = mockContext();
    paintEveryTeamCellStat(context, "27.1 PTS", 0, 0, 200, 2, false);
    expect(rects.length).toBe(0);
    expect(fills[0]?.fill).toBe("#facc15");
    expect(String(context.font)).toContain("38px");
  });
});
