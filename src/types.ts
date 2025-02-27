export interface ScreenSize {
  width: number;
  height: number;
  name: string;
  scrollY?: number;  // Vertical scroll position in pixels
  scrollX?: number;  // Horizontal scroll position in pixels
  fullPage?: boolean; // Whether to capture the full page height for this specific size
}

export interface View {
  name: string;
  path: string;
}

export interface ScreenshotConfig {
  views: View[];
  sizes: ScreenSize[];
  outputDir: string;
  expoUrl: string;
  waitForSelector?: string;
  waitTime?: number;
  fullPage?: boolean;  // Whether to capture the full page height (default for all sizes)
} 