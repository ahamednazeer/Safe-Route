import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saferoute.app',
  appName: 'Safe Route',
  webDir: 'out',
  server: {
    androidScheme: 'http'
  },
  plugins: {
    Geolocation: {
      // Request both fine and coarse location
    }
  }
};

export default config;


