import { TTSProviderType, TTSVoice } from "../types";

export interface SynthesisOptions {
  rate: number;   // 0.5 to 2.5
  pitch: number;  // -50 to +50
  volume: number; // 0.0 to 1.0
  lang?: string;
}

export interface TTSProvider {
  id: TTSProviderType;
  name: string;
  getVoices(): Promise<TTSVoice[]>;
  synthesizeToBlob(text: string, voiceId: string, options: SynthesisOptions): Promise<Blob>;
}
