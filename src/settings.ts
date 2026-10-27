import { SpeechCraftSettings } from "./types";

export const DEFAULT_SETTINGS: SpeechCraftSettings = {
  provider: "google",
  googleApiKey: "",
  useKeychain: true,
  googleApiSecretId: "",
  customApiSecretId: "",
  autoDetectLanguage: true,
  highlightActiveSentence: true,
  autoPauseOnEdit: true,
  rememberPlaybackPosition: true,
  filePositions: {},
  defaultEnglishVoice: "en",
  defaultHindiVoice: "hi",
  rate: 1.0,
  pitch: 0,
  volume: 1.0,
  skipCodeBlocks: true,
  skipFrontmatter: true,
  showFloatingPlayer: true,
  showParagraphHoverPlay: true,
  customEndpoint: "http://localhost:8000/v1/audio/speech",
  customApiKey: "",
  customModel: "tts-1",
  customVoice: "alloy"
};
