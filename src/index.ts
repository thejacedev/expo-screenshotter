#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { takeScreenshots } from './utils/screenshotter';
import { ScreenshotConfig, View, Interaction } from './types';
import { spawn } from 'child_process';
import readline from 'readline';
import { detectExpoRoutes } from './utils/routeDetector';
import inquirer from 'inquirer';
import { globSync } from 'glob';

const program = new Command();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const promptYesNo = (question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    rl.question(`${question} (Y/n): `, (answer) => {
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes' || normalizedAnswer === '');
    });
  });
};

const runCommand = (command: string, args: string[]): Promise<number> => {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    let childProcess;
    
    if (isWindows) {
      childProcess = spawn('cmd.exe', ['/c', command, ...args], { 
        stdio: 'inherit',
        shell: true
      });
    } else {
      childProcess = spawn(command, args, { 
        stdio: 'inherit',
        shell: true
      });
    }
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
};

program
  .name('expo-screenshotter')
  .description('Take screenshots of Expo apps at different screen sizes')
  .version('0.3.0');

program
  .command('init')
  .description('Initialize a new expo-screenshotter.json configuration file')
  .action(async () => {
    try {
      const configPath = path.join(process.cwd(), 'expo-screenshotter.json');
      
      if (await fs.pathExists(configPath)) {
        console.log(chalk.yellow('expo-screenshotter.json already exists!'));
        rl.close();
        return;
      }
      
      let views: View[] = [
        {
          name: 'Home',
          path: '/'
        },
        {
          name: 'Form with Input',
          path: '/form',
          interactions: [
            {
              type: 'type',
              selector: 'input[placeholder="First Name"]',
              text: 'Jace'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 500
            } as Interaction,
            {
              type: 'type',
              selector: 'input[placeholder="Last Name"]',
              text: 'Sleeman'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 1000
            } as Interaction
          ],
          waitAfterInteractions: 1000
        },
        {
          name: 'Button Click',
          path: '/buttons',
          interactions: [
            {
              type: 'click',
              selector: 'div.css-view-175oi2r[tabindex="0"]'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 2000
            } as Interaction
          ],
          waitAfterInteractions: 1000
        },
        {
          name: 'Complex Interaction Example',
          path: '/complex-form',
          interactions: [
            {
              type: 'type',
              selector: 'input[placeholder="First Name"]',
              text: 'Jace'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 300
            } as Interaction,
            {
              type: 'type',
              selector: 'input[placeholder="Last Name"]',
              text: 'Sleeman'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 300
            } as Interaction,
            {
              type: 'click',
              selector: 'div[tabindex="0"].css-view-175oi2r[style*="background-color: rgb(53, 122, 189)"]'
            } as Interaction,
            {
              type: 'wait',
              waitTime: 2000
            } as Interaction
          ],
          waitAfterInteractions: 1000
        }
      ];
      
      const isExpoRouterProject = await fs.pathExists(path.join(process.cwd(), 'app')) || 
                                 await fs.pathExists(path.join(process.cwd(), 'src/app'));
      
      if (isExpoRouterProject) {
        const shouldAutoDetectRoutes = await promptYesNo('Do you want us to automatically detect all routes for you?');
        
        if (shouldAutoDetectRoutes) {
          let appDir = './app';
          if (!await fs.pathExists(appDir)) {
            appDir = './src/app';
            if (!await fs.pathExists(appDir)) {
              console.log(chalk.yellow('Could not find app directory. Using default routes.'));
            }
          }
          
          if (await fs.pathExists(appDir)) {
            const detectedRoutes = await detectExpoRoutes(appDir);
            
            if (detectedRoutes.length > 0) {
              console.log(chalk.green(`Detected ${detectedRoutes.length} routes:`));
              detectedRoutes.forEach((route, index) => {
                console.log(chalk.blue(`${index + 1}. ${route.name}: ${route.path}`));
              });
              
              const selectionOptions = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'routeSelectionOption',
                  message: 'How would you like to select routes?',
                  choices: [
                    { name: 'Select specific routes interactively', value: 'select' },
                    { name: 'Use all detected routes', value: 'all' },
                    { name: 'Use default routes', value: 'default' }
                  ]
                }
              ]);
              
              if (selectionOptions.routeSelectionOption === 'select') {
                const selectedRoutes = await selectRoutesInteractively(detectedRoutes);
                
                if (selectedRoutes.length > 0) {
                  views = selectedRoutes;
                  console.log(chalk.green(`Selected ${views.length} routes for configuration.`));
                } else {
                  console.log(chalk.yellow('No routes selected. Using default routes.'));
                }
              } else if (selectionOptions.routeSelectionOption === 'all') {
                views = detectedRoutes;
                console.log(chalk.green('Using all detected routes for configuration.'));
              } else {
                console.log(chalk.yellow('Using default routes.'));
              }
            } else {
              console.log(chalk.yellow('No routes detected. Using default routes.'));
            }
          }
        }
      }
      
      const defaultConfig: ScreenshotConfig = {
        views,
        sizes: [
          {
            width: 375,
            height: 812,
            name: 'iPhone X'
          },
          {
            width: 1280,
            height: 800,
            name: 'Tablet'
          },
          {
            width: 2560,
            height: 1440,
            name: 'Desktop'
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X Scrolled',
            scrollY: 500  
          },
          {
            width: 1280,
            height: 800,
            name: 'Tablet Full Page',
            fullPage: true  
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X with Frame',
            useDeviceFrame: true,
            deviceType: 'iphone',
            iphoneOptions: {
              pill: true,
              color: 'Space Black'
            }
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X with Gold Frame',
            useDeviceFrame: true,
            deviceType: 'iphone',
            iphoneOptions: {
              pill: true,
              color: 'Gold'
            }
          },
          {
            width: 375,
            height: 812,
            name: 'iPhone X with Notch Frame',
            useDeviceFrame: true,
            deviceType: 'iphone',
            iphoneOptions: {
              pill: false,
              color: 'Midnight'
            }
          },
          {
            width: 360,
            height: 740,
            name: 'Android with Frame',
            useDeviceFrame: true,
            deviceType: 'android'
          }
        ],
        outputDir: './screenshots',
        expoUrl: 'http://localhost:8081',
        waitTime: 2000,
        useDeviceFrame: false,
        generateReport: true  
      };
      
      await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });
      console.log(chalk.green('Created expo-screenshotter.json'));
      console.log(chalk.blue('Edit this file to configure your screenshot settings'));
      
      const isExpoProject = await fs.pathExists(path.join(process.cwd(), 'app.json')) || 
                            await fs.pathExists(path.join(process.cwd(), 'app.config.js'));
      
      if (isExpoProject) {
        console.log(chalk.yellow('\nIMPORTANT: This tool requires web support for your Expo app.'));
        console.log(chalk.yellow('You will need react-native-web installed to capture screenshots.'));
        
        const shouldInstallDeps = await promptYesNo('Would you like to install the required web dependencies now?');
        
        if (shouldInstallDeps) {
          console.log(chalk.blue('\nInstalling react-native-web...'));
          try {
            await runCommand('npm', ['install', 'react-native-web']);
            console.log(chalk.green('\nSuccessfully installed web dependencies!'));
            console.log(chalk.blue('You can now run your Expo app with web support using:'));
            console.log(chalk.white('  expo start --web'));
          } catch (error) {
            console.error(chalk.red('\nFailed to install dependencies:'), error);
            console.log(chalk.yellow('Please install manually with: npm install react-native-web'));
          }
        } else {
          console.log(chalk.yellow('\nRemember to install web dependencies before capturing screenshots:'));
          console.log(chalk.white('  npm install react-native-web'));
        }
        
        console.log(chalk.blue('\nTo capture screenshots:'));
        console.log(chalk.white('1. Start your Expo app with: expo start --web'));
        console.log(chalk.white('2. Run: expo-screenshotter capture'));
      }
      
      rl.close();
    } catch (error) {
      console.error(chalk.red('Error initializing:'), error);
      rl.close();
      process.exit(1);
    }
  });

program
  .command('capture')
  .description('Capture screenshots based on the configuration')
  .option('-c, --config <path>', 'Path to configuration file', 'expo-screenshotter.json')
  .action(async (options) => {
    try {
      const configPath = path.resolve(process.cwd(), options.config);
      
      if (!await fs.pathExists(configPath)) {
        console.log(chalk.red(`Configuration file not found: ${options.config}`));
        console.log(chalk.yellow('Run "expo-screenshotter init" to create a configuration file'));
        rl.close();
        return;
      }
      
      const config = await fs.readJSON(configPath) as ScreenshotConfig;
      console.log(chalk.blue('Starting screenshot capture...'));
      
      try {
        console.log(chalk.yellow('Checking if Expo web server is running...'));
        console.log(chalk.yellow('If this hangs, make sure your Expo app is running with web support: expo start --web'));
        
        await takeScreenshots(config);
        console.log(chalk.green('Screenshots captured successfully!'));
        rl.close();
      } catch (error) {
        console.error(chalk.red('Error capturing screenshots:'), error);
        console.log(chalk.yellow('\nTips:'));
        console.log(chalk.yellow('1. Make sure your Expo app is running with: expo start --web'));
        console.log(chalk.yellow('2. Ensure you have react-native-web installed: npm install react-native-web'));
        console.log(chalk.yellow('3. Check that the expoUrl in your config matches your Expo web server URL'));
        rl.close();
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      rl.close();
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate a report from existing screenshots')
  .option('-d, --dir <path>', 'Directory containing screenshots', './screenshots')
  .action(async (options) => {
    try {
      const screenshotDir = path.resolve(process.cwd(), options.dir);
      
      if (!await fs.pathExists(screenshotDir)) {
        console.log(chalk.red(`Screenshot directory not found: ${options.dir}`));
        console.log(chalk.yellow('Make sure you have captured screenshots first with "expo-screenshotter capture"'));
        rl.close();
        return;
      }
      
      console.log(chalk.blue(`Generating report from screenshots in ${screenshotDir}...`));
      
      // Find all image files in the directory and subdirectories
      const imageFiles = globSync('**/*.{png,jpg,jpeg}', { cwd: screenshotDir });
      
      if (imageFiles.length === 0) {
        console.log(chalk.yellow('No screenshot images found in the directory.'));
        rl.close();
        return;
      }
      
      console.log(chalk.blue(`Found ${imageFiles.length} screenshots.`));
      
      // Create screenshot data for the report
      const screenshots = imageFiles.map((file: string) => {
        const fullPath = path.join(screenshotDir, file);
        const dirName = path.dirname(file);
        const viewName = dirName === '.' ? 'Unknown' : dirName;
        const fileName = path.basename(file, path.extname(file));
        
        return {
          view: viewName,
          size: fileName,
          path: fullPath
        };
      });
      
      // Generate the report
      await generateScreenshotReport(screenshots, screenshotDir);
      console.log(chalk.green('Report generated successfully!'));
      rl.close();
    } catch (error) {
      console.error(chalk.red('Error generating report:'), error);
      rl.close();
      process.exit(1);
    }
  });

program.parse(process.argv);

process.on('exit', () => {
  if (rl.listenerCount('line') > 0) {
    rl.close();
  }
});

const selectRoutesInteractively = async (routes: View[]): Promise<View[]> => {
  console.log(chalk.yellow('Use arrow keys to navigate, space to select routes, and enter to confirm:'));
  
  const { selectedRoutes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedRoutes',
      message: 'Select routes:',
      choices: routes.map((route, index) => ({
        name: `${index + 1}. ${route.name}: ${route.path}`,
        value: route,
        checked: false
      })),
      pageSize: 10
    }
  ]);
  
  return selectedRoutes;
};

/**
 * Generates a summary report of all screenshots taken
 */
async function generateScreenshotReport(
  screenshots: { view: string; size: string; path: string }[],
  outputDir: string
): Promise<void> {
  const reportPath = path.join(outputDir, 'screenshot-report.html');
  
  // Create HTML content
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Screenshot Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
        }
        .report-time {
          color: #7f8c8d;
          font-size: 0.9em;
          margin-bottom: 30px;
        }
        .screenshot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .screenshot-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .screenshot-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .screenshot-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-bottom: 1px solid #eee;
        }
        .screenshot-info {
          padding: 15px;
        }
        .screenshot-title {
          font-weight: bold;
          margin: 0 0 5px 0;
        }
        .screenshot-size {
          color: #7f8c8d;
          font-size: 0.9em;
        }
        .screenshot-path {
          color: #3498db;
          font-size: 0.8em;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <h1>Screenshot Report</h1>
      <div class="report-time">Generated on ${new Date().toLocaleString()}</div>
      
      <div class="screenshot-grid">
  `;
  
  // Add each screenshot to the report
  screenshots.forEach(screenshot => {
    // Get relative path for display
    const relativePath = path.relative(outputDir, screenshot.path);
    
    htmlContent += `
      <div class="screenshot-card">
        <img class="screenshot-img" src="${relativePath}" alt="${screenshot.view} - ${screenshot.size}">
        <div class="screenshot-info">
          <div class="screenshot-title">${screenshot.view}</div>
          <div class="screenshot-size">${screenshot.size}</div>
          <div class="screenshot-path">${relativePath}</div>
        </div>
      </div>
    `;
  });
  
  htmlContent += `
      </div>
    </body>
    </html>
  `;
  
  // Write the report file
  await fs.writeFile(reportPath, htmlContent);
  console.log(chalk.green(`Screenshot report generated at: ${reportPath}`));
} 