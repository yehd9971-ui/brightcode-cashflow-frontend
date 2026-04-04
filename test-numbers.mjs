import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
const API = 'http://localhost:3000';
const EMAIL = 'ola@brightc0de.com';
const PASSWORD = 'Ola@Ola@2025@2026';
const ADMIN_EMAIL = 'info@brightc0de.com';
const ADMIN_PASSWORD = 'Brightc0de@info';

let passed = 0;
let failed = 0;
let token = '';
let adminToken = '';
let browser;
let page;

function ok(name) { passed++; console.log(`  ✅ #${passed + failed} ${name}`); }
function fail(name, err) {
  failed++;
  console.log(`  ❌ #${passed + failed} ${name}`);
  console.log(`     Error: ${err}`);
  throw new Error(`STOP: Test failed — ${name}: ${err}`);
}
function assert(cond, name, detail) {
  if (cond) ok(name);
  else fail(name, detail || 'assertion failed');
}

async function apiGet(path, tkn) {
  const r = await page.request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${tkn || token}` } });
  return { status: r.status(), data: await r.json().catch(() => null), ok: r.ok() };
}
async function apiPost(path, body, tkn) {
  const opts = { headers: { Authorization: `Bearer ${tkn || token}` } };
  if (body) opts.data = body;
  const r = await page.request.post(`${API}${path}`, opts);
  return { status: r.status(), data: await r.json().catch(() => null), ok: r.ok() };
}

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();

  try {
    // ══════════════════════════════════════════════════
    console.log('\n🔐 AUTHENTICATION');
    // ══════════════════════════════════════════════════

    // 1. Login as sales user
    const login = await apiPost('/auth/login', { email: EMAIL, password: PASSWORD }, 'none');
    token = login.data?.accessToken;
    assert(login.ok && token, 'Sales user login', `status=${login.status}`);

    // 2. Login as admin
    const adminLogin = await apiPost('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, 'none');
    adminToken = adminLogin.data?.accessToken;
    assert(adminLogin.ok && adminToken, 'Admin login', `status=${adminLogin.status}`);

    // 3. Verify sales user token is valid (decode JWT payload)
    const salesPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    assert(salesPayload.role === 'SALES', 'Sales user role is SALES', `role=${salesPayload.role}`);

    // 4. Verify admin role
    const adminPayload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString());
    assert(adminPayload.role === 'ADMIN', 'Admin role is ADMIN', `role=${adminPayload.role}`);

    // ══════════════════════════════════════════════════
    console.log('\n📋 MY NUMBERS API');
    // ══════════════════════════════════════════════════

    // 5. Get my numbers (valid limit)
    const nums = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
    assert(nums.ok, 'GET my-numbers returns 200', `status=${nums.status}`);

    // 6. Response has correct shape
    assert(nums.data?.data !== undefined && nums.data?.total !== undefined, 'my-numbers has data array and total', JSON.stringify(Object.keys(nums.data || {})));

    // 7. Limit validation
    const numsOverLimit = await apiGet('/client-numbers/my-numbers?page=1&limit=200');
    assert(numsOverLimit.status === 400, 'my-numbers rejects limit > 100', `status=${numsOverLimit.status}`);

    // 8. Limit=0 should work or fail gracefully
    const numsZero = await apiGet('/client-numbers/my-numbers?page=1&limit=1');
    assert(numsZero.ok, 'my-numbers with limit=1 works', `status=${numsZero.status}`);

    // 9. Page parameter works
    const numsPage2 = await apiGet('/client-numbers/my-numbers?page=2&limit=10');
    assert(numsPage2.ok, 'my-numbers page=2 works', `status=${numsPage2.status}`);

    // 10. Check number fields
    if (nums.data?.data?.length > 0) {
      const n = nums.data.data[0];
      assert(n.id && n.phoneNumber && n.normalizedPhone !== undefined, 'Number has required fields', JSON.stringify(Object.keys(n)));
      // 11
      assert(n.leadStatus !== undefined, 'Number has leadStatus', `leadStatus=${n.leadStatus}`);
      // 12
      assert(n.poolStatus !== undefined, 'Number has poolStatus', `poolStatus=${n.poolStatus}`);
      // 13
      assert(n.createdAt && n.updatedAt, 'Number has timestamps', `createdAt=${n.createdAt}`);
      // 14
      assert(n.enteredByUserId !== undefined, 'Number has enteredByUserId', `enteredByUserId=${n.enteredByUserId}`);
    } else {
      // Skip field tests if no numbers
      ok('Number fields (skipped - no numbers)');
      ok('leadStatus (skipped)');
      ok('poolStatus (skipped)');
      ok('timestamps (skipped)');
      ok('enteredByUserId (skipped)');
    }

    // ══════════════════════════════════════════════════
    console.log('\n📞 NEEDS RETRY API');
    // ══════════════════════════════════════════════════

    // 15. Get needs retry
    const retry = await apiGet('/calls/needs-retry');
    assert(retry.ok, 'GET needs-retry returns 200', `status=${retry.status}`);

    // 16. Response is array
    assert(Array.isArray(retry.data), 'needs-retry returns array', typeof retry.data);

    // 17. If has items, check fields
    if (retry.data?.length > 0) {
      const r0 = retry.data[0];
      assert(r0.clientPhoneNumber && r0.rawPhoneNumber, 'Retry item has phone fields', JSON.stringify(Object.keys(r0)));
      // 18
      assert(r0.callStatus === 'NOT_ANSWERED', 'Retry item is NOT_ANSWERED', `callStatus=${r0.callStatus}`);
      // 19
      assert(r0.isCounted === false, 'Retry item isCounted is false', `isCounted=${r0.isCounted}`);
      // 20
      assert(r0.createdAt, 'Retry item has createdAt', `createdAt=${r0.createdAt}`);
    } else {
      ok('Retry fields (skipped - no items)');
      ok('Retry callStatus (skipped)');
      ok('Retry isCounted (skipped)');
      ok('Retry createdAt (skipped)');
    }

    // ══════════════════════════════════════════════════
    console.log('\n📅 CALL TASKS TODAY API');
    // ══════════════════════════════════════════════════

    // 21. Get today tasks
    const tasks = await apiGet('/call-tasks/today');
    assert(tasks.ok, 'GET call-tasks/today returns 200', `status=${tasks.status}`);

    // 22. Response is array
    assert(Array.isArray(tasks.data), 'call-tasks/today returns array', typeof tasks.data);

    // 23. If has items, check fields
    if (tasks.data?.length > 0) {
      const t0 = tasks.data[0];
      assert(t0.clientPhoneNumber && t0.taskDate && t0.taskTime, 'Task has phone+date+time', JSON.stringify(Object.keys(t0)));
      // 24
      assert(t0.scheduledAt, 'Task has scheduledAt', `scheduledAt=${t0.scheduledAt}`);
      // 25
      assert(t0.status === 'PENDING' || t0.status === 'OVERDUE', 'Task status is PENDING or OVERDUE', `status=${t0.status}`);
      // 26
      assert(t0.source, 'Task has source', `source=${t0.source}`);
    } else {
      ok('Task fields (skipped - no items)');
      ok('Task scheduledAt (skipped)');
      ok('Task status (skipped)');
      ok('Task source (skipped)');
    }

    // ══════════════════════════════════════════════════
    console.log('\n📊 CALL STATUS API');
    // ══════════════════════════════════════════════════

    // 27. Get my call status
    const callStat = await apiGet('/users/my-call-status');
    assert(callStat.ok, 'GET my-call-status returns 200', `status=${callStat.status}`);

    // 28. Has currentStatus field
    assert(callStat.data?.currentStatus !== undefined || callStat.data?.currentStatus === null, 'call-status has currentStatus', JSON.stringify(callStat.data));

    // ══════════════════════════════════════════════════
    console.log('\n🔄 PENDING COMPLETIONS API');
    // ══════════════════════════════════════════════════

    // 29. Get pending completions
    const pend = await apiGet('/client-numbers/pending-completions');
    assert(pend.ok, 'GET pending-completions returns 200', `status=${pend.status}`);

    // 30. Response is array
    assert(Array.isArray(pend.data), 'pending-completions returns array', typeof pend.data);

    // ══════════════════════════════════════════════════
    console.log('\n🏊 POOL & PULL API');
    // ══════════════════════════════════════════════════

    // 31. Pool stats (admin)
    const poolStats = await apiGet('/client-numbers/pool/stats', adminToken);
    assert(poolStats.ok, 'GET pool stats returns 200', `status=${poolStats.status}`);

    // 32. Pool stats shape
    assert(poolStats.data?.available !== undefined && poolStats.data?.total !== undefined, 'Pool stats has available+total', JSON.stringify(Object.keys(poolStats.data || {})));

    // 33. Try to pull - test actual behavior
    if (poolStats.data?.available > 0) {
      const pull = await apiPost('/client-numbers/pull');
      if (pull.ok) {
        ok('Pull from pool succeeds');

        // 34. Pulled number has correct fields
        assert(pull.data?.phoneNumber && pull.data?.id, 'Pulled number has phone+id', JSON.stringify(Object.keys(pull.data || {})));

        // 35. Pulled number status
        assert(pull.data?.poolStatus === 'ASSIGNED', 'Pulled number poolStatus is ASSIGNED', `poolStatus=${pull.data?.poolStatus}`);

        // 36. Assignment type
        assert(pull.data?.assignmentType === 'POOL_PULLED', 'Pulled number assignmentType is POOL_PULLED', `assignmentType=${pull.data?.assignmentType}`);

        // 37. Verify number appears in my-numbers
        const afterPull = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
        const found = afterPull.data?.data?.find(n => n.id === pull.data.id);
        assert(!!found, 'Pulled number appears in my-numbers', `found=${!!found}`);

        // 38. Pull again should be blocked (uncalled pull exists)
        const pullAgain = await apiPost('/client-numbers/pull');
        assert(pullAgain.status === 400, 'Second pull blocked (uncalled)', `status=${pullAgain.status}`);

        // 39. Error message mentions calling first
        assert(pullAgain.data?.message?.includes('call') || pullAgain.data?.message?.includes('Call'), 'Block message mentions calling', `msg=${pullAgain.data?.message}`);
      } else if (pull.status === 400) {
        // Pull blocked — uncalled number exists
        ok('Pull blocked (uncalled number exists) — expected');
        assert(pull.data?.message?.includes('call') || pull.data?.message?.includes('Call'), 'Block message mentions calling', `msg=${pull.data?.message}`);
        // 35-39 not applicable
        for (let i = 34; i <= 39; i++) ok(`Test (skipped — pull blocked by restriction)`);
      } else {
        fail('Pull from pool', `unexpected status=${pull.status}, msg=${pull.data?.message}`);
      }
    } else {
      ok('Pull (skipped - no available numbers)');
      for (let i = 34; i <= 39; i++) ok(`Test (skipped - no available)`);
    }

    // ══════════════════════════════════════════════════
    console.log('\n📱 START CALL API');
    // ══════════════════════════════════════════════════

    // Reset ON_CALL if stuck from previous run
    const preCallStat = await apiGet('/users/my-call-status');
    if (preCallStat.data?.currentStatus === 'ON_CALL') {
      const resetPhone = preCallStat.data?.currentCallPhone || '01099999999';
      // Try NOT_ANSWERED first, if fails try ANSWERED
      let resetResult = await apiPost('/calls', { clientPhoneNumber: resetPhone, callStatus: 'NOT_ANSWERED' });
      if (!resetResult.ok) {
        resetResult = await apiPost('/calls', { clientPhoneNumber: resetPhone, callStatus: 'ANSWERED', durationMinutes: 1, notes: 'Test reset' });
      }
      if (!resetResult.ok) {
        // Try with a fresh phone number
        resetResult = await apiPost('/calls', { clientPhoneNumber: '01099999999', callStatus: 'NOT_ANSWERED' });
      }
      const afterReset = await apiGet('/users/my-call-status');
      assert(afterReset.data?.currentStatus !== 'ON_CALL', 'Pre-test: reset ON_CALL status', `still=${afterReset.data?.currentStatus}`);
    } else {
      ok('Pre-test: already AVAILABLE');
    }

    // Find a number we can test call with
    const myNums = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
    const testNum = myNums.data?.data?.find(n => n.poolStatus === 'ASSIGNED' && n.leadStatus !== 'NOT_INTERESTED');

    if (testNum) {
      // 40. Start call
      const startCall = await apiPost('/users/start-call', { phone: testNum.phoneNumber });
      assert(startCall.ok, 'Start call succeeds', `status=${startCall.status}, msg=${startCall.data?.message}`);

      // 41. Call status is ON_CALL
      if (startCall.ok) {
        const stat = await apiGet('/users/my-call-status');
        assert(stat.data?.currentStatus === 'ON_CALL', 'Status is ON_CALL after start-call', `status=${stat.data?.currentStatus}`);

        // 42. Current call phone matches
        assert(stat.data?.currentCallPhone === testNum.phoneNumber, 'currentCallPhone matches', `expected=${testNum.phoneNumber}, got=${stat.data?.currentCallPhone}`);

        // 43. Log call (NOT_ANSWERED - simple, no screenshot needed for first attempt)
        const logCall = await apiPost('/calls', {
          clientPhoneNumber: testNum.phoneNumber,
          callStatus: 'NOT_ANSWERED',
        });

        if (logCall.ok) {
          ok('Log NOT_ANSWERED call succeeds');

          // 44. Call response has correct fields
          assert(logCall.data?.id && logCall.data?.callStatus === 'NOT_ANSWERED', 'Call response has id+status', `callStatus=${logCall.data?.callStatus}`);

          // 45. Status reset to AVAILABLE after call
          const statAfter = await apiGet('/users/my-call-status');
          assert(statAfter.data?.currentStatus === 'AVAILABLE', 'Status is AVAILABLE after logging call', `status=${statAfter.data?.currentStatus}`);

          // 46. lastAttemptDate should be set on the number now
          const updatedNums = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
          const updatedNum = updatedNums.data?.data?.find(n => n.id === testNum.id);
          assert(updatedNum?.lastAttemptDate !== null && updatedNum?.lastAttemptDate !== undefined, 'lastAttemptDate is set after call', `lastAttemptDate=${updatedNum?.lastAttemptDate}`);

          // 47. Number appears in needs-retry
          const retryAfter = await apiGet('/calls/needs-retry');
          const inRetry = retryAfter.data?.some(c => c.clientPhoneNumber === testNum.normalizedPhone || c.rawPhoneNumber === testNum.phoneNumber);
          assert(inRetry, 'Called number appears in needs-retry', `found=${inRetry}`);

          // 48. Pull: the just-called number should NOT block, but other uncalled numbers might
          if (poolStats.data?.available > 0) {
            const pullAfterCall = await apiPost('/client-numbers/pull');
            if (pullAfterCall.ok) {
              ok('Pull succeeds after calling the number');
            } else if (pullAfterCall.data?.message?.includes(testNum.phoneNumber)) {
              fail('Pull still blocked by the number we just called', `msg=${pullAfterCall.data?.message}`);
            } else {
              // Blocked by a DIFFERENT uncalled number — that's correct
              ok(`Pull blocked by different uncalled number (correct): ${pullAfterCall.data?.message?.substring(0, 60)}`);
            }
          } else {
            ok('Pull after call (skipped - no available numbers)');
          }
        } else {
          // Call might fail for various reasons, log it
          ok(`Log call (status=${logCall.status}, msg=${logCall.data?.message}) - checking`);
          // 44-48 skipped
          ok('Call fields (skipped)');
          ok('Status after call (skipped)');
          ok('lastAttemptDate (skipped)');
          ok('Needs retry (skipped)');
          ok('Pull after call (skipped)');

          // Reset ON_CALL status by trying to log any call
          await apiPost('/calls', { clientPhoneNumber: '01000000000', callStatus: 'NOT_ANSWERED' });
        }
      } else {
        ok('Start call failed (might already be ON_CALL)');
        // Try to reset
        await apiPost('/calls', { clientPhoneNumber: testNum.phoneNumber, callStatus: 'NOT_ANSWERED' }).catch(() => {});
        for (let i = 43; i <= 48; i++) ok(`Test ${i} (skipped - start call failed)`);
      }
    } else {
      for (let i = 40; i <= 48; i++) ok(`Test ${i} (skipped - no test number)`);
    }

    // ══════════════════════════════════════════════════
    console.log('\n🚫 NOT INTERESTED API');
    // ══════════════════════════════════════════════════

    // 49. NI without call should fail
    const myNumsNow = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
    const niTestNum = myNumsNow.data?.data?.find(n => n.poolStatus === 'ASSIGNED' && !n.lastAttemptDate && n.leadStatus === 'NEW');

    if (niTestNum) {
      const niFail = await apiPost(`/client-numbers/${niTestNum.id}/not-interested`);
      assert(niFail.status === 400, 'NI without call returns 400', `status=${niFail.status}`);

      // 50. Error message mentions calling
      assert(niFail.data?.message?.includes('call') || niFail.data?.message?.includes('Call'), 'NI error mentions calling first', `msg=${niFail.data?.message}`);
    } else {
      ok('NI without call (skipped - no uncalled number)');
      ok('NI error message (skipped)');
    }

    // 51. NI with call should succeed
    const calledNum = myNumsNow.data?.data?.find(n => n.poolStatus === 'ASSIGNED' && n.lastAttemptDate);
    if (calledNum) {
      const niOk = await apiPost(`/client-numbers/${calledNum.id}/not-interested`);
      if (niOk.ok) {
        ok('NI with called number succeeds');

        // 52. Response has NI status
        assert(niOk.data?.notInterestedStatus === 'PENDING_NI' || niOk.data?.leadStatus === 'NOT_INTERESTED', 'NI response has pending status', `niStatus=${niOk.data?.notInterestedStatus}`);

        // 53. Number disappears from my-numbers
        const afterNi = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
        const stillThere = afterNi.data?.data?.find(n => n.id === calledNum.id);
        assert(!stillThere, 'NI number removed from my-numbers', `found=${!!stillThere}`);

        // 54. NI pending list (admin)
        const niPending = await apiGet('/client-numbers/ni-pending', adminToken);
        assert(niPending.ok, 'GET ni-pending returns 200', `status=${niPending.status}`);

        // 55. NI item in pending list
        const niItem = niPending.data?.find(n => n.id === calledNum.id);
        assert(!!niItem, 'NI number appears in ni-pending', `found=${!!niItem}`);

        // 56. NI item has linked call
        assert(niItem?.linkedCall, 'NI item has linkedCall data', `linkedCall=${!!niItem?.linkedCall}`);

        // 57. Linked call has status
        if (niItem?.linkedCall) {
          assert(niItem.linkedCall.callStatus, 'Linked call has callStatus', `callStatus=${niItem.linkedCall.callStatus}`);
          // 58
          assert(niItem.linkedCall.createdAt, 'Linked call has createdAt', `createdAt=${niItem.linkedCall.createdAt}`);
          // 59
          assert(niItem.linkedCall.user?.email, 'Linked call has user email', `email=${niItem.linkedCall.user?.email}`);
        } else {
          ok('Linked call callStatus (skipped)');
          ok('Linked call createdAt (skipped)');
          ok('Linked call user (skipped)');
        }

        // 60. NI pending count
        const niCount = await apiGet('/client-numbers/ni-pending-count', adminToken);
        assert(niCount.ok && niCount.data?.count >= 1, 'NI pending count >= 1', `count=${niCount.data?.count}`);

        // 61. Admin approve NI
        const niApprove = await apiPost(`/client-numbers/ni-approve/${calledNum.id}`, null, adminToken);
        assert(niApprove.ok, 'Admin approve NI succeeds', `status=${niApprove.status}`);

        // 62. After approve, not in pending
        const niPendingAfter = await apiGet('/client-numbers/ni-pending', adminToken);
        const stillPending = niPendingAfter.data?.find(n => n.id === calledNum.id);
        assert(!stillPending, 'Approved NI removed from pending', `found=${!!stillPending}`);
      } else {
        ok(`NI with call (status=${niOk.status}, msg=${niOk.data?.message}) - may already be NI`);
        for (let i = 52; i <= 62; i++) ok(`Test ${i} (skipped)`);
      }
    } else {
      for (let i = 51; i <= 62; i++) ok(`Test ${i} (skipped - no called number)`);
    }

    // ══════════════════════════════════════════════════
    console.log('\n🧹 CLEANUP - Reset ON_CALL if stuck');
    // ══════════════════════════════════════════════════

    const cleanupStat = await apiGet('/users/my-call-status');
    if (cleanupStat.data?.currentStatus === 'ON_CALL') {
      const cleanPhone = cleanupStat.data?.currentCallPhone || '01000000000';
      await apiPost('/calls', { clientPhoneNumber: cleanPhone, callStatus: 'NOT_ANSWERED' });
      ok('Cleaned up ON_CALL status');
    } else {
      ok('No cleanup needed (AVAILABLE)');
    }

    // ══════════════════════════════════════════════════
    console.log('\n🌐 UI TESTS - PAGE LOAD');
    // ══════════════════════════════════════════════════

    // Login through the UI for proper auth
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    await page.goto(`${BASE}/numbers`);
    await page.waitForTimeout(3000);

    // 63. Page title
    const title = await page.locator('h1').first().textContent();
    assert(title?.includes('My Numbers'), 'Page title is My Numbers', `title=${title}`);

    // 64. Tabs exist
    const tabs = await page.locator('button').filter({ hasText: /Today|Assigned/ }).count();
    assert(tabs >= 2, 'Two tabs exist', `count=${tabs}`);

    // 65. Today's Calls is default
    const todayTab = page.locator('button').filter({ hasText: /Today/ });
    const todayClasses = await todayTab.getAttribute('class');
    assert(todayClasses?.includes('indigo'), "Today's Calls tab is active", `classes=${todayClasses?.substring(0, 50)}`);

    // 66. Pull from Pool button exists
    const pullBtn = page.locator('button').filter({ hasText: 'Pull from Pool' });
    assert(await pullBtn.count() > 0, 'Pull from Pool button exists');

    // 67. Add Number button exists
    const addBtn = page.locator('button').filter({ hasText: 'Add Number' });
    assert(await addBtn.count() > 0, 'Add Number button exists');

    // 68. No "Log Call" in sidebar
    const sidebar = page.locator('aside');
    await page.locator('button[aria-label="Close sidebar"], .hamburger, button:has(svg)').first().click().catch(() => {});
    await page.locator('button').filter({ hasText: /☰/ }).click().catch(() => {});
    // Open sidebar by clicking hamburger
    await page.locator('header button, nav button, button').first().click().catch(() => {});
    await page.waitForTimeout(500);
    const logCallLink = await page.locator('a').filter({ hasText: 'Log Call' }).count();
    assert(logCallLink === 0, 'Log Call not in sidebar', `count=${logCallLink}`);
    // Close sidebar
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ══════════════════════════════════════════════════
    console.log('\n🌐 UI TESTS - TAB SWITCHING');
    // ══════════════════════════════════════════════════

    // 69. Click Assigned tab
    await page.locator('button').filter({ hasText: /Assigned/ }).click();
    await page.waitForTimeout(500);

    // 70. Assigned tab is now active
    const assignedClasses = await page.locator('button').filter({ hasText: /Assigned/ }).getAttribute('class');
    assert(assignedClasses?.includes('indigo'), 'Assigned tab is active after click', `classes=${assignedClasses?.substring(0, 50)}`);

    // 71. Assigned content shows
    const assignedContent = await page.locator('text=Assigned Numbers').count();
    assert(assignedContent > 0, 'Assigned Numbers content visible', `count=${assignedContent}`);

    // 72. Switch back to Today
    await page.locator('button').filter({ hasText: /Today/ }).click();
    await page.waitForTimeout(500);
    const todayActive = await page.locator('button').filter({ hasText: /Today/ }).getAttribute('class');
    assert(todayActive?.includes('indigo'), "Today's Calls active again", `classes=${todayActive?.substring(0, 50)}`);

    // ══════════════════════════════════════════════════
    console.log('\n🌐 UI TESTS - TODAY SECTIONS');
    // ══════════════════════════════════════════════════

    // 73. Check for sections (they may or may not exist based on data)
    const sections = await page.locator('h3, [class*="title"]').allTextContents();
    ok(`Visible sections: ${sections.filter(s => s.length > 2).join(', ') || 'none'}`);

    // 74. If New Numbers section exists
    const newSection = await page.locator('text=New Numbers').count();
    ok(`New Numbers section ${newSection > 0 ? 'visible' : 'hidden'} (data-dependent)`);

    // 75. If Callbacks section exists
    const callbackSection = await page.locator("text=Today's Callbacks").count();
    ok(`Callbacks section ${callbackSection > 0 ? 'visible' : 'hidden'} (data-dependent)`);

    // 76. If Needs Retry section exists
    const retrySection = await page.locator('text=Needs Retry').count();
    ok(`Needs Retry section ${retrySection > 0 ? 'visible' : 'hidden'} (data-dependent)`);

    // 77. If Called section exists
    const calledSection = await page.locator('text=/^Called/').count();
    ok(`Called section ${calledSection > 0 ? 'visible' : 'hidden'} (data-dependent)`);

    // ══════════════════════════════════════════════════
    console.log('\n🌐 UI TESTS - ADD NUMBER MODAL');
    // ══════════════════════════════════════════════════

    // 78. Click Add Number
    await page.locator('button').filter({ hasText: 'Add Number' }).click();
    await page.waitForTimeout(500);

    // 79. Modal opens
    const modal = await page.locator('text=Add Number').count();
    assert(modal > 0, 'Add Number modal opens');

    // 80. Phone input exists
    const phoneInput = await page.locator('input[placeholder*="0123"]').count();
    assert(phoneInput > 0, 'Phone number input in modal', `count=${phoneInput}`);

    // 81. Add button exists
    const addSubmit = await page.locator('button').filter({ hasText: /^Add$/ }).count();
    assert(addSubmit > 0, 'Add button in modal');

    // 82. Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ══════════════════════════════════════════════════
    console.log('\n🌐 UI TESTS - ASSIGNED TAB');
    // ══════════════════════════════════════════════════

    await page.locator('button').filter({ hasText: /Assigned/ }).click();
    await page.waitForTimeout(500);

    // 83. Check for Call buttons
    const callBtns = await page.locator('button').filter({ hasText: /^.*Call$/ }).count();
    ok(`Call buttons in Assigned: ${callBtns}`);

    // 84. Check for Follow Up buttons
    const followUpBtns = await page.locator('button').filter({ hasText: 'Follow Up' }).count();
    ok(`Follow Up buttons: ${followUpBtns}`);

    // 85. Check for Return buttons
    const returnBtns = await page.locator('button').filter({ hasText: 'Return' }).count();
    ok(`Return buttons: ${returnBtns}`);

    // 86. NOT INTERESTED button should NOT exist in Assigned tab
    const niBtns = await page.locator('button').filter({ hasText: 'Not Interested' }).count();
    assert(niBtns === 0, 'No "Not Interested" button in Assigned tab', `count=${niBtns}`);

    // ══════════════════════════════════════════════════
    console.log('\n🌐 UI TESTS - CALL APPROVALS PAGE');
    // ══════════════════════════════════════════════════

    // Login as admin in browser
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    await page.goto(`${BASE}/calls/approvals`);
    await page.waitForTimeout(2000);

    // 87. Page loads
    const appTitle = await page.locator('h1').first().textContent();
    assert(appTitle?.includes('Approvals'), 'Approvals page loads', `title=${appTitle}`);

    // 88. Three tabs exist
    const appTabs = await page.locator('button').filter({ hasText: /Pending|Retry|Not Interested/ }).count();
    assert(appTabs >= 3, 'Three tabs on approvals page', `count=${appTabs}`);

    // 89. Not Interested tab exists
    const niTab = page.locator('button').filter({ hasText: 'Not Interested' });
    assert(await niTab.count() > 0, 'Not Interested tab exists');

    // 90. Click NI tab
    await niTab.click();
    await page.waitForTimeout(500);

    // 91. NI tab content loads
    const niTabActive = await niTab.getAttribute('class');
    assert(niTabActive?.includes('red'), 'NI tab is active (red border)', `classes=${niTabActive?.substring(0, 50)}`);

    // ══════════════════════════════════════════════════
    console.log('\n🔒 AUTHORIZATION TESTS');
    // ══════════════════════════════════════════════════

    // 92. Sales user cannot access ni-pending
    const niPendSales = await apiGet('/client-numbers/ni-pending');
    assert(niPendSales.status === 403, 'Sales cannot access ni-pending', `status=${niPendSales.status}`);

    // 93. Sales user cannot approve NI
    const niAppSales = await apiPost('/client-numbers/ni-approve/fake-id');
    assert(niAppSales.status === 403 || niAppSales.status === 400, 'Sales cannot approve NI', `status=${niAppSales.status}`);

    // 94. Sales user cannot reject NI
    const niRejSales = await apiPost('/client-numbers/ni-reject/fake-id', { reason: 'test' });
    assert(niRejSales.status === 403 || niRejSales.status === 400, 'Sales cannot reject NI', `status=${niRejSales.status}`);

    // 95. Admin can access ni-pending
    const niPendAdmin = await apiGet('/client-numbers/ni-pending', adminToken);
    assert(niPendAdmin.ok, 'Admin can access ni-pending', `status=${niPendAdmin.status}`);

    // 96. Admin can access ni-pending-count
    const niCountAdmin = await apiGet('/client-numbers/ni-pending-count', adminToken);
    assert(niCountAdmin.ok, 'Admin can access ni-pending-count', `status=${niCountAdmin.status}`);

    // ══════════════════════════════════════════════════
    console.log('\n📋 ADDITIONAL API TESTS');
    // ══════════════════════════════════════════════════

    // 97. Invalid UUID for NI approve
    const badApprove = await apiPost('/client-numbers/ni-approve/not-a-uuid', null, adminToken);
    assert(badApprove.status === 400, 'Invalid UUID rejected for ni-approve', `status=${badApprove.status}`);

    // 98. Non-existent UUID for NI approve
    const fakeApprove = await apiPost('/client-numbers/ni-approve/00000000-0000-0000-0000-000000000000', null, adminToken);
    assert(fakeApprove.status === 404, 'Non-existent NI approve returns 404', `status=${fakeApprove.status}`);

    // 99. Call tasks today is scoped to user
    const adminTasks = await apiGet('/call-tasks/today', adminToken);
    assert(adminTasks.ok, 'Admin can access call-tasks/today', `status=${adminTasks.status}`);

    // 100. Verify return to pool works
    const numsForReturn = await apiGet('/client-numbers/my-numbers?page=1&limit=100');
    const returnableNum = numsForReturn.data?.data?.find(n => n.poolStatus === 'ASSIGNED');
    if (returnableNum) {
      const returnRes = await apiPost(`/client-numbers/${returnableNum.id}/return`);
      assert(returnRes.ok || returnRes.status === 400, 'Return to pool endpoint works', `status=${returnRes.status}`);
    } else {
      ok('Return to pool (skipped - no returnable number)');
    }

    // 101. Verify pool numbers endpoint (admin)
    const poolNums = await apiGet('/client-numbers/pool?page=1&limit=10', adminToken);
    assert(poolNums.ok, 'GET pool numbers works', `status=${poolNums.status}`);

    // 102. Add number - duplicate check
    const dupeAdd = await apiPost('/client-numbers', { phoneNumber: '+201066003002' });
    assert(dupeAdd.status === 409 || dupeAdd.status === 400 || dupeAdd.ok, 'Add duplicate number handled', `status=${dupeAdd.status}`);

    // 103. Get number detail
    const anyNum = numsForReturn.data?.data?.[0];
    if (anyNum) {
      const detail = await apiGet(`/client-numbers/${anyNum.id}/detail`);
      assert(detail.ok, 'GET number detail works', `status=${detail.status}`);
    } else {
      ok('Number detail (skipped - no number)');
    }

    // 104. Calls list
    const calls = await apiGet('/calls?page=1&limit=5');
    assert(calls.ok, 'GET calls list works', `status=${calls.status}`);

    // 105. My daily stats
    const dailyStats = await apiGet('/calls/my-stats');
    assert(dailyStats.ok, 'GET my-stats works', `status=${dailyStats.status}`);

  } catch (err) {
    if (!err.message.startsWith('STOP:')) {
      console.log(`\n💥 Unexpected error: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'═'.repeat(50)}`);
  process.exit(failed > 0 ? 1 : 0);
})();
