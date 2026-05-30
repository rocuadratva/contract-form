const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://roctechva.cloud/contract-form';

const TEST_DATA = {
  full_name:       'Test Tenant Raph',
  email:           'raphaelocuadra@gmail.com',
  phone:           '+63 900 123 4567',
  property_address:'123 Rizal St., Quezon City',
  unit:            'Unit 2B',
  lease_start:     '2026-06-01',
  lease_end:       '2027-05-31',
  emergency_name:  'Maria Cuadra',
  emergency_phone: '+63 900 987 6543',
};

test.describe('Contract Intake Form', () => {

  test('page loads with correct elements', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Lease Agreement/i);
    await expect(page.locator('.gold-bar')).toBeVisible();
    await expect(page.locator('.hero-title')).toBeVisible();
    await expect(page.locator('#intake-form')).toBeVisible();
    await expect(page.locator('[name="full_name"]')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="phone"]')).toBeVisible();
    await expect(page.locator('[name="property_address"]')).toBeVisible();
    await expect(page.locator('[name="unit"]')).toBeVisible();
    await expect(page.locator('[name="lease_start"]')).toBeVisible();
    await expect(page.locator('[name="lease_end"]')).toBeVisible();
    await expect(page.locator('[name="emergency_name"]')).toBeVisible();
    await expect(page.locator('[name="emergency_phone"]')).toBeVisible();
  });

  test('shows validation errors when submitted empty', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('.btn-submit').click();
    await expect(page.locator('#err_full_name')).toBeVisible();
    await expect(page.locator('#err_email')).toBeVisible();
    await expect(page.locator('#err_phone')).toBeVisible();
    // page should NOT redirect
    await expect(page).toHaveURL(new RegExp(BASE_URL));
  });

  test('validates email format', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('[name="full_name"]', 'Test User');
    await page.fill('[name="email"]', 'not-an-email');
    await page.locator('[name="email"]').blur();
    await expect(page.locator('#err_email')).toBeVisible();
  });

  test('validates lease end date is after start date', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('[name="lease_start"]', '2026-06-01');
    await page.fill('[name="lease_end"]', '2026-05-01');
    await page.locator('[name="lease_end"]').blur();
    await expect(page.locator('#err_lease_end')).toBeVisible();
  });

  test('submits successfully and redirects to success page', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.fill('[name="full_name"]',        TEST_DATA.full_name);
    await page.fill('[name="email"]',            TEST_DATA.email);
    await page.fill('[name="phone"]',            TEST_DATA.phone);
    await page.fill('[name="property_address"]', TEST_DATA.property_address);
    await page.fill('[name="unit"]',             TEST_DATA.unit);
    await page.fill('[name="lease_start"]',      TEST_DATA.lease_start);
    await page.fill('[name="lease_end"]',        TEST_DATA.lease_end);
    await page.fill('[name="emergency_name"]',   TEST_DATA.emergency_name);
    await page.fill('[name="emergency_phone"]',  TEST_DATA.emergency_phone);

    await page.locator('.btn-submit').click();

    // wait up to 15s for n8n webhook to respond and redirect
    await expect(page).toHaveURL(/success\.html/, { timeout: 15000 });
    await expect(page.locator('.hero-title')).toContainText('Thank');
  });

});
