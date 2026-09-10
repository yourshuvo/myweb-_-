export type ResponseBody<T> = { json: T | null; text: string };

/**
 * Reads a response body once, returning both the parsed JSON (when the body is
 * JSON) and the raw text. Keeps a platform error page from surfacing as an
 * opaque "Unexpected token '<'" parse failure.
 */
export async function readResponseBody<T>(response: Response): Promise<ResponseBody<T>> {
  const text = await response.text();
  if (!text) return { json: null, text: "" };
  try {
    return { json: JSON.parse(text) as T, text };
  } catch {
    return { json: null, text };
  }
}

export function serverErrorMessage(json: { error?: string } | null, text: string) {
  if (json?.error) return json.error;
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) {
    return "The server returned an error page instead of a response. Check the deployment logs.";
  }
  return trimmed.slice(0, 300);
}
