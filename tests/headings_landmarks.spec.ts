import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '@playwright/test';


test('should have no best-practice violations', async ({ page }) => {
  await page.goto('http://localhost:8000/exercises/example.html');
  const axe = new AxeBuilder({ page }).withTags([
    'best-practice'
  ]);
    const results = await axe.analyze();
    expect(results.violations).toEqual([]);
  });

test('should have no heading and landmarks violations', async ({ page }) => {
  await page.goto('http://localhost:8000/exercises/example.html');
  const axe = new AxeBuilder({ page }).withRules([
    'heading-order',
    'empty-heading',
    'page-has-heading-one',
    'region',
    'landmark-one-main',
    'landmark-unique',
    'landmark-one-main',
    'landmark-banner-is-top-level',
    'landmark-contentinfo-is-top-level',
    'landmark-main-is-top-level',
    'landmark-no-duplicate-banner',
    'landmark-no-duplicate-contentinfo',
    'landmark-no-duplicate-main',
  ]);
    const results = await axe.analyze();
    expect(results.violations).toEqual([]);
  });
