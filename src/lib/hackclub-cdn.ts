export type HackClubDeleteResult =
  | { kind: "deleted"; id: string }
  | { kind: "missing" }
  | { kind: "unauthorized" }
  | { kind: "invalid-response" }
  | { kind: "upstream-error"; status: number };

function errorMessage(body: unknown) {
  if (!body || typeof body !== "object" || !("error" in body)) return "";
  return typeof body.error === "string" ? body.error : "";
}

/**
 * Hack Club documents a 404 for uploads that are absent or owned by another
 * account. The current Rails controller can instead surface its unhandled
 * ActiveRecord lookup as a 500, so recognize only that narrow error signature.
 */
function isMissingUploadResponse(status: number, body: unknown) {
  if (status === 404) return true;
  if (status !== 500) return false;
  const message = errorMessage(body);
  return message.includes("Couldn't find Upload with 'id'=") && message.includes("uploads") && message.includes("user_id");
}

export function interpretHackClubDeleteResponse(status: number, body: unknown): HackClubDeleteResult {
  if (isMissingUploadResponse(status, body)) return { kind: "missing" };
  if (status === 401) return { kind: "unauthorized" };

  if (status >= 200 && status < 300) {
    if (
      body &&
      typeof body === "object" &&
      "deleted" in body &&
      body.deleted === true &&
      "id" in body &&
      typeof body.id === "string" &&
      body.id.length > 0
    ) {
      return { kind: "deleted", id: body.id };
    }
    return { kind: "invalid-response" };
  }

  return { kind: "upstream-error", status };
}
