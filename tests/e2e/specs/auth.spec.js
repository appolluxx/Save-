import { test, expect } from '@playwright/test';

const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

test.describe('Authentication & Identity Flows', () => {
  test('shows blank credentials and signs in only after the API accepts them', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => json(route, { success: false }, 401));
    await page.route('**/api/auth/login', (route) => json(route, { success: true, data: { user: { id: 'student-1', role: 'STUDENT', displayName: 'นักเรียนจริง', studentId: '53580', points: 10 } } }));
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบนักเรียน' })).toBeVisible();
    await expect(page.getByPlaceholder('เลขประจำตัวหรืออีเมล')).toHaveValue('');
    await expect(page.getByPlaceholder('กรอกรหัสผ่าน')).toHaveValue('');
    await page.getByLabel('เลขประจำตัว / อีเมล').fill('53580');
    await page.getByRole('textbox', { name: 'รหัสผ่าน' }).fill('Green1234');
    await page.getByLabel(/ฉันยืนยันว่าได้อ่าน/).check();
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'พื้นที่รักษ์โลก' })).toBeVisible();
  });

  test('verifies a student roster record before creating the account', async ({ page }) => {
    let verifyCalled = false;
    await page.route('**/api/auth/me', (route) => json(route, { success: false }, 401));
    await page.route('**/api/auth/verify-student', async (route) => { verifyCalled = true; await json(route, { success: true, data: { valid: true, studentId: '53580' } }); });
    await page.route('**/api/auth/register/student', async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ studentId: '53580', displayName: 'นักเรียนใหม่' });
      await json(route, { success: true, data: { user: { id: 'student-new', role: 'STUDENT', displayName: 'นักเรียนใหม่', studentId: '53580', points: 0 } } }, 201);
    });

    await page.goto('/login?role=student');
    await page.getByRole('button', { name: 'ลงทะเบียน', exact: true }).click();
    await page.getByLabel('ชื่อและนามสกุล').fill('นักเรียนใหม่');
    await page.getByLabel('เลขประจำตัวนักเรียน 5 หลัก').fill('53580');
    await page.getByPlaceholder('อย่างน้อย 8 ตัวอักษร').fill('Green1234');
    await page.getByLabel(/ฉันยืนยันว่าได้อ่าน/).check();
    await page.getByRole('button', { name: 'สร้างบัญชี' }).click();
    await expect(page).toHaveURL('/');
    expect(verifyCalled).toBe(true);
  });

  test('staff registration requires a real invite code field', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => json(route, { success: false }, 401));
    await page.route('**/api/auth/register/staff', (route) => json(route, { success: true, data: { user: { id: 'staff-1', role: 'STAFF', displayName: 'ครูใหม่', email: 'teacher@example.com' } } }, 201));
    await page.goto('/login?role=staff&mode=register');
    await expect(page.getByLabel('รหัสเชิญเจ้าหน้าที่')).toBeVisible();
    await page.getByLabel('ชื่อและนามสกุล').fill('ครูใหม่');
    await page.getByLabel('อีเมลเจ้าหน้าที่').fill('teacher@example.com');
    await page.getByLabel('รหัสเชิญเจ้าหน้าที่').fill('INVITE-CODE-FROM-ADMIN');
    await page.getByPlaceholder('อย่างน้อย 8 ตัวอักษร').fill('Green1234');
    await page.getByLabel(/ฉันยืนยันว่าได้อ่าน/).check();
    await page.getByRole('button', { name: 'สร้างบัญชี' }).click();
    await expect(page).toHaveURL('/admin');
  });
});
