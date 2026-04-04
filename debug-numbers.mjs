import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
const API = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Login via API to get token
  console.log('--- Logging in via API ---');
  const loginRes = await page.request.post(`${API}/auth/login`, {
    data: { email: 'ola@brightc0de.com', password: 'Ola@Ola@2025@2026' },
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status());
  if (!loginRes.ok()) {
    console.log('Login failed:', JSON.stringify(loginData));
    await browser.close();
    process.exit(1);
  }
  const token = loginData.accessToken;
  console.log('Got token:', token ? token.substring(0, 20) + '...' : 'NONE');

  // 2. Check my-numbers API directly
  console.log('\n--- GET /client-numbers/my-numbers?page=1&limit=50 ---');
  const numbersRes = await page.request.get(`${API}/client-numbers/my-numbers?page=1&limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const numbersData = await numbersRes.json();
  console.log('Status:', numbersRes.status());
  console.log('Total:', numbersData.total);
  console.log('Data count:', numbersData.data?.length);
  if (numbersData.data?.length > 0) {
    for (const num of numbersData.data.slice(0, 5)) {
      console.log(`  - ${num.phoneNumber} | createdAt: ${num.createdAt} | updatedAt: ${num.updatedAt} | lastAttemptDate: ${num.lastAttemptDate} | poolStatus: ${num.poolStatus}`);
    }
  }

  // 3. Check needs-retry API
  console.log('\n--- GET /calls/needs-retry ---');
  const retryRes = await page.request.get(`${API}/calls/needs-retry`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const retryData = await retryRes.json();
  console.log('Status:', retryRes.status());
  console.log('Needs retry count:', retryData.length);
  if (retryData.length > 0) {
    for (const c of retryData) {
      console.log(`  - ${c.clientPhoneNumber} | createdAt: ${c.createdAt}`);
    }
  }

  // 4. Check call-tasks/today API
  console.log('\n--- GET /call-tasks/today ---');
  const tasksRes = await page.request.get(`${API}/call-tasks/today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tasksData = await tasksRes.json();
  console.log('Status:', tasksRes.status());
  console.log('Today tasks count:', tasksData.length);
  if (tasksData.length > 0) {
    for (const t of tasksData) {
      console.log(`  - ${t.clientPhoneNumber} | taskDate: ${t.taskDate} | taskTime: ${t.taskTime} | status: ${t.status} | source: ${t.source}`);
    }
  }

  // 5. Try pulling from pool
  console.log('\n--- POST /client-numbers/pull ---');
  const pullRes = await page.request.post(`${API}/client-numbers/pull`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Pull status:', pullRes.status());
  if (pullRes.ok()) {
    const pullData = await pullRes.json();
    console.log('Pulled:', pullData.phoneNumber, '| id:', pullData.id);

    // Re-check my-numbers after pull
    console.log('\n--- GET /client-numbers/my-numbers AFTER pull ---');
    const numbersRes2 = await page.request.get(`${API}/client-numbers/my-numbers?page=1&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const numbersData2 = await numbersRes2.json();
    console.log('Total after pull:', numbersData2.total);
    if (numbersData2.data?.length > 0) {
      for (const num of numbersData2.data.slice(0, 5)) {
        console.log(`  - ${num.phoneNumber} | updatedAt: ${num.updatedAt} | lastAttemptDate: ${num.lastAttemptDate}`);
      }
    }
  } else {
    const pullErr = await pullRes.json();
    console.log('Pull failed:', JSON.stringify(pullErr));
  }

  // 6. Now load the actual page and check what renders
  console.log('\n--- Loading page in browser ---');
  // Set the auth token in localStorage before navigating
  await page.goto(BASE);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
  }, token);

  await page.goto(`${BASE}/numbers`);
  await page.waitForTimeout(3000);

  // Check tab text
  const tabTexts = await page.locator('button').filter({ hasText: /Today|Assigned/ }).allTextContents();
  console.log('Tab texts:', tabTexts);

  // Check if "New Numbers" section exists
  const newNumbersSection = await page.locator('text=New Numbers').count();
  console.log('New Numbers section visible:', newNumbersSection > 0);

  // Check sections visible
  const sections = await page.locator('[class*="Card"] h3, [class*="card"] h3, .text-lg').allTextContents();
  console.log('Visible sections:', sections);

  await browser.close();
  console.log('\n--- Done ---');
})();
