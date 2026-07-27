import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Preferences } from "@capacitor/preferences";
import { Network } from "@capacitor/network";

export const isNative = Capacitor.isNativePlatform();

/** 1. Native camera capture — bypasses WebKit in-tab memory ceilings. */
export async function captureHardwarePhoto(): Promise<File | null> {
  if (!isNative) return null; // Web falls back to the HTML5 input pipeline.

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      width: 1600, // Pre-scale at OS hardware level.
    });

    if (!photo.webPath) return null;
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    return new File([blob], `hardware_scan_${Date.now()}.webp`, {
      type: blob.type || "image/webp",
    });
  } catch (err) {
    console.warn("Hardware camera capture cancelled or failed:", err);
    return null;
  }
}

/** 2. Native SharedPreferences/UserDefaults storage — survives OS RAM eviction. */
export const NativeStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isNative) {
      await Preferences.set({ key, value });
      return;
    }
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  async getItem(key: string): Promise<string | null> {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  async removeItem(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
      return;
    }
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

/** 3. Real-time radio connectivity interceptor. */
export function bindNativeNetworkListener(onReconnect: () => void): () => void {
  if (!isNative) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("online", onReconnect);
    return () => window.removeEventListener("online", onReconnect);
  }

  const handler = Network.addListener("networkStatusChange", (status) => {
    if (status.connected) onReconnect();
  });

  return () => {
    void handler.then((h) => h.remove());
  };
}
