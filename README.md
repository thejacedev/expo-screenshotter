# Expo Screenshotter

[![npm version](https://img.shields.io/npm/v/expo-screenshotter.svg)](https://www.npmjs.com/package/expo-screenshotter)
[![License](https://img.shields.io/badge/license-MIT%2FDecheck-blue.svg)](https://github.com/TheRealPerson98/expo-screenshotter/blob/main/LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/TheRealPerson98/expo-screenshotter.svg)](https://github.com/TheRealPerson98/expo-screenshotter/issues)
[![Build Status](https://github.com/TheRealPerson98/expo-screenshotter/workflows/CI/badge.svg)](https://github.com/TheRealPerson98/expo-screenshotter/actions)
[![Dependencies](https://img.shields.io/librariesio/release/npm/expo-screenshotter)](https://libraries.io/npm/expo-screenshotter)

A command-line tool for automatically taking screenshots of Expo web apps at different screen sizes. Perfect for generating marketing materials, documentation, or testing responsive designs.

## Features

- Take screenshots at predefined or custom screen sizes
- Support for scrolling to capture full-page screenshots
- Configurable delay to ensure content is fully loaded
- Customizable output directory
- Batch screenshot multiple URLs
- Supports custom viewport configurations

## Installation

```bash
npm install -g expo-screenshotter
```

## Usage

There are two main commands:

### Initialize Configuration

```bash
expo-screenshotter init
```

This creates a default `expo-screenshotter.json` configuration file in your project. You can then customize this file for your needs.

### Take Screenshots

```bash
expo-screenshotter capture
```

This will use your `expo-screenshotter.json` configuration to take screenshots. Make sure your Expo web app is running first with `expo start --web`.

### Configuration File (expo-screenshotter.json)

The configuration file controls all aspects of the screenshot process. Here's an example:

```json
{
  "views": [
    {
      "name": "Home",
      "path": "/"
    },
    {
      "name": "Add Logs",
      "path": "/add-log"
    },
    {
      "name": "Goals",
      "path": "/goals"
    },
    {
      "name": "Logs",
      "path": "/logs"
    }
  ],
  "sizes": [
    {
      "width": 375,
      "height": 812,
      "name": "iPhone X"
    },
    {
      "width": 1280,
      "height": 800,
      "name": "Tablet"
    },
    {
      "width": 2560,
      "height": 1440,
      "name": "Desktop"
    },
    {
      "width": 1280,
      "height": 800,
      "name": "Tablet Full Page",
      "fullPage": true
    }
  ],
  "outputDir": "./screenshots",
  "expoUrl": "http://localhost:8081",
  "waitTime": 2000,
  "waitForSelector": "#my-element",
  "fullPage": false
}

```

### Advanced Configuration Options

#### Global Options
- `waitTime`: Delay in milliseconds before taking screenshots (default: 1000)
- `waitForSelector`: CSS selector to wait for before taking screenshots (e.g., "#my-element")
- `fullPage`: Set to `true` to capture the entire scrollable content for all sizes (default: false)

#### Per-Size Options
Each size in the `sizes` array can have these additional options:
- `fullPage`: Override the global fullPage setting for this specific size
- `scrollY`: Scroll vertically by specified pixels before capturing
- `scrollX`: Scroll horizontally by specified pixels before capturing

For example, to wait for a specific element and capture a full-page screenshot:
```json
{
  "waitForSelector": "#content-loaded",
  "waitTime": 3000,
  "sizes": [
    {
      "name": "Full Page Mobile",
      "width": 375,
      "height": 812,
      "fullPage": true
    },
    {
      "name": "Scrolled Desktop",
      "width": 1280,
      "height": 800,
      "scrollY": 500
    }
  ]
}
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/TheRealPerson98/expo-screenshotter.git
cd expo-screenshotter

# Install dependencies
npm install

# Build the project
npm run build
```

### Linting

The project uses ESLint for code quality:

```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## License

This software is dual-licensed:

### For Individual/Open Source Use
MIT © [Person98 LLC - Jace Sleeman (@TheRealPerson98)](https://github.com/TheRealPerson98)

### For Commercial Use
[Decheck License](https://decheck.xyz/license) © [Person98 LLC - Jace Sleeman]

This software can be used freely in personal and open-source projects. For commercial use, please refer to the Decheck license terms or contact for licensing options. 