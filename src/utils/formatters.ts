import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export function formatDate(
  isoDate: string,
  locale: string = 'en',
  formatString: string = 'MMM dd, yyyy HH:mm'
): string {
  try {
    const date = parseISO(isoDate);
    const dateLocale = locale === 'ar' ? ar : enUS;
    return format(date, formatString, { locale: dateLocale });
  } catch {
    return isoDate;
  }
}

export function formatDateShort(isoDate: string, locale: string = 'en'): string {
  return formatDate(isoDate, locale, 'MMM dd, yyyy');
}

export function formatAmount(
  amount: string | number,
  locale: string = 'en',
  showCurrency: boolean = true
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);

  if (showCurrency) {
    return `${formatted} ${locale === 'ar' ? 'ج.م' : 'EGP'}`;
  }

  return formatted;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
