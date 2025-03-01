// Define the global test configuration type
declare global {
  namespace NodeJS {
    interface Global {
      __TEST_CONFIG__: {
        outputDir: string;
        mockServerPort: number;
        expoUrl: string;
      };
    }
  }
}

import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Set longer timeout for tests involving browser operations
jest.setTimeout(120000); // Increase timeout to 2 minutes

// Create test output directory if it doesn't exist
const TEST_OUTPUT_DIR = resolve(__dirname, '../test-output');
if (!existsSync(TEST_OUTPUT_DIR)) {
  mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

// Get the current test file name
const getTestFileName = (): string => {
  const stack = new Error().stack || '';
  const testFilePath = stack.split('\n').find(line => line.includes('__tests__/') && line.includes('.test.ts'));
  
  if (!testFilePath) {
    return 'unknown';
  }
  
  const match = testFilePath.match(/__tests__\/([^.]+)\.test\.ts/);
  return match ? match[1] : 'unknown';
};

// Map of test file names to port numbers
const PORT_MAP: Record<string, number> = {
  'basic': 3030,
  'advanced': 3031,
  'programmatic': 3032,
  'unknown': 3033
};

// Get the port for the current test file
const testFileName = getTestFileName();
const mockServerPort = PORT_MAP[testFileName] || 3033;

console.log(`Using port ${mockServerPort} for test file: ${testFileName}`);

// Test configuration
export const TEST_CONFIG = {
  outputDir: TEST_OUTPUT_DIR,
  mockServerPort,
  expoUrl: `http://localhost:${mockServerPort}`,
};

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only show console output if DEBUG is enabled
if (!process.env.DEBUG) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

export {}; 