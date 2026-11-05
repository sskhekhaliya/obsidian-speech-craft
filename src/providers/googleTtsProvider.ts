import { requestUrl } from "obsidian";
import { TTSProvider, SynthesisOptions } from "./baseProvider";
import { TTSVoice } from "../types";
import { normalizePunctuationSpacing } from "../utils/markdownCleaner";

// Free endpoint voices
export const FREE_GOOGLE_VOICES: TTSVoice[] = [
  { id: "hi", name: "Hindi (Google Free)", lang: "hi-IN", provider: "google" as any, localeName: "Hindi (India)" },
  { id: "en", name: "English US (Google Free)", lang: "en-US", provider: "google" as any, localeName: "English (US)" },
  { id: "en-in", name: "English India (Google Free)", lang: "en-IN", provider: "google" as any, localeName: "English (India)" },
  { id: "en-uk", name: "English UK (Google Free)", lang: "en-GB", provider: "google" as any, localeName: "English (UK)" }
];

// Curated official Google Cloud Neural2 & WaveNet voices
export const CLOUD_API_GOOGLE_VOICES: TTSVoice[] = [
  // Hindi Cloud Voices
  { id: "hi-IN-Neural2-A", name: "Swara (Hindi - Neural2 Female)", lang: "hi-IN", gender: "Female", provider: "google" as any, localeName: "Hindi (India)" },
  { id: "hi-IN-Neural2-B", name: "Madhur (Hindi - Neural2 Male)", lang: "hi-IN", gender: "Male", provider: "google" as any, localeName: "Hindi (India)" },
  { id: "hi-IN-Neural2-C", name: "Aarav (Hindi - Neural2 Male)", lang: "hi-IN", gender: "Male", provider: "google" as any, localeName: "Hindi (India)" },
  { id: "hi-IN-Neural2-D", name: "Ananya (Hindi - Neural2 Female)", lang: "hi-IN", gender: "Female", provider: "google" as any, localeName: "Hindi (India)" },
  { id: "hi-IN-Wavenet-A", name: "Hindi (WaveNet Female)", lang: "hi-IN", gender: "Female", provider: "google" as any, localeName: "Hindi (India)" },
  { id: "hi-IN-Wavenet-B", name: "Hindi (WaveNet Male)", lang: "hi-IN", gender: "Male", provider: "google" as any, localeName: "Hindi (India)" },

  // English (India) Cloud Voices
  { id: "en-IN-Neural2-A", name: "Indian English (Neural2 Female A)", lang: "en-IN", gender: "Female", provider: "google" as any, localeName: "English (India)" },
  { id: "en-IN-Neural2-B", name: "Indian English (Neural2 Male B)", lang: "en-IN", gender: "Male", provider: "google" as any, localeName: "English (India)" },
  { id: "en-IN-Neural2-C", name: "Indian English (Neural2 Male C)", lang: "en-IN", gender: "Male", provider: "google" as any, localeName: "English (India)" },
  { id: "en-IN-Neural2-D", name: "Indian English (Neural2 Female D)", lang: "en-IN", gender: "Female", provider: "google" as any, localeName: "English (India)" },

  // English (US) Cloud Voices
  { id: "en-US-Journey-F", name: "Journey (US Female - Ultra Expressive)", lang: "en-US", gender: "Female", provider: "google" as any, localeName: "English (US)" },
  { id: "en-US-Journey-O", name: "Journey (US Male - Ultra Expressive)", lang: "en-US", gender: "Male", provider: "google" as any, localeName: "English (US)" },
  { id: "en-US-Neural2-F", name: "US English (Neural2 Female F)", lang: "en-US", gender: "Female", provider: "google" as any, localeName: "English (US)" },
  { id: "en-US-Neural2-C", name: "US English (Neural2 Male C)", lang: "en-US", gender: "Male", provider: "google" as any, localeName: "English (US)" },
  { id: "en-US-Wavenet-D", name: "US English (WaveNet Male D)", lang: "en-US", gender: "Male", provider: "google" as any, localeName: "English (US)" }
];

export class GoogleTtsProvider implements TTSProvider {
  id = "google" as any;
  name = "Google Cloud TTS";
  private cachedApiVoices: TTSVoice[] | null = null;

  constructor(private getApiKey: () => string) {}

  clearCache(): void {
    this.cachedApiVoices = null;
  }

  async getVoices(): Promise<TTSVoice[]> {
    const apiKey = this.getApiKey()?.trim();
    if (!apiKey) {
      return FREE_GOOGLE_VOICES;
    }

    if (this.cachedApiVoices) {
      return this.cachedApiVoices;
    }

    // Curated high quality voices always included
    const result: TTSVoice[] = [...CLOUD_API_GOOGLE_VOICES];

    // Try fetching any extra live voices from Google Cloud API
    try {
      const response = await requestUrl({
        url: `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
      });

      if (response.status === 200 && response.json?.voices) {
        const rawList = response.json.voices;
        const existingIds = new Set(result.map((v) => v.id));

        for (const v of rawList) {
          if (!existingIds.has(v.name)) {
            const lang = v.languageCodes?.[0] || "";
            // Only add English or Hindi voices to keep dropdown responsive and relevant
            if (lang.startsWith("en") || lang.startsWith("hi")) {
              result.push({
                id: v.name,
                name: `${v.name} (${v.ssmlGender || ""})`,
                lang,
                gender: v.ssmlGender,
                provider: "google" as any,
                localeName: lang
              });
              existingIds.add(v.name);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Speech Craft: Using curated neural voice list", e);
    }

    this.cachedApiVoices = result;
    return this.cachedApiVoices;
  }

  async synthesizeToBlob(text: string, voiceId: string, options: SynthesisOptions): Promise<Blob> {
    const apiKey = this.getApiKey()?.trim();

    // 1. If API Key is present, use official Google Cloud Text-to-Speech v1 API
    if (apiKey) {
      return await this.synthesizeViaCloudApi(text, voiceId, options, apiKey);
    }

    // 2. Otherwise use free Google TTS endpoint
    return await this.synthesizeViaFreeEndpoint(text, voiceId, options);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private buildCloudSsml(text: string): string {
    const normalized = normalizePunctuationSpacing(text);
    const escaped = this.escapeXml(normalized);

    // 1. Smooth, natural comma separation (strength="weak" gives an organic, fluent breath pause without halting)
    let ssml = escaped.replace(/,(\s*)/g, ', <break strength="weak"/>$1');

    // 2. Semicolons and colons
    ssml = ssml.replace(/;(\s*)/g, '; <break strength="weak"/>$1');
    ssml = ssml.replace(/(?<!https?):(\s*)/g, ': <break strength="weak"/>$1');

    // 3. Dashes
    ssml = ssml.replace(/([—–]|\s--\s)/g, ' <break strength="weak"/> ');

    // 4. Hindi purna viram (। / ॥) natural sentence cadence
    ssml = ssml.replace(/([।॥])(\s*)/g, '$1 <break strength="medium"/>$2');

    return `<speak>${ssml}</speak>`;
  }

  private async synthesizeViaCloudApi(
    text: string,
    voiceId: string,
    options: SynthesisOptions,
    apiKey: string
  ): Promise<Blob> {
    // Determine language code
    let langCode = options.lang || (voiceId.startsWith("hi") ? "hi-IN" : "en-US");
    let selectedVoice = voiceId;

    // Handle fallback if free voice ID like "hi" or "en" was passed
    if (selectedVoice === "hi") {
      selectedVoice = "hi-IN-Neural2-A";
      langCode = "hi-IN";
    } else if (selectedVoice === "en") {
      selectedVoice = "en-US-Neural2-F";
      langCode = "en-US";
    }

    const ssml = this.buildCloudSsml(text);

    const payload = {
      input: { ssml },
      voice: {
        languageCode: langCode,
        name: selectedVoice
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: Math.max(0.25, Math.min(options.rate, 4.0)),
        pitch: Math.max(-20.0, Math.min(options.pitch || 0, 20.0))
      }
    };

    const response = await requestUrl({
      url: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.status !== 200 || !response.json?.audioContent) {
      throw new Error(`Google Cloud TTS API Error (${response.status}): ${JSON.stringify(response.json || response.text)}`);
    }

    // Convert base64 to Blob
    const binaryStr = atob(response.json.audioContent);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    return new Blob([bytes], { type: "audio/mp3" });
  }

  private async synthesizeViaFreeEndpoint(
    text: string,
    voiceId: string,
    options: SynthesisOptions
  ): Promise<Blob> {
    const lang = voiceId || (options.lang?.startsWith("hi") ? "hi" : "en");
    const targetLang = lang.startsWith("hi")
      ? "hi"
      : lang === "en-uk"
      ? "en-GB"
      : lang === "en-in"
      ? "en-IN"
      : "en";

    const normalized = normalizePunctuationSpacing(text);
    const chunks = this.splitIntoGoogleChunks(normalized, 180);
    const audioBuffers: ArrayBuffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.trim()) continue;

      if (i > 0) {
        // Subtle delay to prevent Google Translate rate limiting (HTTP 429)
        await new Promise((r) => setTimeout(r, 60));
      }

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${targetLang}&client=tw-ob`;

      let response;
      try {
        response = await requestUrl({
          url,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
      } catch (reqErr: any) {
        if (reqErr?.status === 429 || reqErr?.message?.includes("429")) {
          // Subtle backoff retry if Google rate limits
          await new Promise((r) => setTimeout(r, 600));
          response = await requestUrl({
            url,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
        } else {
          throw reqErr;
        }
      }

      if (response && response.status === 200 && response.arrayBuffer && response.arrayBuffer.byteLength > 0) {
        audioBuffers.push(response.arrayBuffer);
      } else {
        throw new Error(`Google Free TTS returned HTTP ${response?.status || "error"}`);
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error("No audio returned from Google TTS");
    }

    return new Blob(audioBuffers, { type: "audio/mp3" });
  }

  private splitIntoGoogleChunks(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];

    // 1. Try breaking at natural punctuation (sentence terminals, semicolons, commas)
    const punctuationRegex = /.*?[.!?।॥؟۔;,]+['"”’»\)\]]*(?=\s|$)|.+$/gu;
    const punctMatches = text.match(punctuationRegex);

    if (punctMatches && punctMatches.length > 1) {
      const chunks: string[] = [];
      let current = "";
      for (const m of punctMatches) {
        const piece = m.trim();
        if ((current + " " + piece).trim().length > maxLen && current.length > 0) {
          chunks.push(current.trim());
          current = piece;
        } else {
          current = current ? `${current} ${piece}` : piece;
        }
      }
      if (current.trim().length > 0) {
        chunks.push(current.trim());
      }
      if (chunks.length > 1) return chunks;
    }

    // 2. Word boundary fallback
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }

    if (current.trim().length > 0) {
      chunks.push(current.trim());
    }

    return chunks;
  }
}
