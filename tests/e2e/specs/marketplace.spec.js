import { test, expect } from '@playwright/test';

const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

test.describe('Rewards Marketplace & Voucher Flow', () => {
  test('loads the catalog and records a purchase using the API-issued voucher code', async ({ page }) => {
    let points = 300;
    let redemptions = [];
    const item = { id: '3f9e9dd0-59d7-4cb1-9f50-39fc7551d42c', title: 'สมุดบันทึกรักษ์โลก', description: 'สมุดจากกระดาษรีไซเคิล', cost: 150, stock: 20, imageUrl: '' };
    await page.route('**/api/auth/me', (route) => json(route, { success: true, data: { id: 'student-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', points, totalCo2Saved: 0 } }));
    await page.route('**/api/marketplace/items', (route) => json(route, { success: true, data: [item] }));
    await page.route('**/api/marketplace/redemptions', (route) => json(route, { success: true, data: redemptions }));
    await page.route('**/api/marketplace/purchase', async (route) => {
      points = 150;
      const redemption = { id: 'redemption-1', title: item.title, costAtPurchase: 150, redemptionCode: 'SR-ABC1-DE23', status: 'PENDING', createdAt: '2026-11-04T04:00:00.000Z' };
      redemptions = [{ id: redemption.id, rewardTitle: item.title, rewardDescription: item.description, costAtPurchase: 150, redemptionCode: redemption.redemptionCode, status: 'PENDING', createdAt: redemption.createdAt }];
      await json(route, { success: true, data: { redemption, remainingPoints: points, message: 'แลกรางวัลแล้ว' } }, 201);
    });

    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'ร้านค้าสวัสดิการ' })).toBeVisible();
    await expect(page.getByText('สมุดบันทึกรักษ์โลก')).toBeVisible();
    await expect(page.getByRole('button', { name: 'แลกรางวัล' })).toBeEnabled();
    await page.getByRole('button', { name: 'แลกรางวัล' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'ยืนยันแลก' }).click();
    await expect(page.getByRole('status').getByText('SR-ABC1-DE23')).toBeVisible();
    await page.getByRole('button', { name: /คูปองของฉัน/ }).click();
    await expect(page.getByRole('article').getByText('SR-ABC1-DE23')).toBeVisible();
  });
});
