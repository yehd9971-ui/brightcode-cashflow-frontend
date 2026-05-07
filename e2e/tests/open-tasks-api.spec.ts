import { test, expect } from '@playwright/test';
import { loginApiByRole } from '../helpers/auth-roles';
import { createTaskFixture } from '../helpers/crm-fixtures';
import { getOpenTasksApi } from '../helpers/api-client';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';

test.describe('open tasks API', () => {
  test('returns a local open task with bucket metadata', async () => {
    assertLocalPlaywrightTargets();
    const admin = await loginApiByRole('ADMIN');
    const fixture = await createTaskFixture(admin.accessToken, 'today');

    const result = await getOpenTasksApi(admin.accessToken, {
      bucket: 'all',
      phoneNumber: fixture.number.phoneNumber,
      page: 1,
      limit: 20,
    });

    const task = result.data.find((item) => item.id === fixture.task.id);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(task).toBeTruthy();
    expect(['overdue', 'today', 'upcoming']).toContain(task?.bucket);
    expect(typeof task?.isOverdue).toBe('boolean');
  });
});
