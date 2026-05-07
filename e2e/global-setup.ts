import { login, getUsers, resetPassword, bulkImport, createUserApi } from './helpers/api-client';
import { ADMIN, SALES_USER, SALES_MANAGER, TEST_PHONES } from './helpers/test-data';
import { assertLocalApiReady, assertLocalPlaywrightTargets } from './helpers/local-readiness';

async function loginWithRateLimitRetry(email: string, password: string) {
  try {
    return await login(email, password);
  } catch (error) {
    if (!String(error).includes('429')) throw error;
    console.log(`[setup] Rate limited for ${email}, waiting 65s before retry`);
    await new Promise((resolve) => setTimeout(resolve, 65_000));
    return login(email, password);
  }
}

export default async function globalSetup() {
  assertLocalPlaywrightTargets();
  await assertLocalApiReady();

  // 1. Login as admin
  const admin = await loginWithRateLimitRetry(ADMIN.email, ADMIN.password);
  console.log('[setup] Admin logged in');

  // 2. Reset passwords for test users
  const { data: users } = await getUsers(admin.accessToken);
  for (const target of [SALES_USER, SALES_MANAGER]) {
    const user = users.find((u) => u.email === target.email);
    if (user) {
      await resetPassword(user.id, target.password, admin.accessToken);
      console.log(`[setup] Reset password for ${target.email}`);
    } else {
      await createUserApi(
        {
          email: target.email,
          password: target.password,
          role: target === SALES_USER ? 'SALES' : 'SALES_MANAGER',
        },
        admin.accessToken,
      );
      console.log(`[setup] Created test user ${target.email}`);
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
  } catch (error) {
    console.log(`[setup] Import note: ${error instanceof Error ? error.message : String(error)}`);
  }
}
