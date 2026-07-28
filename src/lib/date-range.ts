export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function validDateInput(value: string | null | undefined): value is string {
  if (!value) return false;
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Parse an HTML date input as a Vietnam calendar day. Date-only strings passed
 * directly to `new Date()` are interpreted as UTC and shift filters by 7 hours.
 */
export function parseAppDate(
  value: string | null | undefined,
  endOfDay = false,
): Date | undefined {
  if (!validDateInput(value)) return undefined;

  return new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`,
  );
}

export function parseAppDateRange(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
) {
  let normalizedStart = validDateInput(startValue) ? startValue : undefined;
  let normalizedEnd = validDateInput(endValue) ? endValue : undefined;

  // YYYY-MM-DD is lexicographically sortable. Swap the raw dates first so the
  // new start still begins at 00:00 and the new end still ends at 23:59:59.999.
  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    [normalizedStart, normalizedEnd] = [normalizedEnd, normalizedStart];
  }

  return {
    startDate: parseAppDate(normalizedStart),
    endDate: parseAppDate(normalizedEnd, true),
    startValue: normalizedStart,
    endValue: normalizedEnd,
  };
}

export function getAppDateParts(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    Number(parts.find((item) => item.type === type)?.value);

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
  };
}

export function formatAppDateInput(value: Date | string = new Date()) {
  const parts = getAppDateParts(value);
  if (!parts) return "";

  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function shiftDateInput(value: string, days: number) {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) return value;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(
    date.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

export function getAppDatePresetRange(
  preset: "today" | "week" | "month",
  now = new Date(),
) {
  const today = formatAppDateInput(now);
  const match = DATE_INPUT_PATTERN.exec(today);
  if (!match) return { from: "", to: "" };

  if (preset === "today") return { from: today, to: today };
  if (preset === "month") {
    return { from: `${match[1]}-${match[2]}-01`, to: today };
  }

  const weekday = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  ).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return { from: shiftDateInput(today, -daysSinceMonday), to: today };
}
