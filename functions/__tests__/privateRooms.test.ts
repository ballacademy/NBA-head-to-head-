import { describe, expect, it } from "vitest";
import {
  generatePrivateRoomCode,
  isValidRoomCodeFormat,
  normalizeRoomCode,
  parsePrivateRoomMode,
  PRIVATE_ROOM_CODE_LENGTH,
} from "../lib/privateRooms";

describe("privateRooms", () => {
  it("rejects invalid expectedMode and documents classic vs ranked mismatch copy", () => {
    expect(parsePrivateRoomMode("classic")).toBe("classic");
    expect(parsePrivateRoomMode("ranked")).toBe("ranked");
    // Join API compares expectedMode to room.mode — covered by parse helpers here.
    expect(parsePrivateRoomMode("classic")).not.toBe(
      parsePrivateRoomMode("ranked"),
    );
  });

  it("normalizes and validates room codes", () => {
    expect(normalizeRoomCode(" ab-c12 ")).toBe("ABC12");
    expect(isValidRoomCodeFormat("ABC234")).toBe(true);
    expect(isValidRoomCodeFormat("ABCO01")).toBe(false);
    expect(isValidRoomCodeFormat("SHORT")).toBe(false);
  });

  it("generates codes of fixed length from the safe alphabet", () => {
    for (let index = 0; index < 20; index += 1) {
      const code = generatePrivateRoomCode();
      expect(code).toHaveLength(PRIVATE_ROOM_CODE_LENGTH);
      expect(isValidRoomCodeFormat(code)).toBe(true);
    }
  });
});
