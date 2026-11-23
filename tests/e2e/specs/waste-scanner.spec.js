import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sampleImage = await readFile(fileURLToPath(new URL('../../../apps/web/public/assets/figma/sample-bottles-vision.jpg', import.meta.url)));

async function mockStudent(page) {
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'student-1', role: 'STUDENT', displayName: 'นักเรียนตัวอย่าง', studentId: '53580', points: 10, totalCo2Saved: 0 } }),
  }));
}

test.describe('Combined AI waste scan and activity logging', () => {
  test('redirects the old scanner address to the camera-only combined screen', async ({ page }) => {
    await mockStudent(page);
    await page.goto('/vision');

    await expect(page).toHaveURL(/submit/);
    await expect(page.getByRole('heading', { name: 'สแกนและบันทึกขยะ' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'เปิดกล้องถ่ายรูปขยะ' })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveAttribute('capture', 'environment');
    await expect(page.getByRole('button', { name: 'วิเคราะห์ภาพ' })).toHaveCount(0);
  });

  test('automatically analyzes and records the photo, then shows the result', async ({ page }) => {
    await mockStudent(page);
    let requestCount = 0;
    let sentImageOnly = false;
    await page.route('**/api/actions', async (route) => {
      requestCount += 1;
      const body = route.request().postDataBuffer();
      sentImageOnly = Boolean(body?.includes(Buffer.from('name="image"')) && !body.includes(Buffer.from('name="type"')));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            action: { id: 'action-new', type: 'RECYCLE_PET', status: 'PENDING', pointsAwarded: 0, co2SavedKg: 0, createdAt: '2026-11-23T04:00:00.000Z' },
            analysis: { isValid: true, detectedCategory: 'RECYCLE_PET', confidence: 0.98, detectedObjects: ['ขวด PET'], thaiSummary: 'เทน้ำออกและบีบขวดก่อนทิ้ง', recommendedBinColor: 'YELLOW' },
            verdict: 'PENDING',
            message: 'ส่งเข้าคิวรอตรวจแล้ว',
          },
        }),
      });
    });

    await page.goto('/submit');
    await page.locator('input[type="file"]').setInputFiles({ name: 'bottle.jpg', mimeType: 'image/jpeg', buffer: sampleImage });

    await expect(page.getByText('แยกขยะขวดพลาสติก PET')).toBeVisible();
    await expect(page.getByText('เทน้ำออกและบีบขวดก่อนทิ้ง')).toBeVisible();
    await expect(page.getByText('ความมั่นใจของ AI 98%')).toBeVisible();
    await expect(page.getByText('สถานะ: รอตรวจ · 0 แต้ม')).toBeVisible();
    await expect(page.getByText('ถังขยะรีไซเคิล')).toBeVisible();
    expect(requestCount).toBe(1);
    expect(sentImageOnly).toBe(true);
  });

  test('shows an honest manual-review result without inventing a bin', async ({ page }) => {
    await mockStudent(page);
    await page.route('**/api/actions', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          action: null,
          analysis: { isValid: true, detectedCategory: 'MANUAL_REVIEW', confidence: 0.5, detectedObjects: ['unverified photo'], thaiSummary: 'ระบบยังเชื่อมต่อ AI วิเคราะห์ภาพไม่ได้ กรุณาลองใหม่ภายหลัง', recommendedBinColor: null },
          verdict: 'SORTED_ONLY',
          message: 'AI ยังจำแนกภาพนี้ไม่ได้ จึงยังไม่บันทึกภารกิจหรือคะแนน',
        },
      }),
    }));

    await page.goto('/submit');
    await page.locator('input[type="file"]').setInputFiles({ name: 'uncertain.jpg', mimeType: 'image/jpeg', buffer: sampleImage });

    await expect(page.getByText('ยังจำแนกประเภทไม่ได้', { exact: true })).toBeVisible();
    await expect(page.getByText('ระบบยังเชื่อมต่อ AI วิเคราะห์ภาพไม่ได้ กรุณาลองใหม่ภายหลัง', { exact: true })).toBeVisible();
    await expect(page.getByText('ถังที่แนะนำ')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'ดูประวัติ' })).toHaveCount(0);
  });
});
