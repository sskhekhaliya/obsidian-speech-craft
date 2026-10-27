import { TTSVoice } from "../types";
import { SynthesisOptions } from "./baseProvider";

export class WebSpeechProvider {
  id = "webspeech" as const;
  name = "Web Speech API (100% Offline)";
  private cachedVoices: TTSVoice[] | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  async getVoices(): Promise<TTSVoice[]> {
    if (this.cachedVoices && this.cachedVoices.length > 0) {
      return this.cachedVoices;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      return [];
    }

    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.cachedVoices = this.mapVoices(voices);
        return resolve(this.cachedVoices);
      }

      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        this.cachedVoices = this.mapVoices(voices);
        resolve(this.cachedVoices);
      };

      // Fallback timeout in case onvoiceschanged does not fire
      setTimeout(() => {
        if (!this.cachedVoices) {
          voices = window.speechSynthesis.getVoices();
          this.cachedVoices = this.mapVoices(voices || []);
          resolve(this.cachedVoices);
        }
      }, 500);
    });
  }

  private mapVoices(voices: SpeechSynthesisVoice[]): TTSVoice[] {
    const mapped: TTSVoice[] = voices.map((v) => ({
      id: v.name,
      name: `${v.name} (${v.lang})`,
      lang: v.lang,
      provider: "webspeech",
      localeName: v.lang
    }));

    // Prioritize Hindi & English
    mapped.sort((a, b) => {
      const aIsHi = a.lang.startsWith("hi");
      const bIsHi = b.lang.startsWith("hi");
      const aIsEn = a.lang.startsWith("en");
      const bIsEn = b.lang.startsWith("en");

      if (aIsHi && !bIsHi) return -1;
      if (!aIsHi && bIsHi) return 1;
      if (aIsEn && !bIsEn) return -1;
      if (!aIsEn && bIsEn) return 1;
      return a.name.localeCompare(b.name);
    });

    return mapped;
  }

  speak(
    text: string,
    voiceName: string,
    options: SynthesisOptions,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onError?.(new Error("Speech synthesis is not supported on this device"));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    this.activeUtterance = utterance;

    const allVoices = window.speechSynthesis.getVoices();
    const matchedVoice = allVoices.find((v) => v.name === voiceName || v.voiceURI === voiceName);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }

    utterance.rate = Math.max(0.1, Math.min(options.rate, 2.5));
    utterance.pitch = Math.max(0, Math.min(1.0 + (options.pitch || 0) / 50, 2.0));
    utterance.volume = Math.max(0, Math.min(options.volume ?? 1.0, 1.0));

    if (onBoundary) {
      utterance.onboundary = (e) => {
        onBoundary(e.charIndex);
      };
    }

    utterance.onend = () => {
      this.activeUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      this.activeUtterance = null;
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  }

  pause(): void {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
  }
}
