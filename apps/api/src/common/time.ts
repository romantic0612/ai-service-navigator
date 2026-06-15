const DEFAULT_OFFSET_MINUTES = 8 * 60;

function getDatabaseOffsetMinutes() {
  const rawValue = process.env.APP_TIMEZONE_OFFSET_MINUTES;
  if (!rawValue) {
    return DEFAULT_OFFSET_MINUTES;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : DEFAULT_OFFSET_MINUTES;
}

export function databaseNow() {
  return new Date(Date.now() + getDatabaseOffsetMinutes() * 60 * 1000);
}

export function databaseDateAfterDays(days: number) {
  return new Date(databaseNow().getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatShanghaiTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
