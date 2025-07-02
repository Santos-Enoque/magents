import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 }
  });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:3000';
  const screenshotDir = path.join(__dirname, '..', 'screenshots');

  const pages = [
    { name: 'dashboard', path: '/' },
    { name: 'agents', path: '/agents' },
    { name: 'projects', path: '/projects' },
    { name: 'tasks', path: '/tasks' },
    { name: 'settings', path: '/settings' },
    { name: 'analytics', path: '/analytics' },
    { name: 'terminal', path: '/terminal' },
  ];

  console.log('🎯 Capturing screenshots...');

  for (const pageDef of pages) {
    try {
      console.log(`📸 Capturing ${pageDef.name}...`);
      await page.goto(`${baseUrl}${pageDef.path}`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait a bit for any animations to settle
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, `${pageDef.name}.png`),
        fullPage: true
      });
      
      console.log(`✅ ${pageDef.name} screenshot saved`);
    } catch (error) {
      console.error(`❌ Failed to capture ${pageDef.name}:`, error);
    }
  }

  await browser.close();
  console.log('🎉 Screenshot capture complete!');
}

captureScreenshots().catch(console.error);