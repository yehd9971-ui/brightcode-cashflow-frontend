import { cleanupCrmFixtures } from './helpers/crm-fixtures';
import { loginApiByRole } from './helpers/auth-roles';

export default async function globalTeardown() {
  try {
    const admin = await loginApiByRole('ADMIN');
    const cleanup = await cleanupCrmFixtures(admin.accessToken);
    console.log(`[teardown] Cleanup strategy: ${cleanup.strategy} (${cleanup.prefix})`);
  } catch (error) {
    console.log(`[teardown] Cleanup skipped: ${String(error)}`);
  }
  console.log('[teardown] Tests complete. Test data left in DB for inspection.');
}
