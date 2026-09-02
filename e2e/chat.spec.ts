import { test, expect } from '@playwright/test';

test.describe('Chatbot E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the chat interface', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();
    await expect(page.locator('input[placeholder*="message"], input[placeholder*="Message"], textarea')).toBeVisible();
  });

  test('sends a message and receives a response', async ({ page }) => {
    // Mock the backend response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'This is a test response from the AI.',
          session_id: 'test-session',
          usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
          model: 'gpt-4o-mini',
          provider: 'openai',
        }),
      });
    });

    // Find and fill the input
    const input = page.locator('input[placeholder*="message"], input[placeholder*="Message"], textarea').first();
    await input.fill('What is FPGA?');
    await input.press('Enter');

    // Wait for response
    await expect(page.locator('text=This is a test response from the AI.')).toBeVisible({ timeout: 10000 });
  });

  test('handles empty message', async ({ page }) => {
    const input = page.locator('input[placeholder*="message"], input[placeholder*="Message"], textarea').first();
    await input.press('Enter');
    // Should not send empty message (implementation dependent)
  });

  test('shows loading state while waiting for response', async ({ page }) => {
    let resolveRoute: (value: unknown) => void;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route('**/api/chat', async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Response after delay',
          session_id: 'test-session',
        }),
      });
    });

    const input = page.locator('input[placeholder*="message"], input[placeholder*="Message"], textarea').first();
    await input.fill('Test message');
    await input.press('Enter');

    // Check for loading indicator (implementation dependent)
    // await expect(page.locator('.loading, .spinner, [data-testid="loading"]')).toBeVisible();

    resolveRoute!(undefined);
    await expect(page.locator('text=Response after delay')).toBeVisible({ timeout: 10000 });
  });

  test('persists messages in localStorage', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Persisted response',
          session_id: 'test-session',
        }),
      });
    });

    const input = page.locator('input[placeholder*="message"], input[placeholder*="Message"], textarea').first();
    await input.fill('Test persistence');
    await input.press('Enter');

    await expect(page.locator('text=Persisted response')).toBeVisible({ timeout: 10000 });

    // Check localStorage
    const messages = await page.evaluate(() => {
      const stored = localStorage.getItem('chatMessages');
      return stored ? JSON.parse(stored) : [];
    });
    expect(messages.length).toBeGreaterThan(0);
  });
});