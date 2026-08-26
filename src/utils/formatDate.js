// Human-friendly timestamps for the link list and digest view.
//
//   < 1 min      "just now"
//   < 60 min     "12 min ago"
//   < 24 hours   "3 hours ago"
//   otherwise    "August 25th 2026"

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function formatLongDate(date) {
  return `${MONTHS[date.getMonth()]} ${ordinal(date.getDate())} ${date.getFullYear()}`;
}

export function formatRelativeTime(diffMs) {
  if (diffMs < MINUTE) return 'just now';
  if (diffMs < HOUR) {
    const mins = Math.floor(diffMs / MINUTE);
    return `${mins} min ago`;
  }
  const hours = Math.floor(diffMs / HOUR);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

/**
 * Format a link timestamp for display.
 * Relative ("x min ago" / "x hours ago") within the last 24 hours,
 * long-form ("August 25th 2026") otherwise. Future or unparseable
 * timestamps fall back to the long form / empty string.
 *
 * @param {string|number|Date} timestamp
 * @param {number} [now=Date.now()] reference time in ms (injectable for tests)
 */
export function formatLinkDate(timestamp, now = Date.now()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const diff = now - date.getTime();
  if (diff >= 0 && diff < DAY) return formatRelativeTime(diff);
  return formatLongDate(date);
}
