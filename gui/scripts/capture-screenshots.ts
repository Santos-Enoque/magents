import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Create screenshots directory
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const pages = [
    { name: 'dashboard', url: 'http://localhost:3000' },
    { name: 'agents', url: 'http://localhost:3000/agents' },
    { name: 'projects', url: 'http://localhost:3000/projects' },
    { name: 'tasks', url: 'http://localhost:3000/tasks' },
    { name: 'analytics', url: 'http://localhost:3000/analytics' },
    { name: 'settings', url: 'http://localhost:3000/settings' },
    { name: 'terminal', url: 'http://localhost:3000/terminal' }
  ];

  for (const pageInfo of pages) {
    try {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Wait for any animations
      
      await page.screenshot({
        path: path.join(screenshotsDir, `${pageInfo.name}.png`),
        fullPage: true
      });
      
      console.log(`✅ Captured screenshot for ${pageInfo.name}`);
    } catch (error) {
      console.error(`❌ Failed to capture ${pageInfo.name}:`, error);
    }
  }

  await browser.close();
  console.log('\n📸 All screenshots captured in ./screenshots directory');
}

captureScreenshots().catch(console.error);