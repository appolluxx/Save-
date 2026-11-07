import { test, expect } from '@playwright/test';

async function mockFeedData(page) {
  await page.route('**/api/actions*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { actions: [{
      id: 'action-walk-1', type: 'COMMUTE_WALK', pointsAwarded: 25, co2SavedKg: 0.5,
      aiSummaryThai: 'เดินทางมาโรงเรียนด้วยการเดิน', createdAt: '2026-10-29T02:15:00.000Z',
      user: { id: 'student-1', displayName: 'นักเรียนตัวอย่าง', gradeLevel: '3', classroom: '2' },
    }], pagination: { page: 1, limit: 5, total: 1, totalPages: 1 } } }),
  }));
  await page.route('**/api/leaderboard**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { leaderboard: [], schoolStats: { totalStudents: 1, totalPointsEarned: 250, totalCo2SavedKg: 0.5 } } }),
  }));
}

async function mockStudent(page) {
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'std-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', points: 250, totalCo2Saved: 0 } }),
  }));
}

test.describe('Navigation & Responsive Layout', () => {
  test('shows verified school activity data and shortcuts', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await mockFeedData(page);
    await mockStudent(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'พื้นที่รักษ์โลก' })).toBeVisible();
    await expect(page.getByText('นักเรียนตัวอย่าง').last()).toBeVisible();
    await expect(page.getByText('เดินมาโรงเรียน').first()).toBeVisible();
    await expect(page.getByText('เดินทางมาโรงเรียนด้วยการเดิน')).toBeVisible();
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'สแกนขยะ' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'บันทึกภารกิจ' }).first()).toBeVisible();

    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    }
    expect(runtimeErrors).toEqual([]);
  });

  test('main navigation opens scanner, leaderboard, and map screens', async ({ page }) => {
    await mockFeedData(page);
    await mockStudent(page);
    await page.route('**/api/pins', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }));
    await page.goto('/');
    await page.getByRole('link', { name: 'สแกนขยะ' }).first().click();
    await expect(page).toHaveURL(/vision/);
    await expect(page.getByRole('heading', { name: 'สแกนก่อนทิ้ง' })).toBeVisible();

    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { name: 'กระดานผู้นำ' })).toBeVisible();
    await expect(page.getByText('คะแนนหมุนเวียน')).toBeVisible();

    await page.goto('/map');
    await expect(page.getByRole('heading', { name: 'จุดรายงานในโรงเรียน' })).toBeVisible();
    await expect(page.getByText('ยังไม่มีรายงานที่เปิดอยู่')).toBeVisible();
  });

  test('bottom navigation has five mobile destinations with usable touch targets', async ({ page }) => {
    await mockStudent(page);
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });
    const links = page.getByRole('navigation', { name: 'แถบเมนูหลักบนมือถือและแท็บเล็ต' }).getByRole('link');
    await expect(links).toHaveCount(5);
    const sizes = await links.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('submits one real evidence file and displays the server verdict', async ({ page }) => {
    await mockStudent(page);
    let uploaded = false;
    await page.route('**/api/actions', async (route) => {
      const body = route.request().postDataBuffer();
      uploaded = Boolean(body?.length && body.includes(Buffer.from('image')));
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { action: { id: 'action-new', type: 'RECYCLE_PET', status: 'PENDING', pointsAwarded: 0, co2SavedKg: 0, createdAt: '2026-11-04T04:00:00.000Z' }, verdict: 'PENDING', message: 'ส่งเข้าคิวรอตรวจแล้ว' } }) });
    });
    await page.goto('/submit');
    await page.locator('input[type="file"]').setInputFiles({ name: 'evidence.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
    await page.getByPlaceholder(/อธิบายสิ่งที่ทำ/).fill('แยกขวดที่จุดรีไซเคิล');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'ส่งหลักฐาน' }).click();
    await expect(page.getByText('สถานะ: PENDING · 0 แต้ม')).toBeVisible();
    await expect(page.getByText('สถานะ: PENDING · 0 แต้ม')).toBeVisible();
    expect(uploaded).toBe(true);
  });

  test('reports a map issue only after attaching the device coordinates', async ({ page }) => {
    await mockStudent(page);
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 13.8082, longitude: 100.5581 });
    const pins = [];
    await page.route('**/api/pins', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        expect(payload).toMatchObject({ type: 'FULL_BIN', description: 'ถังเต็มหน้าอาคาร' });
        expect(payload.latitude).toBeCloseTo(13.8082, 3);
        pins.push({ id: 'pin-1', type: payload.type, description: payload.description, latitude: payload.latitude, longitude: payload.longitude, status: 'OPEN', createdAt: '2026-11-04T04:00:00.000Z' });
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: pins[0], message: 'รับรายงานแล้ว' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: pins }) });
      }
    });
    await page.goto('/map');
    await page.getByLabel('รายละเอียด').fill('ถังเต็มหน้าอาคาร');
    await page.getByRole('button', { name: 'ระบุตำแหน่ง' }).click();
    await expect(page.getByText(/13\.80820, 100\.55810/)).toBeVisible();
    await page.getByRole('button', { name: 'ส่งรายงาน' }).click();
    await expect(page.getByText('ถังเต็มหน้าอาคาร')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ถังขยะเต็ม' })).toBeVisible();
  });

  test('shows profile totals and history returned by account endpoints', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'std-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', email: 'student@example.com', points: 125, totalCo2Saved: 2.4, gradeLevel: '3', classroom: '2', badges: [] } }) }));
    await page.route('**/api/actions/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [{ id: 'act-1', type: 'RECYCLE_PET', status: 'APPROVED', pointsAwarded: 10, co2SavedKg: 0.045, createdAt: '2026-11-04T04:00:00.000Z' }] }) }));
    await page.route('**/api/marketplace/redemptions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }));
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'โปรไฟล์ของฉัน' })).toBeVisible();
    await expect(page.getByText('นักเรียนตัวอย่าง').last()).toBeVisible();
    await expect(page.getByText('2.4', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('แยกขยะขวดพลาสติก PET')).toBeVisible();
    await expect(page.getByText(/อนุมัติแล้ว ·/)).toBeVisible();
  });
});
