import { test, expect } from '@playwright/test';

test.describe('TTB Label Verifier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main page correctly', async ({ page }) => {
    // Check header is present
    await expect(page.getByText('TTB Label Verifier')).toBeVisible();
    
    // Check single/batch toggle buttons
    await expect(page.getByRole('button', { name: 'Single' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batch' })).toBeVisible();
    
    // Check verify button is present (but may be disabled initially)
    await expect(page.getByRole('button', { name: 'Verify Label' })).toBeVisible();
  });

  test('should show application form fields', async ({ page }) => {
    // Check beverage type selector
    await expect(page.getByRole('button', { name: 'Wine' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Beer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spirits' })).toBeVisible();
    
    // Check form fields
    await expect(page.getByPlaceholder('e.g., OLD TOM DISTILLERY')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., 45% Alc./Vol.')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., 750 mL')).toBeVisible();
  });

  test('should toggle between single and batch modes', async ({ page }) => {
    // Start in single mode
    await expect(page.getByRole('button', { name: 'Single' })).toBeVisible();
    
    // Click batch button
    await page.getByRole('button', { name: 'Batch' }).click();
    
    // Check batch upload interface appears
    await expect(page.getByText('Batch Label Verification')).toBeVisible();
    await expect(page.getByText('Drag & drop multiple label images')).toBeVisible();
    
    // Click back to single
    await page.getByRole('button', { name: 'Single' }).click();
    
    // Check single mode interface appears
    await expect(page.getByText('Step 1: Upload Label Image')).toBeVisible();
  });

  test('should fill out application form', async ({ page }) => {
    // Fill brand name
    await page.getByPlaceholder('e.g., OLD TOM DISTILLERY').fill('TEST BRAND');
    
    // Fill class/type
    await page.getByPlaceholder('e.g., Kentucky Straight Bourbon Whiskey').fill('Bourbon Whiskey');
    
    // Fill alcohol content
    await page.getByPlaceholder('e.g., 45% Alc./Vol.').fill('45% Alc./Vol.');
    
    // Fill net contents
    await page.getByPlaceholder('e.g., 750 mL').fill('750 mL');
    
    // Fill producer name
    await page.getByPlaceholder('e.g., Old Tom Distilling Co.').fill('Test Distillery');
    
    // Fill producer address
    await page.getByPlaceholder('e.g., Louisville, KY').fill('Test City, ST');
    
    // Verify fields are filled
    await expect(page.getByPlaceholder('e.g., OLD TOM DISTILLERY')).toHaveValue('TEST BRAND');
    await expect(page.getByPlaceholder('e.g., 45% Alc./Vol.')).toHaveValue('45% Alc./Vol.');
  });

  test('should select different beverage types', async ({ page }) => {
    // Select Wine
    await page.getByRole('button', { name: 'Wine' }).click();
    
    // Check wine-specific fields appear
    await expect(page.getByText('Wine Details')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., 2019')).toBeVisible(); // Vintage year
    await expect(page.getByPlaceholder('e.g., Napa Valley')).toBeVisible(); // Appellation
    
    // Select Beer
    await page.getByRole('button', { name: 'Beer' }).click();
    
    // Wine-specific fields should be hidden
    await expect(page.getByText('Wine Details')).not.toBeVisible();
    
    // Select Spirits
    await page.getByRole('button', { name: 'Spirits' }).click();
    
    // Proof field should be visible for spirits
    await expect(page.getByPlaceholder('e.g., 90 Proof')).toBeVisible();
  });

  test('should display error when verifying without image', async ({ page }) => {
    // Fill some form data
    await page.getByPlaceholder('e.g., OLD TOM DISTILLERY').fill('TEST BRAND');
    await page.getByPlaceholder('e.g., 45% Alc./Vol.').fill('45%');
    
    // Try to verify without uploading an image
    await page.getByRole('button', { name: 'Verify Label' }).click();
    
    // Should show error message
    await expect(page.getByText('Please upload a label image')).toBeVisible();
  });

  test('should show dropzone for image upload', async ({ page }) => {
    // Check dropzone is visible
    await expect(page.getByText('Drag & drop label image')).toBeVisible();
    await expect(page.getByText('or browse files')).toBeVisible();
    await expect(page.getByText('Supports JPG, PNG, WebP')).toBeVisible();
  });

  test('should have accessible form elements', async ({ page }) => {
    // Check that form inputs have proper labels
    const brandNameInput = page.getByPlaceholder('e.g., OLD TOM DISTILLERY');
    await expect(brandNameInput).toBeEnabled();
    
    const alcoholInput = page.getByPlaceholder('e.g., 45% Alc./Vol.');
    await expect(alcoholInput).toBeEnabled();
    
    // Check that buttons are accessible
    const verifyButton = page.getByRole('button', { name: 'Verify Label' });
    await expect(verifyButton).toBeVisible();
  });

  test('batch mode should show upload interface', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch' }).click();
    
    // Check batch-specific elements
    await expect(page.getByText('Drag & drop multiple label images')).toBeVisible();
    await expect(page.getByText('Upload up to 50 labels at once')).toBeVisible();
    
    // Check shared data toggle option is not visible until images are uploaded
    await expect(page.getByText('Use same application data for all labels')).not.toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/TTB Label Verifier/);
  });

  test('footer should be visible', async ({ page }) => {
    // Check footer content
    await expect(page.getByText('Prototype for TTB label compliance verification')).toBeVisible();
    await expect(page.getByText('AI-Powered by OpenAI GPT-4 Vision')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Main elements should still be visible
    await expect(page.getByText('TTB Label Verifier')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify Label' })).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // All main elements should be visible
    await expect(page.getByText('TTB Label Verifier')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Single' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batch' })).toBeVisible();
  });
});

test.describe('API Health Check', () => {
  test('should have healthy verify endpoint', async ({ request }) => {
    const response = await request.get('/api/verify');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('TTB Label Verification API');
  });
});

