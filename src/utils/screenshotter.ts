import puppeteer, { Page } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ScreenshotConfig, ScreenSize, View } from '../types';

export async function takeScreenshots(config: ScreenshotConfig): Promise<void> {
  const { views, sizes, outputDir, expoUrl, waitForSelector, waitTime = 1000, fullPage = false } = config;
  
  // Ensure output directory exists
  await fs.ensureDir(outputDir);
  
  console.log(chalk.blue('Launching browser...'));
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Take screenshots for each view and size
    for (const view of views) {
      console.log(chalk.blue(`Processing view: ${view.name}`));
      
      // Create directory for this view
      const viewDir = path.join(outputDir, sanitizeFilename(view.name));
      await fs.ensureDir(viewDir);
      
      // Navigate to the view
      const viewUrl = `${expoUrl}${view.path}`;
      console.log(chalk.gray(`Navigating to ${viewUrl}`));
      
      await page.goto(viewUrl, { waitUntil: 'networkidle2' });
      
      // Wait for selector if specified
      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: 30000 });
        } catch {
          console.warn(chalk.yellow(`Warning: Selector "${waitForSelector}" not found for view "${view.name}"`));
        }
      }
      
      // Additional wait time
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Take screenshots for each size
      for (const size of sizes) {
        await takeScreenshotForSize(page, view, size, viewDir, fullPage);
      }
    }
  } finally {
    await browser.close();
  }
}

async function takeScreenshotForSize(
  page: Page,
  view: View,
  size: ScreenSize,
  outputDir: string,
  defaultFullPage: boolean
): Promise<void> {
  const { width, height, name, scrollX = 0, scrollY = 0 } = size;
  
  // Determine if we should use fullPage mode
  const useFullPage = size.hasOwnProperty('fullPage') ? 
    Boolean(size.fullPage) : defaultFullPage;
  
  // Log what we're doing
  let sizeDescription = `${name} (${width}x${height})`;
  if (scrollX > 0 || scrollY > 0) {
    sizeDescription += ` with scroll position (${scrollX},${scrollY})`;
  }
  console.log(chalk.gray(`Taking screenshot for size: ${sizeDescription}`));
  
  // Set viewport size
  await page.setViewport({ width, height });
  
  // Wait for any animations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Scroll to position if specified
  if (scrollX > 0 || scrollY > 0) {
    await page.evaluate((x, y) => {
      window.scrollTo(x, y);
    }, scrollX, scrollY);
    
    // Wait a bit after scrolling
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Generate filename with scroll position if applicable
  let filename = `${sanitizeFilename(view.name)}_${sanitizeFilename(name)}`;
  if (scrollX > 0 || scrollY > 0) {
    filename += `_scroll_x${scrollX}_y${scrollY}`;
  }
  filename += '.png';
  
  const outputPath = path.join(outputDir, filename);
  
  // Take screenshot
  await page.screenshot({
    path: outputPath,
    fullPage: useFullPage
  });
  
  console.log(chalk.green(`Saved screenshot to: ${outputPath}`));
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
} 