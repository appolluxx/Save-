import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sampleImage = await readFile(fileURLToPath(new URL('../../../apps/web/public/assets/figma/sample-bottles-vision.jpg', import.meta.url)));

test.describe('AI Waste Scanner & Bin Advisor', () => {
  test('shows sample as unanalysed and waits for a real image selection', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
    await page.goto('/vision');
    await expect(page.getByRole('heading', { name: 'สแกนก่อนทิ้ง' })).toBeVisible();
    await expect(page.getByText('ภาพตัวอย่าง · ยังไม่วิเคราะห์')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ยังไม่มีผลวิเคราะห์' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'วิเคราะห์ภาพ' })).toBeDisabled();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('uploads the selected photo and renders the API analysis response', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
    let receivedImage = false;
    await page.route('**/api/actions/scan-preview', async (route) => {
      receivedImage = route.request().postDataBuffer()?.length > 0;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { isValid: true, detectedCategory: 'RECYCLE_PET', confidence: 0.94, detectedObjects: ['ขวด PET'], thaiSummary: 'เทน้ำออกและบีบขวดก่อนทิ้ง', recommendedBinColor: 'YELLOW' } }) });
    });
    await page.goto('/vision');
    await page.locator('input[type="file"]').setInputFiles({ name: 'bottle.jpg', mimeType: 'image/jpeg', buffer: sampleImage });
    await page.getByRole('button', { name: 'วิเคราะห์ภาพ' }).click();
    await expect(page.getByRole('heading', { name: 'RECYCLE_PET' })).toBeVisible();
    await expect(page.getByText('เทน้ำออกและบีบขวดก่อนทิ้ง')).toBeVisible();
    await expect(page.getByText(/94% มั่นใจ/)).toBeVisible();
    expect(receivedImage).toBe(true);
  });

  test('does not invent a bin recommendation when the service queues manual review', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
    await page.route('**/api/actions/scan-preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { isValid: true, detectedCategory: 'MANUAL_REVIEW', confidence: 0.5, detectedObjects: ['unverified photo'], thaiSummary: 'ระบบกำลังจัดคิวให้เจ้าหน้าที่ตรวจสอบภาพถ่าย', recommendedBinColor: 'YELLOW' } }) }));
    await page.goto('/vision');
    await page.locator('input[type="file"]').setInputFiles({ name: 'uncertain.jpg', mimeType: 'image/jpeg', buffer: sampleImage });
    await page.getByRole('button', { name: 'วิเคราะห์ภาพ' }).click();
    await expect(page.getByRole('heading', { name: 'ยังจำแนกไม่ได้' })).toBeVisible();
    await expect(page.getByText('ระบบยังให้คำแนะนำถังจากภาพนี้ไม่ได้')).toBeVisible();
    await expect(page.getByText('ถังที่แนะนำ')).toHaveCount(0);
  });
});
