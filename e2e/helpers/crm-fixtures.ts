import {
  bestEffortCleanupTestData,
  createCallApi,
  createCallTaskApi,
  ensureClientNumberApi,
  scheduleFollowUpsApi,
  updateLeadStatusApi,
} from './api-client';
import {
  CRM_FIXTURE_PHONES,
  futureTodayTime,
  localDate,
  localTime,
  TEST_RUN_PREFIX,
  uniqueTestPhone,
} from './test-data';

export type CrmFixtureKind =
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'hotLead'
  | 'staleLead'
  | 'needsRetry';

export function fixturePhone(kind: CrmFixtureKind) {
  return CRM_FIXTURE_PHONES[kind];
}

export async function createTestNumberFixture(token: string, phone = uniqueTestPhone()) {
  return ensureClientNumberApi(
    { phoneNumber: phone, clientName: `${TEST_RUN_PREFIX} Client`, source: 'Playwright' },
    token,
  );
}

export async function createTaskFixture(
  token: string,
  kind: 'overdue' | 'today' | 'upcoming',
  userId?: string,
) {
  const offsets = { overdue: -1, today: 0, upcoming: 1 } as const;
  const phone = fixturePhone(kind);
  const number = await ensureClientNumberApi(
    { phoneNumber: phone, clientName: `${TEST_RUN_PREFIX} ${kind}`, source: 'Playwright' },
    token,
  );
  const task = await createCallTaskApi(
    {
      clientPhoneNumber: phone,
      taskDate: localDate(offsets[kind]),
      taskTime: kind === 'overdue' ? localTime(8, 0) : kind === 'today' ? futureTodayTime() : localTime(11, 0),
      userId,
      notes: `${TEST_RUN_PREFIX} ${kind} task`,
    },
    token,
  );
  return { number, task };
}

export async function createFollowUpFixture(token: string) {
  const number = await createTestNumberFixture(token, uniqueTestPhone());
  const followUps = await scheduleFollowUpsApi(number.id, token);
  return { number, followUps };
}

export async function createCallFixture(token: string, phone = uniqueTestPhone()) {
  await createTestNumberFixture(token, phone);
  const call = await createCallApi(
    {
      clientPhoneNumber: phone,
      callStatus: 'NOT_ANSWERED',
      notes: `${TEST_RUN_PREFIX} needs retry call`,
    },
    token,
  );
  return { phone, call };
}

export async function createLeadFixture(token: string, kind: 'hotLead' | 'staleLead' | 'needsRetry') {
  const phone = kind === 'needsRetry' ? uniqueTestPhone() : fixturePhone(kind);
  const number = await ensureClientNumberApi(
    { phoneNumber: phone, clientName: `${TEST_RUN_PREFIX} ${kind}`, source: 'Playwright' },
    token,
  );

  if (kind === 'hotLead') {
    await updateLeadStatusApi(number.id, 'HOT_LEAD', token);
  }

  if (kind === 'needsRetry') {
    await createCallApi(
      {
        clientPhoneNumber: phone,
        callStatus: 'NOT_ANSWERED',
        notes: `${TEST_RUN_PREFIX} needs retry fixture`,
      },
      token,
    );
  }

  return number;
}

export async function cleanupCrmFixtures(token: string) {
  return bestEffortCleanupTestData(token);
}
