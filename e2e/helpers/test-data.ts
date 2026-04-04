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

export const API_BASE = 'http://localhost:3000';
export const APP_BASE = 'http://localhost:3001';

export const TEST_PHONES = Array.from({ length: 10 }, (_, i) =>
  `+20100900${String(1001 + i)}`
);

export const MANUAL_PHONE = '+201099887766';

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
