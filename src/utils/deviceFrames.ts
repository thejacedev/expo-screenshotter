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
 */
export async function applyDeviceFrame(
  screenshotPath: string,
  deviceType: 'iphone' | 'android',
  outputPath: string,
  iphoneOptions?: { pill?: boolean; color?: string; width?: number; height?: number }
): Promise<void> {
  try {
    if (deviceType === 'iphone') {
      // Use real iPhone frames
      await applyIPhoneFrame(screenshotPath, outputPath, iphoneOptions);
    } else {
      // For Android, we'll just copy the screenshot for now
      // In the future, this can be updated to use real Android frames
      console.log(chalk.yellow('Android frames are not yet implemented. Using original screenshot.'));
      await fs.copy(screenshotPath, outputPath);
    }
  } catch (error) {
    console.error(chalk.red('Error applying device frame:'), error);
    // If there's an error, just copy the original screenshot
    await fs.copy(screenshotPath, outputPath);
  }
}

/**
 * Get the path to the assets directory
 * Works in both development and production environments
 */
function getAssetsPath(): string {
  // Try multiple possible locations for the assets
  const possiblePaths = [
    // From dist/utils to src/assets (development)
    path.join(__dirname, '..', '..', 'src', 'assets'),
    // From dist/utils to dist/assets (if assets are copied during build)
    path.join(__dirname, '..', 'assets'),
    // From current working directory
    path.join(process.cwd(), 'src', 'assets'),
    // From package root (if installed as a dependency)
    path.join(process.cwd(), 'node_modules', 'expo-screenshotter', 'src', 'assets')
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(path.join(possiblePath, 'iphones'))) {
      return possiblePath;
    }
  }

  // If no valid path is found, return the first one (will likely fail, but with a clear error)
  return possiblePaths[0];
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
  // Default options
  const pill = options?.pill ?? true;
  const color = options?.color ?? 'Space Black';
  const targetWidth = options?.width;
  const targetHeight = options?.height;
  
  // Get the assets path
  const assetsPath = getAssetsPath();
  
  // Construct the frame filename
  const frameFilename = `Pill=${pill ? 'true' : 'False'}, Color=${color}.png`;
  const framePath = path.join(assetsPath, 'iphones', frameFilename);
  
  console.log(chalk.gray(`Looking for frame at: ${framePath}`));
  
  // Check if the frame file exists
  if (!await fs.pathExists(framePath)) {
    console.warn(chalk.yellow(`iPhone frame not found: ${frameFilename}. Looking for any available frame...`));
    
    // Try to find any available frame
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
    
    // Use the first available frame
    try {
      await overlayFrameOnScreenshot(defaultFramePath, screenshotPath, outputPath, targetWidth, targetHeight, pill);
    } catch (error) {
      console.error(chalk.red('Error overlaying frame:'), error);
      await fs.copy(screenshotPath, outputPath);
    }
    return;
  }
  
  // Overlay the frame on top of the screenshot
  try {
    await overlayFrameOnScreenshot(framePath, screenshotPath, outputPath, targetWidth, targetHeight, pill);
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
 * @param isPill Whether the frame is a pill-style (true) or notch-style (false)
 */
async function overlayFrameOnScreenshot(
  framePath: string,
  screenshotPath: string,
  outputPath: string,
  targetWidth?: number,
  targetHeight?: number,
  isPill?: boolean
): Promise<void> {
  try {
    // Read the images as base64
    const frameBuffer = await fs.readFile(framePath);
    const screenshotBuffer = await fs.readFile(screenshotPath);
    
    const frameBase64 = frameBuffer.toString('base64');
    const screenshotBase64 = screenshotBuffer.toString('base64');
    
    // Get the dimensions of the screenshot using Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // First, get the dimensions of the screenshot
      await page.setContent(`<img id="screenshot" src="data:image/png;base64,${screenshotBase64}" />`);
      
      // Wait a bit for the image to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the dimensions
      const dimensions = await page.evaluate(() => {
        const img = document.getElementById('screenshot') as HTMLImageElement;
        return img ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 800, height: 600 };
      });
      
      // Determine if we need to resize the final image
      const needsResize = targetWidth && targetHeight;
      
      // Set initial dimensions for the container
      const containerWidth = dimensions.width;
      const containerHeight = dimensions.height;
      
      // Determine the appropriate corner radius based on the device dimensions and type
      // These values are approximations and may need adjustment for different device frames
      const cornerRadiusPercent = isPill ? 22 : 28; // Pill devices have slightly less rounded corners
      const cornerRadius = Math.min(containerWidth, containerHeight) * (cornerRadiusPercent / 100);
      
      // Now create the overlay HTML
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
      
      // Set the content with the overlay
      await page.setContent(html);
      
      // Set viewport to match the screenshot dimensions
      await page.setViewport({
        width: containerWidth,
        height: containerHeight,
        deviceScaleFactor: 1
      });
      
      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Take the screenshot
      await page.screenshot({ 
        path: outputPath, 
        type: 'png',
        omitBackground: true
      });
      
      console.log(chalk.green(`Successfully overlaid frame on screenshot: ${outputPath}`));
      
      // If target dimensions are specified, resize the image
      if (needsResize) {
        console.log(chalk.gray(`Resizing image to ${targetWidth}x${targetHeight}...`));
        
        // Create a new page for resizing
        const resizePage = await browser.newPage();
        
        // Read the framed image
        const framedImageBuffer = await fs.readFile(outputPath);
        const framedImageBase64 = framedImageBuffer.toString('base64');
        
        // Get the dimensions of the framed image
        await resizePage.setContent(`<img id="framed" src="data:image/png;base64,${framedImageBase64}" />`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const framedDimensions = await resizePage.evaluate(() => {
          const img = document.getElementById('framed') as HTMLImageElement;
          return img ? { width: img.naturalWidth, height: img.naturalHeight } : { width: 800, height: 600 };
        });
        
        // Calculate the scale factor to fit the image perfectly
        const scaleX = targetWidth / framedDimensions.width;
        const scaleY = targetHeight / framedDimensions.height;
        const scale = Math.max(scaleX, scaleY); // Use the larger scale to ensure full coverage
        
        // Create HTML for precise resizing
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
        
        // Set the content with the resized image
        await resizePage.setContent(resizeHtml);
        
        // Set viewport to match the target dimensions
        await resizePage.setViewport({
          width: targetWidth,
          height: targetHeight,
          deviceScaleFactor: 1
        });
        
        // Wait a bit for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Take the screenshot of the resized image with transparent background
        await resizePage.screenshot({ 
          path: outputPath, 
          type: 'png',
          omitBackground: true // This helps eliminate any background color
        });
        
        console.log(chalk.green(`Successfully resized image to ${targetWidth}x${targetHeight}: ${outputPath}`));
        
        // Close the resize page
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