export function formatVisitorCount(total: number | null) {
  return total === null ? "------" : Math.max(0, Math.floor(total)).toString().padStart(6, "0");
}

export function guestbookDateTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid guestbook date.");
  return date.toISOString();
}
