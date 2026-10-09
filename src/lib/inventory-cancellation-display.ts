/** Read the existing audit text without changing the stored cancellation history. */
export function parseInventoryCancellation(rawReason?: string | null) {
  const raw = rawReason?.trim() || "";
  const match = raw.match(/^([\s\S]*?)\s*(?:\|\s*)?\[Đã hủy (\S+) bởi ([^\]]+)\]\s*([\s\S]*)$/);
  if (!match) {
    return { originalReason: "", reason: raw, cancelledBy: "", cancelledAt: null as string | null };
  }
  return {
    originalReason: match[1].replace(/\s*\|\s*$/, "").trim(),
    reason: match[4].trim(),
    cancelledBy: match[3].trim(),
    cancelledAt: Number.isNaN(new Date(match[2]).getTime()) ? null : match[2],
  };
}

export function formatInventoryCancellationTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
}
