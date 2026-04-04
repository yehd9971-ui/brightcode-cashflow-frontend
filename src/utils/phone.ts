/**
 * Normalize a phone number.
 * Egyptian numbers → 01XXXXXXXXX (11 digits, no prefix).
 * International numbers → kept as-is (with + prefix if applicable).
 */
export function normalizePhoneNumber(raw: string): string {
  // Strip whitespace, dashes, parentheses, dots
  let cleaned = raw.replace(/[\s\-().]/g, '');

  // +201XXXXXXXXX → 01XXXXXXXXX
  if (/^\+20(1[0125]\d{8})$/.test(cleaned)) {
    return '0' + cleaned.slice(3);
  }

  // 201XXXXXXXXX → 01XXXXXXXXX
  if (/^20(1[0125]\d{8})$/.test(cleaned)) {
    return '0' + cleaned.slice(2);
  }

  // 0021XXXXXXXXX → 01XXXXXXXXX
  if (/^002(1[0125]\d{8})$/.test(cleaned)) {
    return '0' + cleaned.slice(3);
  }

  // Already local format 01XXXXXXXXX
  if (/^0(1[0125]\d{8})$/.test(cleaned)) {
    return cleaned;
  }

  // International with 00 prefix → +
  if (/^00[1-9]/.test(cleaned)) {
    return '+' + cleaned.slice(2);
  }

  return cleaned;
}
