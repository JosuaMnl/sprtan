import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sprtan.app',
  appName: 'Sprtan',
  // Built by `npm run build:native` (service worker disabled).
  webDir: 'dist',
  android: {
    // Required by @capacitor-community/background-geolocation: without it
    // Android halts location updates after ~5 minutes in the background.
    useLegacyBridge: true,
  },
}

export default config
