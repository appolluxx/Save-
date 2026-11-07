import { test, expect } from '@playwright/test';

const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

test.describe('Admin & Staff Management Hub', () => {
  test('redirects unauthenticated users to real login form', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => json(route, { success: false, error: { message: 'Unauthenticated' } }, 401));
    await page.goto('/admin');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบนักเรียน' })).toBeVisible();
  });

  test('reviews a pending item, checks a voucher, and loads actual reports', async ({ page }) => {
    let queue = [{ id: 'action-1', type: 'RECYCLE_PET', status: 'PENDING', imageUrl: null, thumbnailUrl: null, createdAt: '2026-11-04T04:00:00.000Z', aiConfidence: 0.84, similarityScore: 0.1, aiSummaryThai: 'ภาพแสดงขวด PET', user: { id: 'student-1', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', gradeLevel: '3', classroom: '2' } }];
    let approved = false;
    await page.route('**/api/auth/me', (route) => json(route, { success: true, data: { id: 'admin-1', role: 'ADMIN', displayName: 'ผู้ดูแลระบบ', points: 0 } }));
    await page.route('**/api/admin/evidence', (route) => json(route, { success: true, data: queue }));
    await page.route('**/api/admin/evidence/action-1', async (route) => { approved = route.request().postDataJSON().status === 'APPROVED'; queue = []; await json(route, { success: true, data: { status: 'APPROVED' }, message: 'approved' }); });
    await page.route('**/api/admin/users*', (route) => json(route, { success: true, data: { users: [], pagination: { total: 0 } } }));
    await page.route('**/api/admin/reports', (route) => json(route, { success: true, data: { activeStudents: 85, totalPointsInCirculation: 3500, totalCo2SavedKg: 45.2, totalRewardsClaimed: 14, actionBreakdown: [{ type: 'RECYCLE_PET', status: 'APPROVED', count: 10 }] } }));
    await page.route('**/api/marketplace/redemptions/SR-ABC1-DE23/claim', (route) => json(route, { success: true, data: { rewardTitle: 'สมุด', studentName: 'นักเรียน' } }));

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'ศูนย์จัดการ' })).toBeVisible();
    await expect(page.getByText('หลักฐานรอตรวจ')).toBeVisible();
    await expect(page.getByText('ภาพแสดงขวด PET')).toBeVisible();
    await page.getByRole('button', { name: 'อนุมัติ' }).click();
    await expect(page.getByText('ไม่มีหลักฐานค้างตรวจ')).toBeVisible();
    expect(approved).toBe(true);

    await page.getByRole('button', { name: 'ตรวจคูปอง' }).click();
    await page.getByPlaceholder('SR-XXXX-XXXX').fill('SR-ABC1-DE23');
    await page.getByRole('button', { name: 'ยืนยันการรับ' }).click();
    await expect(page.getByText(/รับคูปอง สมุด/)).toBeVisible();

    await page.getByRole('button', { name: 'รายงาน' }).click();
    await expect(page.getByRole('heading', { name: 'ภาพรวมข้อมูลจริง' })).toBeVisible();
    await expect(page.getByText('45.2', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'นักเรียน', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'บัญชีผู้ใช้' })).toBeVisible();
  });
});
