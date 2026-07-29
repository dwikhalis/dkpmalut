/** Upload suffix in MMDDYYYY_HHMMSS, always evaluated in WIT. */
export function getUploadTimestamp() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("month")}${value("day")}${value("year")}_${value("hour")}${value("minute")}${value("second")}`;
}
