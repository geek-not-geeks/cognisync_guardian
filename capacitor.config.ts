import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cognisync.enterprise",
  appName: "CogniSync",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: false, // Enforce strict SSL/TLS encryption.
  },
  plugins: {
    Camera: {
      saveToGallery: false, // Privacy compliance: never clutter the user photo roll.
    },
  },
};

export default config;
