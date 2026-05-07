import { test, expect } from '@playwright/test';
import { loginApiByRole } from '../helpers/auth-roles';
import {
  createCallApi,
  createCrmLeadTaskApi,
  getCrmLeadApi,
  getCrmLeadsApi,
  getCrmLeadTimelineApi,
  updateCrmLeadStageApi,
} from '../helpers/api-client';
import { createTestNumberFixture } from '../helpers/crm-fixtures';
import { assertLocalPlaywrightTargets } from '../helpers/local-readiness';
import { localDate, localTime, TEST_RUN_PREFIX } from '../helpers/test-data';

test.describe('crm leads API', () => {
  test('returns lead list, detail, and timeline for a local CRM fixture', async () => {
    assertLocalPlaywrightTargets();
    const admin = await loginApiByRole('ADMIN');
    const number = await createTestNumberFixture(admin.accessToken);

    await updateCrmLeadStageApi(
      number.id,
      { stage: 'HOT_LEAD', priority: 4 },
      admin.accessToken,
    );
    const task = await createCrmLeadTaskApi(
      number.id,
      {
        taskDate: localDate(1),
        taskTime: localTime(10, 30),
        notes: `${TEST_RUN_PREFIX} CRM leads API smoke`,
      },
      admin.accessToken,
    );
    await createCallApi(
      {
        clientPhoneNumber: number.phoneNumber,
        callStatus: 'ANSWERED',
        durationMinutes: 4,
        notes: `${TEST_RUN_PREFIX} CRM timeline answered call`,
      },
      admin.accessToken,
    );

    const leads = await getCrmLeadsApi(admin.accessToken, {
      stage: 'HOT_LEAD',
      ownerId: admin.user.id,
      nextAction: 'upcoming',
      sortBy: 'nextActionAt',
      sortOrder: 'asc',
      page: 1,
      limit: 20,
    });

    const match = leads.data.find((lead) => lead.id === number.id);
    expect(match).toBeTruthy();
    expect(match?.stage).toBe('HOT_LEAD');
    expect(match?.nextOpenTask?.id).toBe(task.id);
    expect(leads.countsByStage.HOT_LEAD).toBeGreaterThanOrEqual(1);

    const detail = await getCrmLeadApi(number.id, admin.accessToken);
    expect(detail.id).toBe(number.id);
    expect(detail.stage).toBe('HOT_LEAD');
    expect(detail.recentTasks.some((item) => item.id === task.id)).toBeTruthy();

    const timeline = await getCrmLeadTimelineApi(number.id, admin.accessToken, {
      order: 'desc',
      page: 1,
      limit: 20,
    });
    expect(
      timeline.data.some(
        (item) => item.event === 'HOT_LEAD_MARKED' && item.rawAction === 'CRM_STAGE_CHANGED',
      ),
    ).toBeTruthy();
    expect(
      timeline.data.some(
        (item) => item.id === task.id && item.type === 'task' && item.event === 'TASK_CREATED',
      ),
    ).toBeTruthy();
    expect(timeline.data.some((item) => item.event === 'CALL_LOGGED')).toBeTruthy();
    expect(timeline.data.some((item) => item.event === 'CALL_ANSWERED')).toBeTruthy();
    expect(timeline.data.every((item) => Boolean(item.occurredAtEgypt))).toBeTruthy();

    const answeredTimeline = await getCrmLeadTimelineApi(number.id, admin.accessToken, {
      eventType: 'CALL_ANSWERED',
      page: 1,
      limit: 10,
    });
    expect(answeredTimeline.data.length).toBeGreaterThan(0);
    expect(answeredTimeline.data.every((item) => item.event === 'CALL_ANSWERED')).toBeTruthy();
  });
});
