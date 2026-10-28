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

/**
 * Converts integer paise into Indian Currency words (e.g. 542000 -> "Rupees Five Thousand Four Hundred Twenty Only")
 */
export function paiseToWordsINR(paise = 0) {
  const totalRupees = Math.floor(Math.abs(Number(paise || 0)) / 100);
  const remainingPaise = Math.round(Math.abs(Number(paise || 0)) % 100);

  if (totalRupees === 0 && remainingPaise === 0) {
    return 'Rupees Zero Only';
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function numToWords(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
    return '';
  }

  let words = '';
  let n = totalRupees;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    words += numToWords(crore) + 'Crore ';
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    words += numToWords(lakh) + 'Lakh ';
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    words += numToWords(thousand) + 'Thousand ';
  }

  if (n > 0) {
    words += numToWords(n);
  }

  words = words.trim();
  let result = words ? `Rupees ${words}` : 'Rupees Zero';

  if (remainingPaise > 0) {
    const paiseWords = numToWords(remainingPaise).trim();
    result += ` and ${paiseWords} Paise`;
  }

  return `${result} Only`;
}
