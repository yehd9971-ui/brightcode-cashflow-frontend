export const ADMIN = {
  email: 'info@brightc0de.com',
  password: 'Brightc0de@info',
};

export const SALES_USER = {
  email: 'salma@brightc0de.com',
  password: 'TestPass123!',
  id: '787e125b-e835-4535-be64-56c212e7e351',
};

export const SALES_MANAGER = {
  email: 'yasmin@brightc0de.com',
  password: 'TestPass123!',
  id: '78f471c5-1ed9-4159-a2b6-50e78fafe5da',
};

export const API_BASE = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:3000';
export const APP_BASE = process.env.PLAYWRIGHT_APP_BASE || 'http://localhost:3001';

export const LOCAL_ONLY_HOSTS = ['localhost', '127.0.0.1', '::1'];
export const TEST_RUN_PREFIX = `PW-CRM-${new Date().toISOString().slice(0, 10)}`;

export const TEST_PHONES = Array.from({ length: 10 }, (_, i) =>
  `+20100900${String(1001 + i)}`
);

export const MANUAL_PHONE = `+2011${String(Date.now()).slice(-8)}`;

export type TestRole = 'ADMIN' | 'SALES' | 'SALES_MANAGER';

export const TEST_ACCOUNTS = {
  ADMIN,
  SALES: SALES_USER,
  SALES_MANAGER,
} as const;

export const CRM_FIXTURE_PHONES = {
  overdue: '+201009901001',
  today: '+201009901002',
  upcoming: '+201009901003',
  hotLead: '+201009901004',
  staleLead: '+201009901005',
  needsRetry: '+201009901006',
} as const;

export function uniqueTestPhone(seed: number = Date.now()) {
  const suffix = String(seed).replace(/\D/g, '').slice(-7).padStart(7, '0');
  return `+2012${suffix}`;
}

export function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function localTime(hour = 10, minute = 0) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function futureTodayTime(minutesAhead = 90) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '10');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  const totalMinutes = Math.min(hour * 60 + minute + minutesAhead, 23 * 60 + 45);

  return localTime(Math.floor(totalMinutes / 60), totalMinutes % 60);
}

/** Returns previous month (month1) and current month (month2) for salary tests */
export function getSalaryTestMonths() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return {
    month1: { month: m === 1 ? 12 : m - 1, year: m === 1 ? y - 1 : y },
    month2: { month: m, year: y },
  };
}
