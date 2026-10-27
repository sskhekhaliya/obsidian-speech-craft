import { TTSProvider, SynthesisOptions } from "./baseProvider";
import { TTSVoice } from "../types";

export interface CustomProviderConfig {
  endpoint: string;
  apiKey?: string;
  model: string;
  voice: string;
}

const DEFAULT_OPENAI_VOICES: TTSVoice[] = [
  { id: "alloy", name: "Alloy", lang: "en", provider: "custom" },
  { id: "echo", name: "Echo", lang: "en", provider: "custom" },
  { id: "fable", name: "Fable", lang: "en", provider: "custom" },
  { id: "onyx", name: "Onyx", lang: "en", provider: "custom" },
  { id: "nova", name: "Nova", lang: "en", provider: "custom" },
  { id: "shimmer", name: "Shimmer", lang: "en", provider: "custom" }
];

export class CustomLocalProvider implements TTSProvider {
  id = "custom" as const;
  name = "Custom / Local Server (OpenAI Compatible)";

  constructor(private getConfig: () => CustomProviderConfig) {}

  async getVoices(): Promise<TTSVoice[]> {
    const config = this.getConfig();
    if (config.voice && !DEFAULT_OPENAI_VOICES.some(v => v.id === config.voice)) {
      return [
        { id: config.voice, name: `${config.voice} (Configured)`, lang: "multilingual", provider: "custom" },
        ...DEFAULT_OPENAI_VOICES
      ];
    }
    return DEFAULT_OPENAI_VOICES;
  }

  async synthesizeToBlob(text: string, voiceId: string, options: SynthesisOptions): Promise<Blob> {
    const config = this.getConfig();
    const endpoint = config.endpoint?.trim() || "http://localhost:8000/v1/audio/speech";

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (config.apiKey && config.apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
    }

    const payload = {
      model: config.model || "tts-1",
      input: text,
      voice: voiceId || config.voice || "alloy",
      speed: Math.max(0.25, Math.min(options.rate, 4.0))
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      throw new Error(`Custom server error (${response.status}): ${errText}`);
    }

    return await response.blob();
  }
}
