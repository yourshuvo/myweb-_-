import { describe, expect, it } from "vitest";
import { interpretHackClubDeleteResponse } from "@/lib/hackclub-cdn";

describe("interpretHackClubDeleteResponse", () => {
  it("accepts the documented deletion response", () => {
    expect(interpretHackClubDeleteResponse(200, { id: "upload-id", deleted: true })).toEqual({
      kind: "deleted",
      id: "upload-id",
    });
  });

  it("treats the documented 404 as an absent or foreign upload", () => {
    expect(interpretHackClubDeleteResponse(404, { error: "Not found" })).toEqual({ kind: "missing" });
  });

  it("normalizes Hack Club's current unhandled account-scoped lookup error", () => {
    expect(interpretHackClubDeleteResponse(500, {
      error: "Couldn't find Upload with 'id'=\"upload-id\" [WHERE \"uploads\".\"user_id\" = $1]",
      error_id: null,
    })).toEqual({ kind: "missing" });
  });

  it("does not mistake unrelated upstream failures for a missing upload", () => {
    expect(interpretHackClubDeleteResponse(500, { error: "Storage service unavailable" })).toEqual({
      kind: "upstream-error",
      status: 500,
    });
  });

  it("rejects success responses that do not confirm deletion", () => {
    expect(interpretHackClubDeleteResponse(200, { id: "upload-id" })).toEqual({ kind: "invalid-response" });
  });

  it("reports an invalid API key separately", () => {
    expect(interpretHackClubDeleteResponse(401, { error: "Invalid API key" })).toEqual({ kind: "unauthorized" });
  });
});
