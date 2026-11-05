import { TTSVoice } from "../types";
import { SynthesisOptions } from "./baseProvider";

export class WebSpeechProvider {
  id = "webspeech" as const;
  name = "Web Speech API (100% Offline)";
  private cachedVoices: TTSVoice[] | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  private currentText: string = "";
  private currentVoiceName: string = "";
  private currentOptions: SynthesisOptions | null = null;
  private lastCharIndex: number = 0;
  private isPaused: boolean = false;
  private onBoundaryCb?: (charIndex: number) => void;
  private onEndCb?: () => void;
  private onErrorCb?: (err: any) => void;
  private pauseHeartbeat: any = null;

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

    this.stopPauseHeartbeat();
    window.speechSynthesis.cancel();

    this.currentText = text;
    this.currentVoiceName = voiceName;
    this.currentOptions = options;
    this.lastCharIndex = 0;
    this.onBoundaryCb = onBoundary;
    this.onEndCb = onEnd;
    this.onErrorCb = onError;

    const utterance = new SpeechSynthesisUtterance(text);
    this.activeUtterance = utterance;

    const allVoices = window.speechSynthesis.getVoices();
    let matchedVoice = allVoices.find((v) => v.name === voiceName || v.voiceURI === voiceName);
    if (!matchedVoice && (voiceName === "hi" || options.lang?.startsWith("hi"))) {
      matchedVoice = allVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("hi") ||
          v.lang.toLowerCase().startsWith("mr") ||
          v.lang.toLowerCase().startsWith("gu")
      );
    }
    if (!matchedVoice && (voiceName === "en" || options.lang?.startsWith("en"))) {
      matchedVoice = allVoices.find((v) => v.lang.toLowerCase().startsWith("en"));
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else if (options.lang) {
      utterance.lang = options.lang;
    } else if (voiceName === "hi") {
      utterance.lang = "hi-IN";
    } else if (voiceName === "en") {
      utterance.lang = "en-US";
    }

    utterance.rate = Math.max(0.1, Math.min(options.rate, 2.5));
    utterance.pitch = Math.max(0, Math.min(1.0 + (options.pitch || 0) / 50, 2.0));
    utterance.volume = Math.max(0, Math.min(options.volume ?? 1.0, 1.0));

    if (onBoundary) {
      utterance.onboundary = (e) => {
        this.lastCharIndex = e.charIndex;
        onBoundary(e.charIndex);
      };
    }

    utterance.onend = () => {
      this.stopPauseHeartbeat();
      this.activeUtterance = null;
      if (this.isPaused) return;
      onEnd?.();
    };

    utterance.onerror = (e: any) => {
      this.stopPauseHeartbeat();
      this.activeUtterance = null;
      if (this.isPaused || e?.error === "canceled" || e?.error === "interrupted") return;
      onError?.(e);
    };

    this.isPaused = false;
    window.speechSynthesis.speak(utterance);
  }

  pause(): void {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.isPaused = true;
    this.stopPauseHeartbeat();
    if (this.currentText && this.lastCharIndex > 0) {
      this.currentText = this.currentText.slice(this.lastCharIndex).trimStart();
      this.lastCharIndex = 0;
    }
    window.speechSynthesis.cancel();
  }

  private startPauseHeartbeat(): void {
    this.stopPauseHeartbeat();
  }

  private stopPauseHeartbeat(): void {
    if (this.pauseHeartbeat) {
      clearInterval(this.pauseHeartbeat);
      this.pauseHeartbeat = null;
    }
  }

  resume(): void {
    this.stopPauseHeartbeat();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.isPaused = false;

    if (this.currentText && this.currentText.trim().length > 0 && this.currentOptions) {
      this.speak(
        this.currentText,
        this.currentVoiceName,
        this.currentOptions,
        this.onBoundaryCb,
        this.onEndCb,
        this.onErrorCb
      );
    } else {
      this.onEndCb?.();
    }
  }

  stop(): void {
    this.isPaused = false;
    this.currentText = "";
    this.lastCharIndex = 0;
    this.stopPauseHeartbeat();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
  }
}
