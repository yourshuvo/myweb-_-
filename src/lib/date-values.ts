export type DateValue = Date | string;

export function toDate(value: DateValue) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date value.");
  return date;
}

export function toIsoDateTime(value: DateValue | null | undefined) {
  return value ? toDate(value).toISOString() : undefined;
}
