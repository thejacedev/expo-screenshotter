import express from 'express';
import { Server } from 'http';
import path from 'path';

/**
 * Creates a mock server that simulates an Expo web app for testing
 */
export class MockExpoServer {
  private server: Server | null = null;
  private app = express();
  private port: number;
  private isRunning = false;

  constructor(port = 3030) {
    this.port = port;
    this.setupRoutes();
  }

  /**
   * Set up the routes for the mock server
   */
  private setupRoutes() {
    // Serve static files from the test-assets directory
    const testAssetsPath = path.join(__dirname, 'test-assets');
    try {
      this.app.use(express.static(testAssetsPath));
    } catch (error) {
      console.warn(`Warning: Could not serve static files from ${testAssetsPath}. This is expected if the directory doesn't exist.`);
    }

    // Home route
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mock Expo App - Home</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .button { background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
              .nav { display: flex; gap: 10px; margin-top: 20px; }
              .nav a { text-decoration: none; color: #2196F3; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Mock Expo App</h1>
              <p>This is a mock app for testing expo-screenshotter</p>
              <button class="button" id="testButton">Click Me</button>
              <div class="nav">
                <a href="/about">About</a>
                <a href="/form">Form</a>
              </div>
            </div>
            <script>
              // Add some interactivity for testing
              document.getElementById('testButton').addEventListener('click', () => {
                alert('Button clicked!');
              });
            </script>
          </body>
        </html>
      `);
    });

    // About route
    this.app.get('/about', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mock Expo App - About</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .nav { display: flex; gap: 10px; margin-top: 20px; }
              .nav a { text-decoration: none; color: #2196F3; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>About</h1>
              <p>This is the about page of our mock Expo app.</p>
              <div class="nav">
                <a href="/">Home</a>
                <a href="/form">Form</a>
              </div>
            </div>
          </body>
        </html>
      `);
    });

    // Form route with interactive elements for testing
    this.app.get('/form', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mock Expo App - Form</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .form-group { margin-bottom: 15px; }
              label { display: block; margin-bottom: 5px; }
              input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
              .button { background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
              .nav { display: flex; gap: 10px; margin-top: 20px; }
              .nav a { text-decoration: none; color: #2196F3; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Contact Form</h1>
              <form id="contactForm">
                <div class="form-group">
                  <label for="firstName">First Name</label>
                  <input type="text" id="firstName" placeholder="First Name" />
                </div>
                <div class="form-group">
                  <label for="lastName">Last Name</label>
                  <input type="text" id="lastName" placeholder="Last Name" />
                </div>
                <div class="form-group">
                  <label for="message">Message</label>
                  <textarea id="message" rows="4" placeholder="Your message"></textarea>
                </div>
                <button type="submit" class="button">Submit</button>
              </form>
              <div class="nav">
                <a href="/">Home</a>
                <a href="/about">About</a>
              </div>
            </div>
            <script>
              // Add form submission handler
              document.getElementById('contactForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const firstName = document.getElementById('firstName').value;
                const lastName = document.getElementById('lastName').value;
                alert(\`Form submitted for \${firstName} \${lastName}\`);
              });
            </script>
          </body>
        </html>
      `);
    });
  }

  /**
   * Start the mock server
   * @returns Promise that resolves when the server is started
   */
  public start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // If server is already running, resolve immediately
      if (this.isRunning) {
        resolve();
        return;
      }

      try {
        this.server = this.app.listen(this.port, () => {
          this.isRunning = true;
          console.log(`Mock Expo server running at http://localhost:${this.port}`);
          resolve();
        });

        // Handle server errors
        if (this.server) {
          this.server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              console.error(`Port ${this.port} is already in use. Try a different port.`);
              reject(new Error(`Port ${this.port} is already in use`));
            } else {
              console.error('Server error:', err);
              reject(err);
            }
          });
        }
      } catch (error) {
        console.error('Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the mock server
   * @returns Promise that resolves when the server is stopped
   */
  public stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.server || !this.isRunning) {
        this.isRunning = false;
        resolve();
        return;
      }

      try {
        this.server.close((err) => {
          if (err) {
            console.error('Error closing server:', err);
            reject(err);
          } else {
            this.server = null;
            this.isRunning = false;
            console.log(`Mock Expo server on port ${this.port} stopped`);
            resolve();
          }
        });
      } catch (error) {
        console.error('Failed to stop server:', error);
        this.isRunning = false;
        reject(error);
      }
    });
  }
} 