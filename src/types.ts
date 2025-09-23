export interface ScreenSize {
  width: number;
  height: number;
  name: string;
  deviceScaleFactor?: number;
  scrollY?: number;
  scrollX?: number;
  fullPage?: boolean;
  useDeviceFrame?: boolean;
  deviceType?: 'iphone' | 'android';
  iphoneOptions?: {
    pill?: boolean;
    color?: 'Gold' | 'Space Black' | 'Silver' | 'Deep Purple' | 'Starlight' | 'Midnight' | 'Red' | 'Blue';
    width?: number;
    height?: number;
  };
  androidOptions?: {
    size?: 'compact' | 'medium';
    color?: 'black' | 'silver';
    width?: number;
    height?: number;
  };
}

export interface Interaction {
  type: 'type' | 'click' | 'wait';
  selector?: string;
  text?: string;
  waitTime?: number;
}

export interface View {
  name: string;
  path: string;
  interactions?: Interaction[];
  waitAfterInteractions?: number;
}

export interface ScreenshotConfig {
  views: View[];
  sizes: ScreenSize[];
  outputDir: string;
  expoUrl: string;
  deviceScaleFactor?: number;
  waitForSelector?: string;
  waitTime?: number;
  fullPage?: boolean;
  useDeviceFrame?: boolean;
  deviceType?: 'iphone' | 'android';
  generateReport?: boolean;
  iphoneOptions?: {
    pill?: boolean;
    color?: 'Gold' | 'Space Black' | 'Silver' | 'Deep Purple' | 'Starlight' | 'Midnight' | 'Red' | 'Blue';
    width?: number;
    height?: number;
  };
  androidOptions?: {
    size?: 'compact' | 'medium';
    color?: 'black' | 'silver';
    width?: number;
    height?: number;
  };
}