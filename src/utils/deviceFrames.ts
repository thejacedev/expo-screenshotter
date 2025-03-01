import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import puppeteer from 'puppeteer';

/**
 * Apply a device frame to a screenshot
 * @param screenshotPath Path to the screenshot
 * @param deviceType Type of device frame to use ('iphone' or 'android')
 * @param outputPath Path to save the framed screenshot
 * @param iphoneOptions Options for iPhone frames (pill style, color, and optional target dimensions)
 * @param androidOptions Options for Android frames (size and color)
 */
export async function applyDeviceFrame(
  screenshotPath: string,
  deviceType: 'iphone' | 'android',
  outputPath: string,
  iphoneOptions?: { pill?: boolean; color?: string; width?: number; height?: number },
  androidOptions?: { size?: 'compact' | 'medium'; color?: 'black' | 'silver'; width?: number; height?: number }
): Promise<void> {
  try {
    if (deviceType === 'iphone') {
      await applyIPhoneFrame(screenshotPath, outputPath, iphoneOptions);
    } else if (deviceType === 'android') {
      await applyAndroidFrame(screenshotPath, outputPath, androidOptions);
    } else {
      console.log(chalk.yellow(`Unknown device type: ${deviceType}. Using original screenshot.`));
      await fs.copy(screenshotPath, outputPath);
    }
  } catch (error) {
    console.error(chalk.red('Error applying device frame:'), error);
    await fs.copy(screenshotPath, outputPath);
  }
}

/**
 * Get the path to the assets directory
 * Works in both development and production environments
 */
function getAssetsPath(): string {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'src', 'assets'),
    path.join(__dirname, '..', 'assets'),
    path.join(process.cwd(), 'src', 'assets'),

    path.join(process.cwd(), 'node_modules', 'expo-screenshotter', 'src', 'assets')
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(path.join(possiblePath, 'iphones')) || fs.existsSync(path.join(possiblePath, 'android'))) {
      return possiblePath;
    }
  }

  return possiblePaths[0];
}

/**
 * Apply an Android frame to a screenshot by overlaying the frame on top of the screenshot
 * @param screenshotPath Path to the screenshot
 * @param outputPath Path to save the framed screenshot
 * @param options Android frame options (size, color, and optional target dimensions)
 */
async function applyAndroidFrame(
  screenshotPath: string,
  outputPath: string,
  options?: { size?: 'compact' | 'medium'; color?: 'black' | 'silver'; width?: number; height?: number }
): Promise<void> {
  const size = options?.size ?? 'medium';
  const color = options?.color ?? 'black';
  const targetWidth = options?.width;
  const targetHeight = options?.height;
  
  const assetsPath = getAssetsPath();
  
  const frameFilename = `Android ${size.charAt(0).toUpperCase() + size.slice(1)} ${color.charAt(0).toUpperCase() + color.slice(1)}.png`;
  const framePath = path.join(assetsPath, 'android', frameFilename);
  
  console.log(chalk.gray(`Looking for Android frame at: ${framePath}`));
  
  if (!await fs.pathExists(framePath)) {
    console.warn(chalk.yellow(`Android frame not found: ${frameFilename}. Looking for any available frame...`));
    
    const androidDir = path.join(assetsPath, 'android');
    let defaultFramePath = '';
    
    if (await fs.pathExists(androidDir)) {
      try {
        const files = await fs.readdir(androidDir);
        if (files.length > 0) {
          defaultFramePath = path.join(androidDir, files[0]);
          console.log(chalk.gray(`Using available frame: ${files[0]}`));
        }
      } catch (error) {
        console.error(chalk.red('Error reading Android frames directory:'), error);
      }
    }
    
    if (!defaultFramePath || !await fs.pathExists(defaultFramePath)) {
      console.error(chalk.red(`No Android frames found in ${androidDir}`));
      console.log(chalk.yellow('Using original screenshot instead.'));
      await fs.copy(screenshotPath, outputPath);
      return;
    }
    
    try {
      await overlayFrameOnScreenshot(defaultFramePath, screenshotPath, outputPath, targetWidth, targetHeight, false, true, 'compact');
    } catch (error) {
      console.error(chalk.red('Error overlaying frame:'), error);
      await fs.copy(screenshotPath, outputPath);
    }
    return;
  }
  
  try {
    await overlayFrameOnScreenshot(framePath, screenshotPath, outputPath, targetWidth, targetHeight, false, true, size);
  } catch (error) {
    console.error(chalk.red('Error overlaying frame:'), error);
    await fs.copy(screenshotPath, outputPath);
  }
}

/**
 * Apply an iPhone frame to a screenshot by overlaying the frame on top of the screenshot
 * @param screenshotPath Path to the screenshot
 * @param outputPath Path to save the framed screenshot
 * @param options iPhone frame options (pill style, color, and optional target dimensions)
 */
async function applyIPhoneFrame(
  screenshotPath: string,
  outputPath: string,
  options?: { pill?: boolean; color?: string; width?: number; height?: number }
): Promise<void> {
  const pill = options?.pill ?? true;
  const color = options?.color ?? 'Space Black';
  const targetWidth = options?.width;
  const targetHeight = options?.height;
  
  const assetsPath = getAssetsPath();
  
  const frameFilename = `Pill=${pill ? 'true' : 'False'}, Color=${color}.png`;
  const framePath = path.join(assetsPath, 'iphones', frameFilename);
  
  console.log(chalk.gray(`Looking for frame at: ${framePath}`));
  
  if (!await fs.pathExists(framePath)) {
    console.warn(chalk.yellow(`iPhone frame not found: ${frameFilename}. Looking for any available frame...`));
    
    const iphoneDir = path.join(assetsPath, 'iphones');
    let defaultFramePath = '';
    
    if (await fs.pathExists(iphoneDir)) {
      try {
        const files = await fs.readdir(iphoneDir);
        if (files.length > 0) {
          defaultFramePath = path.join(iphoneDir, files[0]);
          console.log(chalk.gray(`Using available frame: ${files[0]}`));
        }
      } catch (error) {
        console.error(chalk.red('Error reading iPhone frames directory:'), error);
      }
    }
    
    if (!defaultFramePath || !await fs.pathExists(defaultFramePath)) {
      console.error(chalk.red(`No iPhone frames found in ${iphoneDir}`));
      console.log(chalk.yellow('Using original screenshot instead.'));
      await fs.copy(screenshotPath, outputPath);
      return;
    }
    
    try {
      await overlayFrameOnScreenshot(defaultFramePath, screenshotPath, outputPath, targetWidth, targetHeight, pill, false);
    } catch (error) {
      console.error(chalk.red('Error overlaying frame:'), error);
      await fs.copy(screenshotPath, outputPath);
    }
    return;
  }
  
  try {
    await overlayFrameOnScreenshot(framePath, screenshotPath, outputPath, targetWidth, targetHeight, pill, false);
  } catch (error) {
    console.error(chalk.red('Error overlaying frame:'), error);
    await fs.copy(screenshotPath, outputPath);
  }
}

/**
 * Overlay a frame image on top of a screenshot using Puppeteer
 * @param framePath Path to the frame image
 * @param screenshotPath Path to the screenshot
 * @param outputPath Path to save the combined image
 * @param targetWidth Optional target width for the final image
 * @param targetHeight Optional target height for the final image
 * @param isPill Whether the frame is a pill-style (true) or notch-style (false) - for iPhone
 * @param isAndroid Whether the frame is an Android frame
 * @param androidSize Optional Android device size ('compact' or 'medium')
 */
async function overlayFrameOnScreenshot(
  framePath: string,
  screenshotPath: string,
  outputPath: string,
  targetWidth?: number,
  targetHeight?: number,
  isPill?: boolean,
  isAndroid?: boolean,
  androidSize?: 'compact' | 'medium'
): Promise<void> {
  try {
    const frameBuffer = await fs.readFile(framePath);
    const screenshotBuffer = await fs.readFile(screenshotPath);
    
    const frameBase64 = frameBuffer.toString('base64');
    const screenshotBase64 = screenshotBuffer.toString('base64');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      await page.setContent(`<img id="screenshot" src="data:image/png;base64,${screenshotBase64}" />`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dimensions = await page.evaluate(() => {
        const img = document.getElementById('screenshot') as HTMLImageElement;
        return img ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 800, height: 600 };
      });
      
      const needsResize = targetWidth && targetHeight;
      
      const containerWidth = dimensions.width;
      const containerHeight = dimensions.height;
      
      let cornerRadiusPercent = 30; 
      if (!isAndroid) {
        if(isPill) {
          cornerRadiusPercent = 32; 
        } else {
          cornerRadiusPercent = 30; 
        }
      } else {
        if (androidSize === 'medium') {
          cornerRadiusPercent = 6;
        }
      }
      
      const cornerRadius = Math.min(containerWidth, containerHeight) * (cornerRadiusPercent / 100);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: ${containerWidth}px;
              height: ${containerHeight}px;
              overflow: hidden;
              background-color: transparent;
            }
            .container {
              position: relative;
              width: ${containerWidth}px;
              height: ${containerHeight}px;
            }
            .screenshot-wrapper {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 1;
              border-radius: ${cornerRadius}px;
              overflow: hidden;
            }
            .screenshot {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .frame {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="screenshot-wrapper">
              <img class="screenshot" src="data:image/png;base64,${screenshotBase64}" />
            </div>
            <img class="frame" src="data:image/png;base64,${frameBase64}" />
          </div>
        </body>
        </html>
      `;
      
      await page.setContent(html);
      
      await page.setViewport({
        width: containerWidth,
        height: containerHeight,
        deviceScaleFactor: 1
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await page.screenshot({ 
        path: outputPath, 
        type: 'png',
        omitBackground: true
      });
      
      console.log(chalk.green(`Successfully overlaid frame on screenshot: ${outputPath}`));
      
      if (needsResize) {
        console.log(chalk.gray(`Resizing image to ${targetWidth}x${targetHeight}...`));
        
        const resizePage = await browser.newPage();
        
        const framedImageBuffer = await fs.readFile(outputPath);
        const framedImageBase64 = framedImageBuffer.toString('base64');
        
        await resizePage.setContent(`<img id="framed" src="data:image/png;base64,${framedImageBase64}" />`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const framedDimensions = await resizePage.evaluate(() => {
          const img = document.getElementById('framed') as HTMLImageElement;
          return img ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 800, height: 600 };
        });
        
        const scaleX = targetWidth / framedDimensions.width;
        const scaleY = targetHeight / framedDimensions.height;
        const scale = Math.max(scaleX, scaleY);
        
        const resizeHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body, html {
                margin: 0;
                padding: 0;
                width: ${targetWidth}px;
                height: ${targetHeight}px;
                overflow: hidden;
                background-color: transparent;
              }
              .resize-container {
                width: ${targetWidth}px;
                height: ${targetHeight}px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
              }
              .resized-image {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(${scale});
                transform-origin: center center;
                width: ${framedDimensions.width}px;
                height: ${framedDimensions.height}px;
                border: none;
                outline: none;
              }
            </style>
          </head>
          <body>
            <div class="resize-container">
              <img class="resized-image" src="data:image/png;base64,${framedImageBase64}" />
            </div>
          </body>
          </html>
        `;
        
        await resizePage.setContent(resizeHtml);
        
        await resizePage.setViewport({
          width: targetWidth,
          height: targetHeight,
          deviceScaleFactor: 1
        });
        

        await new Promise(resolve => setTimeout(resolve, 500));
        
        await resizePage.screenshot({ 
          path: outputPath, 
          type: 'png',
          omitBackground: true 
        });
        
        console.log(chalk.green(`Successfully resized image to ${targetWidth}x${targetHeight}: ${outputPath}`));
        
        await resizePage.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(chalk.red('Error in overlayFrameOnScreenshot:'), error);
    throw error;
  }
} 