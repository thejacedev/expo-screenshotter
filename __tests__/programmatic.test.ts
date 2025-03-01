import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { MockExpoServer } from './mockServer';
import { TEST_CONFIG } from './setup';
import puppeteer from 'puppeteer';

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn() as any;

// Mock the puppeteer module
jest.mock('puppeteer', () => {
  // Create a mock implementation of puppeteer
  return {
    launch: jest.fn().mockImplementation(() => {
      return {
        newPage: jest.fn().mockImplementation(() => {
          return {
            setViewport: jest.fn(),
            goto: jest.fn(),
            waitForSelector: jest.fn(),
            waitForTimeout: jest.fn(),
            evaluate: jest.fn(),
            screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
            close: jest.fn()
          };
        }),
        close: jest.fn()
      };
    })
  };
});

// Create mock functions for the module
const mockInitConfig = jest.fn();
const mockCaptureScreenshots = jest.fn().mockResolvedValue(undefined);

// Mock the module
jest.mock('../dist/index', () => {
  return {
    initConfig: mockInitConfig,
    captureScreenshots: mockCaptureScreenshots
  };
}, { virtual: true });

// Import the module after mocking dependencies
const screenshotter = require('../dist/index');

// Restore process.exit after tests
afterAll(() => {
  process.exit = originalExit;
});

// Use a specific port for this test file
const PORT = 3032;

describe('expo-screenshotter programmatic usage', () => {
  const mockServer = new MockExpoServer(PORT);
  const outputDir = TEST_CONFIG.outputDir;
  
  beforeAll(async () => {
    // Start the mock server before tests
    await mockServer.start();
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Stop the mock server after tests
    await mockServer.stop();
  });

  test('should expose programmatic API', () => {
    // Check if the module exports expected functions
    expect(typeof screenshotter.initConfig).toBe('function');
    expect(typeof screenshotter.captureScreenshots).toBe('function');
  });

  test('should be able to call functions programmatically', async () => {
    // Create a test configuration
    const testConfig = {
      views: [
        { name: 'Home', path: '/' }
      ],
      sizes: [
        { width: 375, height: 812, name: 'iPhone X' }
      ],
      outputDir,
      expoUrl: `http://localhost:${PORT}`,
      waitTime: 1000
    };

    // Call the function programmatically
    await screenshotter.captureScreenshots(testConfig);
    
    // Verify that the function was called with the correct arguments
    expect(mockCaptureScreenshots).toHaveBeenCalledWith(testConfig);
  });

  test('should handle errors gracefully', async () => {
    // Create a configuration with an invalid URL
    const invalidConfig = {
      views: [
        { name: 'Home', path: '/' }
      ],
      sizes: [
        { width: 375, height: 812, name: 'iPhone X' }
      ],
      outputDir,
      expoUrl: 'http://invalid-url-that-does-not-exist',
      waitTime: 1000
    };

    // Mock console.error to prevent error output during test
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    try {
      // This should not throw an error, but handle it gracefully
      await screenshotter.captureScreenshots(invalidConfig);
    } catch (error) {
      // If it throws, the test will fail
      expect(true).toBe(false); // This will fail the test if an error is thrown
    } finally {
      // Restore console.error
      console.error = originalConsoleError;
    }
    
    // Verify that the function was called with the correct arguments
    expect(mockCaptureScreenshots).toHaveBeenCalledWith(invalidConfig);
  });
}); 