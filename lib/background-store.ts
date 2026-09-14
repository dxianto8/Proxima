"use client";

/**
 * The background image lives under its own localStorage key, not inside the
 * main data blob. A photo is orders of magnitude larger than everything else
 * the app stores, and keeping it separate means a quota failure while saving a
 * wallpaper can never cost someone their tasks.
 */

const KEY = "proxima.background.v1";

/** Long edge after downscaling. Enough for a 4K display at cover sizing. */
const MAX_EDGE = 1920;
const QUALITY = 0.78;

export function readBackground(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearBackground(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clean up */
  }
}

export class BackgroundTooLargeError extends Error {
  constructor() {
    super("That image is too large to store in this browser.");
    this.name = "BackgroundTooLargeError";
  }
}

/** Re-encodes a picked file to a bounded JPEG data URL. */
export function downscaleToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That file is not an image Proxima can read."));
      image.onload = () => {
        const scale = Math.min(MAX_EDGE / image.width, MAX_EDGE / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Your browser blocked image processing."));
          return;
        }
        // JPEG has no alpha, so flatten onto white rather than onto black.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function writeBackground(dataUrl: string): void {
  try {
    window.localStorage.setItem(KEY, dataUrl);
  } catch {
    // Almost always the 5MB quota; surface it as something actionable.
    throw new BackgroundTooLargeError();
  }
}

export { KEY as BACKGROUND_KEY };
