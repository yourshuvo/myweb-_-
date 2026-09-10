export type AnonymousMessageOperation = "read" | "unread" | "archive" | "restore";

export function anonymousMessageTransition(operation: AnonymousMessageOperation, now = new Date()) {
  if (operation === "unread") return { status: "unread" as const, readAt: null, archivedAt: null };
  if (operation === "archive") return { status: "archived" as const, readAt: now, archivedAt: now };
  return { status: "read" as const, readAt: now, archivedAt: null };
}
