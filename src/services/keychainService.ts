import { App, Notice } from "obsidian";
import { SpeechCraftSettings } from "../types";

export class KeychainService {
  constructor(private app: App) {}

  /**
   * Checks whether Obsidian native SecretStorage (OS Keychain) is supported
   */
  isAvailable(): boolean {
    const secretStorage = (this.app as any).secretStorage;
    return Boolean(secretStorage && typeof secretStorage.getSecret === "function");
  }

  /**
   * Retrieves a secret by ID from Obsidian SecretStorage
   */
  getSecret(secretId: string): string | null {
    if (!this.isAvailable() || !secretId) return null;
    try {
      const secretStorage = (this.app as any).secretStorage;
      const val = secretStorage.getSecret(secretId);
      return typeof val === "string" ? val.trim() : null;
    } catch (e) {
      console.warn("Speech Craft: Failed to read from Keychain", e);
      return null;
    }
  }

  /**
   * Stores a secret securely into Obsidian SecretStorage (OS Keychain)
   */
  async setSecret(secretId: string, value: string): Promise<boolean> {
    if (!this.isAvailable() || !secretId) return false;
    try {
      const secretStorage = (this.app as any).secretStorage;
      if (typeof secretStorage.setSecret === "function") {
        await secretStorage.setSecret(secretId, value.trim());
        return true;
      }
    } catch (e) {
      console.error("Speech Craft: Failed to save to Keychain", e);
    }
    return false;
  }

  /**
   * Resolves the Google Cloud API Key from Keychain or settings
   */
  getGoogleApiKey(settings: SpeechCraftSettings): string {
    if (settings.useKeychain || settings.googleApiSecretId) {
      if (settings.googleApiSecretId) {
        const secret = this.getSecret(settings.googleApiSecretId);
        if (secret && typeof secret === "string" && secret.trim()) {
          return secret.trim();
        }
      }
    }
    return settings.googleApiKey ? settings.googleApiKey.trim() : "";
  }

  /**
   * Resolves the Custom Server / OpenAI API Key from Keychain or settings
   */
  getCustomApiKey(settings: SpeechCraftSettings): string {
    if (settings.useKeychain || settings.customApiSecretId) {
      if (settings.customApiSecretId) {
        const secret = this.getSecret(settings.customApiSecretId);
        if (secret && typeof secret === "string" && secret.trim()) {
          return secret.trim();
        }
      }
    }
    return settings.customApiKey ? settings.customApiKey.trim() : "";
  }
}
