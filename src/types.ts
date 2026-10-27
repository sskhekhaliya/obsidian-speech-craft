export type TTSProviderType = 'google' | 'edge' | 'webspeech' | 'custom';

export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'Female' | 'Male' | string;
  provider: TTSProviderType;
  localeName?: string;
}

export interface SentenceSpan {
  text: string;
  cleanText: string;
  docFrom?: number;
  docTo?: number;
  weight: number;
  startRatio: number; // 0.0 to 1.0 within the paragraph
  endRatio: number;   // 0.0 to 1.0 within the paragraph
}

export interface SpeechSegment {
  id: string;
  originalText: string;
  cleanText: string;
  lang: 'hi' | 'en' | 'other';
  voiceId?: string;
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
  docFrom?: number;
  docTo?: number;
  sentences?: SentenceSpan[];
}

export interface FilePlaybackPosition {
  paragraphIndex: number;
  totalParagraphs: number;
  timestamp: number;
}

export interface SpeechCraftSettings {
  provider: TTSProviderType;
  googleApiKey: string;
  useKeychain: boolean;
  googleApiSecretId: string;
  customApiSecretId: string;
  autoDetectLanguage: boolean;
  highlightActiveSentence: boolean;
  autoPauseOnEdit: boolean;
  rememberPlaybackPosition: boolean;
  filePositions: Record<string, FilePlaybackPosition>;
  defaultEnglishVoice: string;
  defaultHindiVoice: string;
  rate: number; // 0.5x - 2.5x
  pitch: number; // -50 to +50
  volume: number; // 0.0 to 1.0
  skipCodeBlocks: boolean;
  skipFrontmatter: boolean;
  showFloatingPlayer: boolean;
  showParagraphHoverPlay: boolean;
  customEndpoint: string;
  customApiKey: string;
  customModel: string;
  customVoice: string;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

export interface AudioPlaybackStatus {
  state: PlaybackState;
  currentSegmentIndex: number;
  totalSegments: number;
  currentTime: number;
  duration: number;
  activeSegment?: SpeechSegment;
}
