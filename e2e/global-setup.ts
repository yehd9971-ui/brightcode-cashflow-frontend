import { login, getUsers, resetPassword, bulkImport } from './helpers/api-client';
import { ADMIN, SALES_USER, SALES_MANAGER, TEST_PHONES } from './helpers/test-data';

export default async function globalSetup() {
  // 1. Login as admin
  const admin = await login(ADMIN.email, ADMIN.password);
  console.log('[setup] Admin logged in');

  // 2. Reset passwords for test users
  const { data: users } = await getUsers(admin.accessToken);
  for (const target of [SALES_USER, SALES_MANAGER]) {
    const user = users.find((u) => u.email === target.email);
    if (user) {
      await resetPassword(user.id, target.password, admin.accessToken);
      console.log(`[setup] Reset password for ${target.email}`);
    }
  }

  // 3. Bulk import test phone numbers
  const testNumbers = TEST_PHONES.map((phone, i) => ({
    phoneNumber: phone,
    clientName: `Test Client ${i + 1}`,
    source: 'Playwright',
  }));
  try {
    await bulkImport(testNumbers, admin.accessToken);
    console.log(`[setup] Imported ${TEST_PHONES.length} test numbers`);
  } catch (e: any) {
    console.log(`[setup] Import note: ${e.message}`);
  }
}
