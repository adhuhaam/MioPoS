/** Parse YYYY-MM-DD range using local calendar days (matches browser date inputs). */
export function parseReportDateRange(
  dateFrom?: string,
  dateTo?: string,
  period?: string,
): { start: Date; end: Date; label: string } {
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new Error("Invalid date range");
    }
    return { start, end, label: `${dateFrom} – ${dateTo}` };
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === "today") {
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: today, end, label: "Today" };
  }
  if (period === "week") {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 6);
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, label: "Last 7 days" };
  }

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end, label: period === "month" ? "Last 30 days" : "Last 30 days" };
}
