import { describe, expect, it } from "vitest";
import {
  formatPrivateJoinError,
  PRIVATE_ROOM_NOT_FOUND_MESSAGE,
} from "./privateMatchmaking";

describe("formatPrivateJoinError", () => {
  it("maps missing-room API copy to a clear popup message", () => {
    expect(formatPrivateJoinError("Room not found")).toBe(
      PRIVATE_ROOM_NOT_FOUND_MESSAGE,
    );
    expect(
      formatPrivateJoinError("That room doesn't exist or the code is invalid."),
    ).toBe(PRIVATE_ROOM_NOT_FOUND_MESSAGE);
  });

  it("leaves other join failures unchanged", () => {
    expect(formatPrivateJoinError("This room has expired")).toBe(
      "This room has expired",
    );
    expect(
      formatPrivateJoinError(
        "This room is Pro Head to Head. Open Private match from Pro and try again.",
      ),
    ).toBe(
      "This room is Pro Head to Head. Open Private match from Pro and try again.",
    );
  });
});
