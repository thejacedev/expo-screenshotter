import puppeteer, { Page } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ScreenshotConfig, ScreenSize, View } from '../types';
import { applyDeviceFrame } from './deviceFrames';

export async function takeScreenshots(config: ScreenshotConfig): Promise<void> {
  const { 
    views, 
    sizes, 
    outputDir, 
    expoUrl, 
    waitForSelector, 
    waitTime = 1000, 
    fullPage = false,
    useDeviceFrame = false,
    deviceType = 'iphone',
    iphoneOptions = { pill: true, color: 'Space Black' },
    androidOptions = { size: 'medium', color: 'black' }
  } = config;
  
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
        await takeScreenshotForSize(page, view, size, viewDir, fullPage, useDeviceFrame, deviceType, iphoneOptions, androidOptions);
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
  defaultFullPage: boolean,
  defaultUseDeviceFrame: boolean,
  defaultDeviceType: 'iphone' | 'android',
  defaultIphoneOptions: { pill?: boolean; color?: string },
  defaultAndroidOptions: { size?: 'compact' | 'medium'; color?: 'black' | 'silver' }
): Promise<void> {
  const { width, height, name, scrollX = 0, scrollY = 0 } = size;
  
  // Determine if we should use fullPage mode
  const useFullPage = size.hasOwnProperty('fullPage') ? 
    Boolean(size.fullPage) : defaultFullPage;
  
  // Determine if we should use device frame
  const useDeviceFrame = size.hasOwnProperty('useDeviceFrame') ? 
    Boolean(size.useDeviceFrame) : defaultUseDeviceFrame;
  
  // Determine which device frame to use
  const deviceType = size.deviceType || defaultDeviceType;
  
  // Determine iPhone options
  const iphoneOptions = size.iphoneOptions || defaultIphoneOptions;
  
  // Determine Android options
  const androidOptions = size.androidOptions || defaultAndroidOptions;
  
  // Log what we're doing
  let sizeDescription = `${name} (${width}x${height})`;
  if (scrollX > 0 || scrollY > 0) {
    sizeDescription += ` with scroll position (${scrollX},${scrollY})`;
  }
  if (useDeviceFrame) {
    if (deviceType === 'iphone') {
      const pillType = iphoneOptions.pill ? 'pill' : 'notch';
      sizeDescription += ` with ${deviceType} frame (${pillType}, ${iphoneOptions.color})`;
    } else if (deviceType === 'android') {
      sizeDescription += ` with ${deviceType} frame (${androidOptions.size}, ${androidOptions.color})`;
    } else {
      sizeDescription += ` with ${deviceType} frame`;
    }
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
  
  // Add device frame indicator to filename if applicable
  if (useDeviceFrame) {
    if (deviceType === 'iphone') {
      const pillType = iphoneOptions.pill ? 'pill' : 'notch';
      const color = iphoneOptions.color || 'Space Black';
      filename += `_${deviceType}_${pillType}_${sanitizeFilename(color)}`;
    } else if (deviceType === 'android') {
      const size = androidOptions.size || 'medium';
      const color = androidOptions.color || 'black';
      filename += `_${deviceType}_${size}_${color}`;
    } else {
      filename += `_${deviceType}_frame`;
    }
  }
  
  filename += '.png';
  const outputPath = path.join(outputDir, filename);
  
  // Take screenshot
  await page.screenshot({
    path: outputPath,
    fullPage: useFullPage
  });
  
  console.log(chalk.green(`Saved screenshot to: ${outputPath}`));
  
  // Apply device frame if enabled
  if (useDeviceFrame) {
    if (deviceType === 'iphone') {
      console.log(chalk.gray(`Applying ${deviceType} frame (${iphoneOptions.pill ? 'pill' : 'notch'}, ${iphoneOptions.color || 'Space Black'})...`));
    } else if (deviceType === 'android') {
      console.log(chalk.gray(`Applying ${deviceType} frame (${androidOptions.size || 'medium'}, ${androidOptions.color || 'black'})...`));
    } else {
      console.log(chalk.gray(`Applying ${deviceType} frame...`));
    }
    
    // Create a temporary path for the framed screenshot
    const framedOutputPath = path.join(outputDir, `framed_${filename}`);
    
    // Apply the device frame
    await applyDeviceFrame(outputPath, deviceType, framedOutputPath, iphoneOptions, androidOptions);
    
    // Replace the original screenshot with the framed one
    await fs.move(framedOutputPath, outputPath, { overwrite: true });
    
    console.log(chalk.green(`Applied ${deviceType} frame to screenshot: ${outputPath}`));
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
} 