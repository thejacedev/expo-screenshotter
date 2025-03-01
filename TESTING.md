# Testing expo-screenshotter in Your Expo Project

This guide explains how to test the expo-screenshotter package in your Expo project without publishing it to npm.

## Method 1: Using npm/yarn link

The `npm link` (or `yarn link`) command creates a symbolic link between your local package and your Expo project.

### Step 1: Build and Link the Package

```bash
# In the expo-screenshotter directory
npm run build
npm link
```

### Step 2: Link to Your Expo Project

```bash
# In your Expo project directory
npm link expo-screenshotter
```

### Step 3: Use the Package in Your Expo Project

You can now use the package in your Expo project as if it were installed from npm:

```javascript
// In your Expo project
import * as ExpoScreenshotter from 'expo-screenshotter';
// Use the package...
```

Or use the CLI commands:

```bash
# Initialize a configuration file
npx expo-screenshotter init

# Take screenshots
npx expo-screenshotter capture
```

### Step 4: Unlink When Done

```bash
# In your Expo project
npm unlink --no-save expo-screenshotter

# In the expo-screenshotter directory
npm unlink
```

## Method 2: Installing from Local Directory

You can install the package directly from your local directory:

```bash
# In your Expo project
npm install --save-dev file:/path/to/expo-screenshotter
```

Replace `/path/to/expo-screenshotter` with the actual path to the package.

## Method 3: Using the Package Programmatically

You can create a script in your Expo project to use the package programmatically:

```javascript
// screenshot.js
const path = require('path');
const { captureScreenshots } = require('expo-screenshotter');

// Configuration
const config = {
  views: [
    { name: 'Home', path: '/' }
  ],
  sizes: [
    { width: 375, height: 812, name: 'iPhone X' }
  ],
  outputDir: './screenshots',
  expoUrl: 'http://localhost:19006', // Your Expo web URL
  waitTime: 2000
};

// Take screenshots
async function takeScreenshots() {
  console.log('Taking screenshots...');
  await captureScreenshots(config);
  console.log('Screenshots saved to', config.outputDir);
}

takeScreenshots().catch(console.error);
```

Run with:
```bash
node screenshot.js
```

## Troubleshooting

### Command Not Found

If you get a "command not found" error when trying to use the CLI:

```bash
# Use npx to run the command
npx expo-screenshotter init

# Or use the full path to the binary
./node_modules/.bin/expo-screenshotter init
```

### Expo Web Not Running

Make sure your Expo web app is running before taking screenshots:

```bash
# Start Expo web
npx expo start --web
```

### Path Issues on Windows

On Windows, use proper path formatting:

```javascript
const config = {
  outputDir: path.resolve('./screenshots'),
  // ...
};
```

### Browser Issues

If you encounter browser-related issues:

```javascript
// In your script
const { captureScreenshots } = require('expo-screenshotter');

// Custom browser options
const browserOptions = {
  headless: false, // Set to false to see the browser
  args: ['--no-sandbox', '--disable-setuid-sandbox']
};

captureScreenshots(config, browserOptions);
```

## Testing Changes

After making changes to the expo-screenshotter code:

1. Rebuild the package:
   ```bash
   npm run build
   ```

2. If using npm link, you don't need to relink
3. If using local installation, reinstall the package:
   ```bash
   npm install --save-dev file:/path/to/expo-screenshotter
   ```

4. Test your changes in your Expo project 