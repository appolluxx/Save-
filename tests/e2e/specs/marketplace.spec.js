import { test, expect } from '@playwright/test';

const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const krathongProgress = (petCount, canCount) => ({
  success: true,
  data: {
    materials: {
      PET: { approvedCount: petCount, pendingCount: 0, requiredCount: 10, remainingCount: Math.max(0, 10 - petCount), eligible: petCount >= 10 },
      CAN: { approvedCount: canCount, pendingCount: 0, requiredCount: 5, remainingCount: Math.max(0, 5 - canCount), eligible: canCount >= 5 },
    },
  },
});

test.describe('Rewards Marketplace & Voucher Flow', () => {
  test('loads the catalog and records a purchase using the API-issued voucher code', async ({ page }) => {
    let points = 300;
    let redemptions = [];
    const item = { id: '3f9e9dd0-59d7-4cb1-9f50-39fc7551d42c', title: 'สมุดบันทึกรักษ์โลก', description: 'สมุดจากกระดาษรีไซเคิล', cost: 150, stock: 20, imageUrl: '' };
    await page.route('**/api/auth/me', (route) => json(route, { success: true, data: { id: 'student-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', points, totalCo2Saved: 0 } }));
    await page.route('**/api/marketplace/items', (route) => json(route, { success: true, data: [item] }));
    await page.route('**/api/marketplace/redemptions', (route) => json(route, { success: true, data: redemptions }));
    await page.route('**/api/marketplace/krathong/progress', (route) => json(route, krathongProgress(0, 0)));
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

  test('hides a legacy Krathong code until its material requirement is met', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => json(route, { success: true, data: { id: 'student-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', points: 0, totalCo2Saved: 0 } }));
    await page.route('**/api/marketplace/items', (route) => json(route, { success: true, data: [] }));
    await page.route('**/api/marketplace/redemptions', (route) => json(route, {
      success: true,
      data: [{
        id: 'legacy-event-redemption',
        eventKey: 'krathong-2026',
        isEvent: true,
        materialType: 'PET',
        materialRequirement: 'PET 10 ขวด · ต้องล้างสะอาดและบีบแบน',
        rewardTitle: 'สิทธิ์แลกกระทงรักษ์โลก',
        rewardDescription: 'PET 10 ขวด · จำกัด 1 ใบต่อท่าน',
        redemptionCode: 'KT-LEGACY-ONLY',
        status: 'PENDING',
        claimedAt: null,
        createdAt: '2026-11-04T04:00:00.000Z',
      }],
    }));
    await page.route('**/api/marketplace/krathong/progress', (route) => json(route, krathongProgress(2, 0)));

    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'ร้านค้าสวัสดิการ' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'ความคืบหน้า PET' })).toHaveAttribute('aria-valuenow', '2');
    await expect(page.getByText('KT-LEGACY-ONLY', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /คูปองของฉัน/ }).click();
    await expect(page.getByText('KT-LEGACY-ONLY', { exact: true })).toHaveCount(0);
  });

  test('keeps an earned Krathong code available in My Vouchers', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => json(route, { success: true, data: { id: 'student-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', points: 0, totalCo2Saved: 0 } }));
    await page.route('**/api/marketplace/items', (route) => json(route, { success: true, data: [] }));
    await page.route('**/api/marketplace/redemptions', (route) => json(route, {
      success: true,
      data: [{
        id: 'earned-event-redemption',
        eventKey: 'krathong-2026',
        isEvent: true,
        materialType: 'PET',
        materialRequirement: 'PET 10 ขวด · ต้องล้างสะอาดและบีบแบน',
        rewardTitle: 'สิทธิ์แลกกระทงรักษ์โลก',
        rewardDescription: 'PET 10 ขวด · จำกัด 1 ใบต่อท่าน',
        redemptionCode: 'KT-EARNED-ONLY',
        status: 'PENDING',
        claimedAt: null,
        createdAt: '2026-11-04T04:00:00.000Z',
      }],
    }));
    await page.route('**/api/marketplace/krathong/progress', (route) => json(route, krathongProgress(10, 0)));

    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'ร้านค้าสวัสดิการ' })).toBeVisible();
    await expect(page.getByText('KT-EARNED-ONLY', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /คูปองของฉัน/ }).click();
    await expect(page.getByRole('article').getByText('KT-EARNED-ONLY')).toBeVisible();
  });
});
