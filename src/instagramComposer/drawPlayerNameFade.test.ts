import { describe, expect, it } from "vitest";
import { drawNameStack } from "./drawPlayerNameFade";

const mockContext = () => {
  const fills: Array<{ text: string; x: number }> = [];
  const context = {
    textAlign: "start",
    textBaseline: "alphabetic",
    fillStyle: "",
    shadowColor: "",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    font: "",
    measureText: (value: string) => ({ width: value.length * 10 }),
    fillText: (text: string, x: number) => {
      fills.push({ text, x });
    },
  };
  return { context: context as unknown as CanvasRenderingContext2D, fills };
};

describe("drawNameStack", () => {
  it("keeps fade names left-aligned by default", () => {
    const { context, fills } = mockContext();
    drawNameStack(context, "Shai", "Gilgeous-Alexander", 24, 200, 80, 14, 11, 1);
    expect(context.textAlign).toBe("left");
    expect(fills.length).toBeGreaterThan(1);
    expect(fills.every((item) => item.x === 24)).toBe(true);
  });

  it("left-draws each wrapped line from the midpoint so export stays centered", () => {
    const { context, fills } = mockContext();
    drawNameStack(
      context,
      "Shai",
      "Gilgeous-Alexander",
      100,
      200,
      80,
      14,
      11,
      1,
      "center",
    );
    expect(context.textAlign).toBe("left");
    expect(fills.some((item) => item.text.includes("GILGEOUS"))).toBe(true);
    expect(fills.some((item) => item.text.includes("ALEXANDER"))).toBe(true);
    expect(fills.at(-1)?.text).toBe("SHAI");
    fills.forEach((item) => {
      const width = item.text.length * 10;
      expect(item.x).toBe(100 - width / 2);
    });
  });
});
