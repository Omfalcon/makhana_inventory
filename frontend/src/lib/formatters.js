// frontend/src/lib/formatters.js

/**
 * Formats integer paise into INR string (e.g. 16000 -> ₹160.00)
 */
export function formatPaise(paise = 0, showDecimals = true) {
  const amount = Number(paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats an ISO UTC date string into Asia/Kolkata date and time
 */
export function formatDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

/**
 * Formats an ISO UTC date string into Asia/Kolkata date only
 */
export function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

/**
 * Formats an ISO UTC date string into Asia/Kolkata time only
 */
export function formatTime(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

/**
 * Format numbers with Indian comma grouping
 */
export function formatNumber(num = 0) {
  return new Intl.NumberFormat('en-IN').format(num);
}
