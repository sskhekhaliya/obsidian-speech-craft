import { TTSProvider, SynthesisOptions } from "./baseProvider";
import { TTSVoice } from "../types";
import { normalizePunctuationSpacing } from "../utils/markdownCleaner";

const EDGE_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_WS_BASE = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const EDGE_VOICE_LIST_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${EDGE_CLIENT_TOKEN}`;

export const CURATED_EDGE_VOICES: TTSVoice[] = [
  // Hindi Voices
  { id: "hi-IN-SwaraNeural", name: "Swara (Hindi - Female)", lang: "hi-IN", gender: "Female", provider: "edge", localeName: "Hindi (India)" },
  { id: "hi-IN-MadhurNeural", name: "Madhur (Hindi - Male)", lang: "hi-IN", gender: "Male", provider: "edge", localeName: "Hindi (India)" },

  // English (India) Voices
  { id: "en-IN-NeerjaNeural", name: "Neerja (Indian English - Female)", lang: "en-IN", gender: "Female", provider: "edge", localeName: "English (India)" },
  { id: "en-IN-PrabhatNeural", name: "Prabhat (Indian English - Male)", lang: "en-IN", gender: "Male", provider: "edge", localeName: "English (India)" },

  // English (US) Voices
  { id: "en-US-JennyNeural", name: "Jenny (US English - Female)", lang: "en-US", gender: "Female", provider: "edge", localeName: "English (US)" },
  { id: "en-US-GuyNeural", name: "Guy (US English - Male)", lang: "en-US", gender: "Male", provider: "edge", localeName: "English (US)" },
  { id: "en-US-AriaNeural", name: "Aria (US English - Female)", lang: "en-US", gender: "Female", provider: "edge", localeName: "English (US)" },
  { id: "en-US-ChristopherNeural", name: "Christopher (US English - Male)", lang: "en-US", gender: "Male", provider: "edge", localeName: "English (US)" },

  // English (UK) Voices
  { id: "en-GB-SoniaNeural", name: "Sonia (UK English - Female)", lang: "en-GB", gender: "Female", provider: "edge", localeName: "English (UK)" },
  { id: "en-GB-RyanNeural", name: "Ryan (UK English - Male)", lang: "en-GB", gender: "Male", provider: "edge", localeName: "English (UK)" }
];

export class EdgeTtsProvider implements TTSProvider {
  id = "edge" as const;
  name = "Microsoft Edge TTS (Neural)";
  private cachedVoices: TTSVoice[] | null = null;

  async getVoices(): Promise<TTSVoice[]> {
    if (this.cachedVoices) {
      return this.cachedVoices;
    }

    try {
      const response = await fetch(EDGE_VOICE_LIST_URL);
      if (response.ok) {
        const rawList = await response.json();
        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped: TTSVoice[] = rawList.map((v: any) => ({
            id: v.ShortName || v.Name,
            name: `${v.FriendlyName || v.ShortName}`,
            lang: v.Locale,
            gender: v.Gender,
            provider: "edge",
            localeName: v.LocaleName || v.Locale
          }));

          // Sort so Hindi and English appear first
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

          this.cachedVoices = mapped;
          return mapped;
        }
      }
    } catch (e) {
      console.warn("Speech Craft: Failed to fetch online voice list, using curated voices", e);
    }

    this.cachedVoices = CURATED_EDGE_VOICES;
    return this.cachedVoices;
  }

  async synthesizeToBlob(text: string, voiceId: string, options: SynthesisOptions): Promise<Blob> {
    const connectionId = this.generateUUID();
    const wsUrl = `${EDGE_WS_BASE}?TrustedClientToken=${EDGE_CLIENT_TOKEN}&ConnectionId=${connectionId}`;

    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        return reject(new Error("Failed to initialize WebSocket: " + err));
      }

      ws.binaryType = "arraybuffer";
      const audioChunks: ArrayBuffer[] = [];
      let isCompleted = false;
      let timeoutId: any;
      const resetTimeout = (ms: number = 25000) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            ws.close();
            reject(new Error("Edge TTS request timed out"));
          }
        }, ms);
      };

      // Initial connection timeout: 35 seconds
      resetTimeout(35000);

      ws.onopen = () => {
        const dateStr = new Date().toUTCString();

        // 1. Send speech.config
        const configMsg =
          `X-Timestamp:${dateStr}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false"
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                }
              }
            }
          });
        ws.send(configMsg);

        // 2. Prepare SSML
        const requestId = this.generateUUID();
        const ratePercent = Math.round((options.rate - 1.0) * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
        const pitchHz = Math.round(options.pitch || 0);
        const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;
        const volumePercent = Math.round((options.volume - 1.0) * 100);
        const volumeStr = volumePercent >= 0 ? `+${volumePercent}%` : `${volumePercent}%`;

        const normalized = normalizePunctuationSpacing(text);
        let escapedText = this.escapeXml(normalized);

        // Inject natural pauses at commas and punctuation
        escapedText = escapedText.replace(/,(\s*)/g, ', <break strength="weak"/>$1');
        escapedText = escapedText.replace(/;(\s*)/g, '; <break strength="weak"/>$1');
        escapedText = escapedText.replace(/([—–]|\s--\s)/g, ' <break strength="weak"/> ');
        escapedText = escapedText.replace(/([।॥])(\s*)/g, '$1 <break strength="medium"/>$2');

        let resolvedVoice = voiceId;
        if (resolvedVoice === "hi" || (resolvedVoice.startsWith("hi-IN") && !resolvedVoice.includes("Neural"))) {
          resolvedVoice = "hi-IN-SwaraNeural";
        } else if (resolvedVoice === "en" || (resolvedVoice.startsWith("en-US") && !resolvedVoice.includes("Neural"))) {
          resolvedVoice = "en-US-JennyNeural";
        }

        const lang = options.lang || (resolvedVoice.startsWith("hi") ? "hi-IN" : "en-US");

        const ssml =
          `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">` +
          `<voice name="${resolvedVoice}">` +
          `<prosody pitch="${pitchStr}" rate="${rateStr}" volume="${volumeStr}">` +
          `${escapedText}` +
          `</prosody>` +
          `</voice>` +
          `</speak>`;

        const ssmlMsg =
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${dateStr}\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml;

        ws.send(ssmlMsg);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === "string") {
          // Text frames check for turn.end
          if (event.data.includes("Path:turn.end")) {
            isCompleted = true;
            clearTimeout(timeoutId);
            ws.close();
            if (audioChunks.length === 0) {
              reject(new Error("Edge TTS ended without audio data"));
            } else {
              resolve(new Blob(audioChunks, { type: "audio/mp3" }));
            }
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary frames contain 2-byte header length followed by headers and audio data
          const dataView = new DataView(event.data);
          if (dataView.byteLength > 2) {
            const headerLength = dataView.getInt16(0);
            if (dataView.byteLength > 2 + headerLength) {
              const headerText = new TextDecoder().decode(event.data.slice(2, 2 + headerLength));
              if (headerText.includes("Path:audio")) {
                const audioBuffer = event.data.slice(2 + headerLength);
                if (audioBuffer.byteLength > 0) {
                  audioChunks.push(audioBuffer);
                  resetTimeout(20000);
                }
              }
            }
          }
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeoutId);
        reject(new Error("WebSocket error connecting to Edge TTS service"));
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        if (!isCompleted && audioChunks.length > 0) {
          isCompleted = true;
          resolve(new Blob(audioChunks, { type: "audio/mp3" }));
        }
      };
    });
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private generateUUID(): string {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
