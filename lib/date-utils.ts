/**
 * Utility functions for date/time handling with Egypt timezone (UTC+2)
 */

const EGYPT_TIMEZONE = "Africa/Cairo"; // UTC+2 (or UTC+3 in summer)

/**
 * Get current date/time in Egypt timezone
 */
export function nowInEgypt(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: EGYPT_TIMEZONE }));
}

/**
 * Convert a date string or Date object to Egypt timezone
 */
export function toEgyptTime(date: string | Date): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.toLocaleString("en-US", { timeZone: EGYPT_TIMEZONE }));
}

/**
 * Format date in Arabic with Egypt timezone
 */
export function formatDateArabic(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("ar-EG", { timeZone: EGYPT_TIMEZONE });
  } catch {
    return String(date);
  }
}

/**
 * Format date and time in Arabic with Egypt timezone
 */
export function formatDateTimeArabic(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("ar-EG", { timeZone: EGYPT_TIMEZONE });
  } catch {
    return String(date);
  }
}

/**
 * Format relative time (e.g., "منذ 5 دقائق") with Egypt timezone
 */
export function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = nowInEgypt();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return formatDateArabic(date);
  } catch {
    return dateStr;
  }
}

/**
 * Get ISO string for database storage (always UTC)
 */
export function toISOString(date?: Date): string {
  return (date || nowInEgypt()).toISOString();
}

/**
 * Get SQL datetime string (for SQLite) in Egypt timezone
 */
export function toSQLDateTime(date?: Date): string {
  const d = date || nowInEgypt();
  return d.toISOString().slice(0, 19).replace("T", " ");
}
