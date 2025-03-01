# expo-screenshotter Tests

This directory contains tests for the expo-screenshotter package.

## Test Structure

- `setup.ts` - Test setup and configuration
- `mockServer.ts` - A mock Expo web server for testing
- `basic.test.ts` - Basic functionality tests
- `advanced.test.ts` - Tests for advanced features like device frames
- `programmatic.test.ts` - Tests for programmatic usage of the package
- `test-assets/` - Directory for test assets

## Running Tests

To run the tests, use the following commands:

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Environment

The tests use:

- Jest as the test runner
- A mock Express server to simulate an Expo web app
- Mocked Puppeteer for browser interactions
- A dedicated test output directory

## Adding New Tests

When adding new tests:

1. Create a new test file with the `.test.ts` extension
2. Import the necessary modules and utilities
3. Use the mock server for testing browser interactions
4. Clean up resources in the `afterAll` or `afterEach` hooks

## Troubleshooting

If tests are failing:

- Check if the mock server is running correctly
- Ensure the package is built before running tests
- Check if all dependencies are installed
- Increase timeouts for browser-related tests if needed 