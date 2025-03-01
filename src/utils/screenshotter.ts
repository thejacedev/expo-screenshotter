import puppeteer, { Page } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ScreenshotConfig, ScreenSize, View, Interaction } from '../types';
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
  
  await fs.ensureDir(outputDir);
  
  console.log(chalk.blue('Launching browser...'));
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    for (const view of views) {
      console.log(chalk.blue(`Processing view: ${view.name}`));
      
      const viewDir = path.join(outputDir, sanitizeFilename(view.name));
      await fs.ensureDir(viewDir);
      
      const viewUrl = `${expoUrl}${view.path}`;
      console.log(chalk.gray(`Navigating to ${viewUrl}`));
      
      await page.goto(viewUrl, { waitUntil: 'networkidle2' });
      
      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: 30000 });
        } catch {
          console.warn(chalk.yellow(`Warning: Selector "${waitForSelector}" not found for view "${view.name}"`));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (view.interactions && view.interactions.length > 0) {
        console.log(chalk.blue(`Performing ${view.interactions.length} interactions for view: ${view.name}`));
        await performInteractions(page, view.interactions);
        
        if (view.waitAfterInteractions) {
          console.log(chalk.gray(`Waiting ${view.waitAfterInteractions}ms after interactions...`));
          await new Promise(resolve => setTimeout(resolve, view.waitAfterInteractions));
        }
      }
      
      for (const size of sizes) {
        await takeScreenshotForSize(page, view, size, viewDir, fullPage, useDeviceFrame, deviceType, iphoneOptions, androidOptions);
      }
    }
  } finally {
    await browser.close();
  }
}

/**
 * Perform a series of interactions on the page
 */
async function performInteractions(page: Page, interactions: Interaction[]): Promise<void> {
  for (const interaction of interactions) {
    switch (interaction.type) {
    case 'type':
      if (!interaction.selector) {
        console.warn(chalk.yellow('Warning: No selector provided for type interaction'));
        continue;
      }
      if (!interaction.text) {
        console.warn(chalk.yellow('Warning: No text provided for type interaction'));
        continue;
      }
        
      console.log(chalk.gray(`Typing "${interaction.text}" into "${interaction.selector}"`));
        
      try {
        await page.waitForSelector(interaction.selector, { timeout: 5000 });
        await page.click(interaction.selector, { clickCount: 3 }); 
        await page.type(interaction.selector, interaction.text);
      } catch (error: unknown) {
        console.warn(chalk.yellow(`Warning: Failed to type into "${interaction.selector}": ${error instanceof Error ? error.message : String(error)}`));
      }
      break;
        
    case 'click':
      if (!interaction.selector) {
        console.warn(chalk.yellow('Warning: No selector provided for click interaction'));
        continue;
      }
        
      console.log(chalk.gray(`Clicking on "${interaction.selector}"`));
        
      try {
        await page.waitForSelector(interaction.selector, { timeout: 5000 });
        await page.click(interaction.selector);
      } catch (error: unknown) {
        console.warn(chalk.yellow(`Warning: Failed to click on "${interaction.selector}": ${error instanceof Error ? error.message : String(error)}`));
      }
      break;
        
    case 'wait':
      const waitTime = interaction.waitTime || 1000;
      console.log(chalk.gray(`Waiting for ${waitTime}ms`));
      await new Promise(resolve => setTimeout(resolve, waitTime));
      break;
        
    default:
      console.warn(chalk.yellow(`Warning: Unknown interaction type: ${(interaction as unknown as { type: string }).type}`));
    }
    await new Promise(resolve => setTimeout(resolve, 300));
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
  

  const useFullPage = size.hasOwnProperty('fullPage') ? 
    Boolean(size.fullPage) : defaultFullPage;
  

  const useDeviceFrame = size.hasOwnProperty('useDeviceFrame') ? 
    Boolean(size.useDeviceFrame) : defaultUseDeviceFrame;
  

  const deviceType = size.deviceType || defaultDeviceType;
  

  const iphoneOptions = size.iphoneOptions || defaultIphoneOptions;
  

  const androidOptions = size.androidOptions || defaultAndroidOptions;
  

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
  
  await page.setViewport({ width, height });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (scrollX > 0 || scrollY > 0) {
    await page.evaluate((x, y) => {
      window.scrollTo(x, y);
    }, scrollX, scrollY);
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  let filename = `${sanitizeFilename(view.name)}_${sanitizeFilename(name)}`;
  if (scrollX > 0 || scrollY > 0) {
    filename += `_scroll_x${scrollX}_y${scrollY}`;
  }
  
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
  
  await page.screenshot({
    path: outputPath,
    fullPage: useFullPage
  });
  
  console.log(chalk.green(`Saved screenshot to: ${outputPath}`));
  
  if (useDeviceFrame) {
    if (deviceType === 'iphone') {
      console.log(chalk.gray(`Applying ${deviceType} frame (${iphoneOptions.pill ? 'pill' : 'notch'}, ${iphoneOptions.color || 'Space Black'})...`));
    } else if (deviceType === 'android') {
      console.log(chalk.gray(`Applying ${deviceType} frame (${androidOptions.size || 'medium'}, ${androidOptions.color || 'black'})...`));
    } else {
      console.log(chalk.gray(`Applying ${deviceType} frame...`));
    }
    
    const framedOutputPath = path.join(outputDir, `framed_${filename}`);
    
    await applyDeviceFrame(outputPath, deviceType, framedOutputPath, iphoneOptions, androidOptions);
    
    await fs.move(framedOutputPath, outputPath, { overwrite: true });
    
    console.log(chalk.green(`Applied ${deviceType} frame to screenshot: ${outputPath}`));
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}