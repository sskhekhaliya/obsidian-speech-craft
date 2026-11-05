"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SpeechCraftPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian9 = require("obsidian");

// src/settings.ts
var DEFAULT_SETTINGS = {
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
  rate: 1,
  pitch: 0,
  volume: 1,
  skipCodeBlocks: true,
  skipFrontmatter: true,
  showFloatingPlayer: true,
  showParagraphHoverPlay: true,
  customEndpoint: "http://localhost:8000/v1/audio/speech",
  customApiKey: "",
  customModel: "tts-1",
  customVoice: "alloy"
};

// src/services/ttsManager.ts
var import_obsidian3 = require("obsidian");

// src/utils/markdownCleaner.ts
function cleanMarkdownForTTS(text, options = {}) {
  if (!text) return "";
  let cleaned = text;
  if (options.skipFrontmatter !== false) {
    cleaned = cleaned.replace(/^---[\s\S]*?---\s*/, "");
  }
  if (options.skipCodeBlocks !== false) {
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  }
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, "");
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, "$1");
  cleaned = cleaned.replace(/!\[\[([^\]]+)\]\]/g, "");
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "");
  cleaned = cleaned.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  cleaned = cleaned.replace(/^[\s]*[-*+]\s*\[[ xX]\]\s*/gm, "");
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*>\s*/gm, "");
  cleaned = cleaned.replace(/^[\s]*#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*[-*_]{3,}\s*$/gm, "");
  cleaned = cleaned.replace(/[*_]{3}([^*_]+)[*_]{3}/g, "$1");
  cleaned = cleaned.replace(/[*_]{2}([^*_]+)[*_]{2}/g, "$1");
  cleaned = cleaned.replace(/[*_]([^*_]+)[*_]/g, "$1");
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");
  cleaned = cleaned.replace(/==([^=]+)==/g, "$1");
  cleaned = cleaned.replace(/\[\^[^\]]+\]/g, "");
  cleaned = cleaned.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
  cleaned = normalizePunctuationSpacing(cleaned);
  return cleaned;
}
function normalizePunctuationSpacing(text) {
  if (!text) return "";
  let res = text;
  res = res.replace(/[ \t]+,/g, ",");
  res = res.replace(/,([^\s\d"'’”»\)])/g, ", $1");
  res = res.replace(/;([^\s])/g, "; $1");
  res = res.replace(/(?<!https?):([^\s\/\d])/g, ": $1");
  res = res.replace(/([।॥!?])([^\s"'’”»\d\)])/g, "$1 $2");
  res = res.replace(/([^\s])([—–])([^\s])/g, "$1 $2 $3");
  res = res.replace(/([^\s])--([^\s])/g, "$1 -- $2");
  res = res.replace(/,([\"'“”])/g, ", $1");
  res = res.replace(/(['"“”]),([^\s])/g, "$1, $2");
  res = res.replace(/([.!?।॥]['"”’»\)\]])([^\s\d"'’”»\)])/gu, "$1 $2");
  res = res.replace(/[ \t]+/g, " ");
  return res.trim();
}

// src/providers/edgeTtsProvider.ts
var EDGE_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
var EDGE_WS_BASE = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
var EDGE_VOICE_LIST_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${EDGE_CLIENT_TOKEN}`;
var CURATED_EDGE_VOICES = [
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
var EdgeTtsProvider = class {
  constructor() {
    this.id = "edge";
    this.name = "Microsoft Edge TTS (Neural)";
    this.cachedVoices = null;
  }
  async getVoices() {
    if (this.cachedVoices) {
      return this.cachedVoices;
    }
    try {
      const response = await fetch(EDGE_VOICE_LIST_URL);
      if (response.ok) {
        const rawList = await response.json();
        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped = rawList.map((v) => ({
            id: v.ShortName || v.Name,
            name: `${v.FriendlyName || v.ShortName}`,
            lang: v.Locale,
            gender: v.Gender,
            provider: "edge",
            localeName: v.LocaleName || v.Locale
          }));
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
  async synthesizeToBlob(text, voiceId, options) {
    const connectionId = this.generateUUID();
    const wsUrl = `${EDGE_WS_BASE}?TrustedClientToken=${EDGE_CLIENT_TOKEN}&ConnectionId=${connectionId}`;
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        return reject(new Error("Failed to initialize WebSocket: " + err));
      }
      ws.binaryType = "arraybuffer";
      const audioChunks = [];
      let isCompleted = false;
      let timeoutId;
      const resetTimeout = (ms = 25e3) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            ws.close();
            reject(new Error("Edge TTS request timed out"));
          }
        }, ms);
      };
      resetTimeout(35e3);
      ws.onopen = () => {
        const dateStr = (/* @__PURE__ */ new Date()).toUTCString();
        const configMsg = `X-Timestamp:${dateStr}\r
Content-Type:application/json; charset=utf-8\r
Path:speech.config\r
\r
` + JSON.stringify({
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
        const requestId = this.generateUUID();
        const ratePercent = Math.round((options.rate - 1) * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
        const pitchHz = Math.round(options.pitch || 0);
        const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;
        const volumePercent = Math.round((options.volume - 1) * 100);
        const volumeStr = volumePercent >= 0 ? `+${volumePercent}%` : `${volumePercent}%`;
        const normalized = normalizePunctuationSpacing(text);
        let escapedText = this.escapeXml(normalized);
        escapedText = escapedText.replace(/,(\s*)/g, ', <break strength="weak"/>$1');
        escapedText = escapedText.replace(/;(\s*)/g, '; <break strength="weak"/>$1');
        escapedText = escapedText.replace(/([—–]|\s--\s)/g, ' <break strength="weak"/> ');
        escapedText = escapedText.replace(/([।॥])(\s*)/g, '$1 <break strength="medium"/>$2');
        let resolvedVoice = voiceId;
        if (resolvedVoice === "hi" || resolvedVoice.startsWith("hi-IN") && !resolvedVoice.includes("Neural")) {
          resolvedVoice = "hi-IN-SwaraNeural";
        } else if (resolvedVoice === "en" || resolvedVoice.startsWith("en-US") && !resolvedVoice.includes("Neural")) {
          resolvedVoice = "en-US-JennyNeural";
        }
        const lang = options.lang || (resolvedVoice.startsWith("hi") ? "hi-IN" : "en-US");
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${resolvedVoice}"><prosody pitch="${pitchStr}" rate="${rateStr}" volume="${volumeStr}">${escapedText}</prosody></voice></speak>`;
        const ssmlMsg = `X-RequestId:${requestId}\r
Content-Type:application/ssml+xml\r
X-Timestamp:${dateStr}\r
Path:ssml\r
\r
` + ssml;
        ws.send(ssmlMsg);
      };
      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
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
          const dataView = new DataView(event.data);
          if (dataView.byteLength > 2) {
            const headerLength = dataView.getInt16(0);
            if (dataView.byteLength > 2 + headerLength) {
              const headerText = new TextDecoder().decode(event.data.slice(2, 2 + headerLength));
              if (headerText.includes("Path:audio")) {
                const audioBuffer = event.data.slice(2 + headerLength);
                if (audioBuffer.byteLength > 0) {
                  audioChunks.push(audioBuffer);
                  resetTimeout(2e4);
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
  escapeXml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  generateUUID() {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
};

// src/providers/googleTtsProvider.ts
var import_obsidian = require("obsidian");
var FREE_GOOGLE_VOICES = [
  { id: "hi", name: "Hindi (Google Free)", lang: "hi-IN", provider: "google", localeName: "Hindi (India)" },
  { id: "en", name: "English US (Google Free)", lang: "en-US", provider: "google", localeName: "English (US)" },
  { id: "en-in", name: "English India (Google Free)", lang: "en-IN", provider: "google", localeName: "English (India)" },
  { id: "en-uk", name: "English UK (Google Free)", lang: "en-GB", provider: "google", localeName: "English (UK)" }
];
var CLOUD_API_GOOGLE_VOICES = [
  // Hindi Cloud Voices
  { id: "hi-IN-Neural2-A", name: "Swara (Hindi - Neural2 Female)", lang: "hi-IN", gender: "Female", provider: "google", localeName: "Hindi (India)" },
  { id: "hi-IN-Neural2-B", name: "Madhur (Hindi - Neural2 Male)", lang: "hi-IN", gender: "Male", provider: "google", localeName: "Hindi (India)" },
  { id: "hi-IN-Neural2-C", name: "Aarav (Hindi - Neural2 Male)", lang: "hi-IN", gender: "Male", provider: "google", localeName: "Hindi (India)" },
  { id: "hi-IN-Neural2-D", name: "Ananya (Hindi - Neural2 Female)", lang: "hi-IN", gender: "Female", provider: "google", localeName: "Hindi (India)" },
  { id: "hi-IN-Wavenet-A", name: "Hindi (WaveNet Female)", lang: "hi-IN", gender: "Female", provider: "google", localeName: "Hindi (India)" },
  { id: "hi-IN-Wavenet-B", name: "Hindi (WaveNet Male)", lang: "hi-IN", gender: "Male", provider: "google", localeName: "Hindi (India)" },
  // English (India) Cloud Voices
  { id: "en-IN-Neural2-A", name: "Indian English (Neural2 Female A)", lang: "en-IN", gender: "Female", provider: "google", localeName: "English (India)" },
  { id: "en-IN-Neural2-B", name: "Indian English (Neural2 Male B)", lang: "en-IN", gender: "Male", provider: "google", localeName: "English (India)" },
  { id: "en-IN-Neural2-C", name: "Indian English (Neural2 Male C)", lang: "en-IN", gender: "Male", provider: "google", localeName: "English (India)" },
  { id: "en-IN-Neural2-D", name: "Indian English (Neural2 Female D)", lang: "en-IN", gender: "Female", provider: "google", localeName: "English (India)" },
  // English (US) Cloud Voices
  { id: "en-US-Journey-F", name: "Journey (US Female - Ultra Expressive)", lang: "en-US", gender: "Female", provider: "google", localeName: "English (US)" },
  { id: "en-US-Journey-O", name: "Journey (US Male - Ultra Expressive)", lang: "en-US", gender: "Male", provider: "google", localeName: "English (US)" },
  { id: "en-US-Neural2-F", name: "US English (Neural2 Female F)", lang: "en-US", gender: "Female", provider: "google", localeName: "English (US)" },
  { id: "en-US-Neural2-C", name: "US English (Neural2 Male C)", lang: "en-US", gender: "Male", provider: "google", localeName: "English (US)" },
  { id: "en-US-Wavenet-D", name: "US English (WaveNet Male D)", lang: "en-US", gender: "Male", provider: "google", localeName: "English (US)" }
];
var GoogleTtsProvider = class {
  constructor(getApiKey) {
    this.getApiKey = getApiKey;
    this.id = "google";
    this.name = "Google Cloud TTS";
    this.cachedApiVoices = null;
  }
  clearCache() {
    this.cachedApiVoices = null;
  }
  async getVoices() {
    const apiKey = this.getApiKey()?.trim();
    if (!apiKey) {
      return FREE_GOOGLE_VOICES;
    }
    if (this.cachedApiVoices) {
      return this.cachedApiVoices;
    }
    const result = [...CLOUD_API_GOOGLE_VOICES];
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
      });
      if (response.status === 200 && response.json?.voices) {
        const rawList = response.json.voices;
        const existingIds = new Set(result.map((v) => v.id));
        for (const v of rawList) {
          if (!existingIds.has(v.name)) {
            const lang = v.languageCodes?.[0] || "";
            if (lang.startsWith("en") || lang.startsWith("hi")) {
              result.push({
                id: v.name,
                name: `${v.name} (${v.ssmlGender || ""})`,
                lang,
                gender: v.ssmlGender,
                provider: "google",
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
  async synthesizeToBlob(text, voiceId, options) {
    const apiKey = this.getApiKey()?.trim();
    if (apiKey) {
      return await this.synthesizeViaCloudApi(text, voiceId, options, apiKey);
    }
    return await this.synthesizeViaFreeEndpoint(text, voiceId, options);
  }
  escapeXml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  buildCloudSsml(text) {
    const normalized = normalizePunctuationSpacing(text);
    const escaped = this.escapeXml(normalized);
    let ssml = escaped.replace(/,(\s*)/g, ', <break strength="weak"/>$1');
    ssml = ssml.replace(/;(\s*)/g, '; <break strength="weak"/>$1');
    ssml = ssml.replace(/(?<!https?):(\s*)/g, ': <break strength="weak"/>$1');
    ssml = ssml.replace(/([—–]|\s--\s)/g, ' <break strength="weak"/> ');
    ssml = ssml.replace(/([।॥])(\s*)/g, '$1 <break strength="medium"/>$2');
    return `<speak>${ssml}</speak>`;
  }
  async synthesizeViaCloudApi(text, voiceId, options, apiKey) {
    let langCode = options.lang || (voiceId.startsWith("hi") ? "hi-IN" : "en-US");
    let selectedVoice = voiceId;
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
        speakingRate: Math.max(0.25, Math.min(options.rate, 4)),
        pitch: Math.max(-20, Math.min(options.pitch || 0, 20))
      }
    };
    const response = await (0, import_obsidian.requestUrl)({
      url: `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.status !== 200 || !response.json?.audioContent) {
      throw new Error(`Google Cloud TTS API Error (${response.status}): ${JSON.stringify(response.json || response.text)}`);
    }
    const binaryStr = atob(response.json.audioContent);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/mp3" });
  }
  async synthesizeViaFreeEndpoint(text, voiceId, options) {
    const lang = voiceId || (options.lang?.startsWith("hi") ? "hi" : "en");
    const targetLang = lang.startsWith("hi") ? "hi" : lang === "en-uk" ? "en-GB" : lang === "en-in" ? "en-IN" : "en";
    const normalized = normalizePunctuationSpacing(text);
    const chunks = this.splitIntoGoogleChunks(normalized, 180);
    const audioBuffers = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.trim()) continue;
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 60));
      }
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${targetLang}&client=tw-ob`;
      let response;
      try {
        response = await (0, import_obsidian.requestUrl)({
          url,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
      } catch (reqErr) {
        if (reqErr?.status === 429 || reqErr?.message?.includes("429")) {
          await new Promise((r) => setTimeout(r, 600));
          response = await (0, import_obsidian.requestUrl)({
            url,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
  splitIntoGoogleChunks(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const punctuationRegex = /.*?[.!?।॥؟۔;,]+['"”’»\)\]]*(?=\s|$)|.+$/gu;
    const punctMatches = text.match(punctuationRegex);
    if (punctMatches && punctMatches.length > 1) {
      const chunks2 = [];
      let current2 = "";
      for (const m of punctMatches) {
        const piece = m.trim();
        if ((current2 + " " + piece).trim().length > maxLen && current2.length > 0) {
          chunks2.push(current2.trim());
          current2 = piece;
        } else {
          current2 = current2 ? `${current2} ${piece}` : piece;
        }
      }
      if (current2.trim().length > 0) {
        chunks2.push(current2.trim());
      }
      if (chunks2.length > 1) return chunks2;
    }
    const words = text.split(/\s+/);
    const chunks = [];
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
};

// src/providers/webSpeechProvider.ts
var WebSpeechProvider = class {
  constructor() {
    this.id = "webspeech";
    this.name = "Web Speech API (100% Offline)";
    this.cachedVoices = null;
    this.activeUtterance = null;
    this.currentText = "";
    this.currentVoiceName = "";
    this.currentOptions = null;
    this.lastCharIndex = 0;
    this.isPaused = false;
    this.pauseHeartbeat = null;
  }
  async getVoices() {
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
      setTimeout(() => {
        if (!this.cachedVoices) {
          voices = window.speechSynthesis.getVoices();
          this.cachedVoices = this.mapVoices(voices || []);
          resolve(this.cachedVoices);
        }
      }, 500);
    });
  }
  mapVoices(voices) {
    const mapped = voices.map((v) => ({
      id: v.name,
      name: `${v.name} (${v.lang})`,
      lang: v.lang,
      provider: "webspeech",
      localeName: v.lang
    }));
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
  speak(text, voiceName, options, onBoundary, onEnd, onError) {
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
        (v) => v.lang.toLowerCase().startsWith("hi") || v.lang.toLowerCase().startsWith("mr") || v.lang.toLowerCase().startsWith("gu")
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
    utterance.pitch = Math.max(0, Math.min(1 + (options.pitch || 0) / 50, 2));
    utterance.volume = Math.max(0, Math.min(options.volume ?? 1, 1));
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
    utterance.onerror = (e) => {
      this.stopPauseHeartbeat();
      this.activeUtterance = null;
      if (this.isPaused || e?.error === "canceled" || e?.error === "interrupted") return;
      onError?.(e);
    };
    this.isPaused = false;
    window.speechSynthesis.speak(utterance);
  }
  pause() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.isPaused = true;
    this.stopPauseHeartbeat();
    if (this.currentText && this.lastCharIndex > 0) {
      this.currentText = this.currentText.slice(this.lastCharIndex).trimStart();
      this.lastCharIndex = 0;
    }
    window.speechSynthesis.cancel();
  }
  startPauseHeartbeat() {
    this.stopPauseHeartbeat();
  }
  stopPauseHeartbeat() {
    if (this.pauseHeartbeat) {
      clearInterval(this.pauseHeartbeat);
      this.pauseHeartbeat = null;
    }
  }
  resume() {
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
  stop() {
    this.isPaused = false;
    this.currentText = "";
    this.lastCharIndex = 0;
    this.stopPauseHeartbeat();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
  }
};

// src/providers/customLocalProvider.ts
var DEFAULT_OPENAI_VOICES = [
  { id: "alloy", name: "Alloy", lang: "en", provider: "custom" },
  { id: "echo", name: "Echo", lang: "en", provider: "custom" },
  { id: "fable", name: "Fable", lang: "en", provider: "custom" },
  { id: "onyx", name: "Onyx", lang: "en", provider: "custom" },
  { id: "nova", name: "Nova", lang: "en", provider: "custom" },
  { id: "shimmer", name: "Shimmer", lang: "en", provider: "custom" }
];
var CustomLocalProvider = class {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.id = "custom";
    this.name = "Custom / Local Server (OpenAI Compatible)";
  }
  async getVoices() {
    const config = this.getConfig();
    if (config.voice && !DEFAULT_OPENAI_VOICES.some((v) => v.id === config.voice)) {
      return [
        { id: config.voice, name: `${config.voice} (Configured)`, lang: "multilingual", provider: "custom" },
        ...DEFAULT_OPENAI_VOICES
      ];
    }
    return DEFAULT_OPENAI_VOICES;
  }
  async synthesizeToBlob(text, voiceId, options) {
    const config = this.getConfig();
    const endpoint = config.endpoint?.trim() || "http://localhost:8000/v1/audio/speech";
    const headers = {
      "Content-Type": "application/json"
    };
    if (config.apiKey && config.apiKey.trim().length > 0) {
      headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
    }
    const payload = {
      model: config.model || "tts-1",
      input: text,
      voice: voiceId || config.voice || "alloy",
      speed: Math.max(0.25, Math.min(options.rate, 4))
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
};

// src/services/keychainService.ts
var KeychainService = class {
  constructor(app) {
    this.app = app;
  }
  /**
   * Checks whether Obsidian native SecretStorage (OS Keychain) is supported
   */
  isAvailable() {
    const secretStorage = this.app.secretStorage;
    return Boolean(secretStorage && typeof secretStorage.getSecret === "function");
  }
  /**
   * Retrieves a secret by ID from Obsidian SecretStorage
   */
  getSecret(secretId) {
    if (!this.isAvailable() || !secretId) return null;
    try {
      const secretStorage = this.app.secretStorage;
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
  async setSecret(secretId, value) {
    if (!this.isAvailable() || !secretId) return false;
    try {
      const secretStorage = this.app.secretStorage;
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
  getGoogleApiKey(settings) {
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
  getCustomApiKey(settings) {
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
};

// src/editor/karaokeHighlight.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var import_obsidian2 = require("obsidian");
var setSpeechHighlight = import_state.StateEffect.define();
var speechHighlightField = import_state.StateField.define({
  create() {
    return import_view.Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setSpeechHighlight)) {
        if (!e.value) {
          return import_view.Decoration.none;
        }
        return import_view.Decoration.set([
          import_view.Decoration.mark({
            class: "speech-craft-karaoke-highlight"
          }).range(e.value.from, e.value.to)
        ]);
      }
    }
    return decorations;
  },
  provide: (f) => import_view.EditorView.decorations.from(f)
});
function applyHighlightToActiveView(app, from, to) {
  const view = app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
  if (!view) return;
  const cmView = view.editor?.cm;
  if (!cmView) return;
  const docLength = cmView.state.doc.length;
  const clampedFrom = Math.max(0, Math.min(from, docLength));
  const clampedTo = Math.max(clampedFrom, Math.min(to, docLength));
  if (clampedFrom === clampedTo) return;
  cmView.dispatch({
    effects: setSpeechHighlight.of({ from: clampedFrom, to: clampedTo })
  });
  try {
    const fromPos = view.editor.offsetToPos(clampedFrom);
    const toPos = view.editor.offsetToPos(clampedTo);
    view.editor.scrollIntoView({ from: fromPos, to: toPos }, true);
  } catch {
  }
}
function clearHighlightFromActiveView(app) {
  const view = app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
  if (!view) return;
  const cmView = view.editor?.cm;
  if (!cmView) return;
  cmView.dispatch({
    effects: setSpeechHighlight.of(null)
  });
}

// src/services/ttsManager.ts
var TTSManager = class {
  constructor(app, settings, keychainService) {
    this.app = app;
    this.settings = settings;
    this.segments = [];
    this.currentSegmentIndex = 0;
    this.state = "idle";
    this.listeners = /* @__PURE__ */ new Set();
    this.blobUrlCache = /* @__PURE__ */ new Map();
    this.prefetchQueue = /* @__PURE__ */ new Set();
    this.lastHighlightedSentence = null;
    this.currentSessionId = 0;
    // Active playback source & WebSpeech timer tracking
    this.activePlaybackSource = "idle";
    this.webSpeechTimer = null;
    this.webSpeechElapsed = 0;
    this.webSpeechDuration = 0;
    this.webSpeechSentences = [];
    this.webSpeechCurrentSentenceIdx = 0;
    this.webSpeechCurrentVoiceId = "";
    this.sessionLanguageOverride = null;
    this.isSwitchingSegment = false;
    this.isUserPaused = false;
    this.isDocumentEdited = false;
    this.keychainService = keychainService || new KeychainService(app);
    this.googleProvider = new GoogleTtsProvider(() => this.keychainService.getGoogleApiKey(this.settings));
    this.edgeProvider = new EdgeTtsProvider();
    this.webSpeechProvider = new WebSpeechProvider();
    this.customProvider = new CustomLocalProvider(() => ({
      endpoint: this.settings.customEndpoint,
      apiKey: this.keychainService.getCustomApiKey(this.settings),
      model: this.settings.customModel,
      voice: this.settings.customVoice
    }));
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.setupAudioListeners();
  }
  setupAudioListeners() {
    this.audio.ontimeupdate = () => {
      this.updateActiveSentenceHighlight();
      this.notify();
    };
    this.audio.onloadedmetadata = () => {
      this.notify();
    };
    this.audio.ondurationchange = () => {
      this.notify();
    };
    this.audio.onplay = () => {
      if (this.state !== "playing") {
        this.setState("playing");
      }
    };
    this.audio.onpause = () => {
      if (!this.isSwitchingSegment && !this.isUserPaused && this.state === "playing") {
        this.setState("paused");
      }
    };
    this.audio.onended = () => {
      if (this.currentSegmentIndex + 1 < this.segments.length) {
        this.playSegment(this.currentSegmentIndex + 1);
      } else {
        new import_obsidian3.Notice("Speech Craft: Finished reading note");
        this.stop();
      }
    };
    this.audio.onerror = (e) => {
      console.warn("Audio element playback error:", e);
      const seg = this.segments[this.currentSegmentIndex];
      if (seg && this.state === "playing" && this.settings.provider !== "webspeech") {
        try {
          const voiceId = this.settings.autoDetectLanguage && seg.lang === "hi" ? this.settings.defaultHindiVoice : this.settings.defaultEnglishVoice;
          this.playViaWebSpeech(seg, voiceId);
          return;
        } catch {
        }
      }
      if (this.state === "playing" && this.currentSegmentIndex + 1 < this.segments.length) {
        this.playSegment(this.currentSegmentIndex + 1);
      } else {
        this.stop();
      }
    };
  }
  updateSettings(settings) {
    this.settings = settings;
    this.googleProvider.clearCache();
    if (this.audio) {
      this.audio.playbackRate = this.settings.rate;
      this.audio.volume = this.settings.volume;
    }
    for (const url of this.blobUrlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
      }
    }
    this.blobUrlCache.clear();
    this.prefetchQueue.clear();
  }
  clearVoiceCache() {
    this.googleProvider.clearCache();
  }
  getCurrentSettings() {
    return this.settings;
  }
  onStatusChange(listener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }
  notify() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }
  getStatus() {
    const activeSeg = this.segments[this.currentSegmentIndex];
    let currentTime = 0;
    let duration = 0;
    if (this.activePlaybackSource === "webspeech") {
      currentTime = this.webSpeechElapsed;
      duration = this.webSpeechDuration;
    } else if (this.audio) {
      currentTime = this.audio.currentTime || 0;
      if (isFinite(this.audio.duration) && this.audio.duration > 0) {
        duration = this.audio.duration;
      } else if (activeSeg) {
        const effectiveRate = Math.max(0.25, this.settings.rate || 1);
        duration = Math.max(currentTime, activeSeg.cleanText.length / (14 * effectiveRate));
      }
    }
    return {
      state: this.state,
      currentSegmentIndex: this.currentSegmentIndex,
      totalSegments: this.segments.length,
      currentTime,
      duration,
      activeSegment: activeSeg
    };
  }
  async getAvailableVoices() {
    switch (this.settings.provider) {
      case "webspeech":
        return await this.webSpeechProvider.getVoices();
      case "edge":
        return await this.edgeProvider.getVoices();
      case "custom":
        return await this.customProvider.getVoices();
      case "google":
      default:
        return await this.googleProvider.getVoices();
    }
  }
  async startPlayback(segments) {
    if (!segments || segments.length === 0) {
      new import_obsidian3.Notice("Speech Craft: No text to speak");
      return;
    }
    this.sessionLanguageOverride = null;
    this.stop();
    this.segments = segments;
    this.currentSegmentIndex = 0;
    await this.playSegment(0);
  }
  async toggleCurrentLanguage() {
    if (this.segments.length === 0) return;
    const segment = this.segments[this.currentSegmentIndex];
    if (!segment) return;
    const newLang = segment.lang === "hi" ? "en" : "hi";
    this.sessionLanguageOverride = newLang;
    let newVoiceId = newLang === "hi" ? this.settings.defaultHindiVoice : this.settings.defaultEnglishVoice;
    if (this.settings.provider === "edge") {
      newVoiceId = newLang === "hi" ? "hi-IN-SwaraNeural" : "en-US-JennyNeural";
    } else if (this.settings.provider === "google") {
      const hasKey = Boolean(this.keychainService.getGoogleApiKey(this.settings));
      if (hasKey) {
        newVoiceId = newLang === "hi" ? "hi-IN-Neural2-A" : "en-US-Neural2-F";
      } else {
        newVoiceId = newLang === "hi" ? "hi" : "en";
      }
    }
    segment.lang = newLang;
    segment.voiceId = newVoiceId;
    const oldUrl = this.blobUrlCache.get(segment.id);
    if (oldUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
      }
      this.blobUrlCache.delete(segment.id);
    }
    delete segment.audioBlob;
    delete segment.audioUrl;
    for (let i = this.currentSegmentIndex + 1; i < this.segments.length; i++) {
      const nextSeg = this.segments[i];
      nextSeg.lang = newLang;
      nextSeg.voiceId = newVoiceId;
      const nextUrl = this.blobUrlCache.get(nextSeg.id);
      if (nextUrl) {
        try {
          URL.revokeObjectURL(nextUrl);
        } catch {
        }
        this.blobUrlCache.delete(nextSeg.id);
      }
      delete nextSeg.audioBlob;
      delete nextSeg.audioUrl;
    }
    this.isSwitchingSegment = true;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    this.stopWebSpeechTimer();
    this.webSpeechProvider.stop();
    new import_obsidian3.Notice(`Speech Craft: Switched language model to ${newLang === "hi" ? "Hindi (HI)" : "English (EN)"}`);
    this.notify();
    this.isUserPaused = false;
    await this.playSegment(this.currentSegmentIndex);
  }
  async playSegment(index, startRatio = 0, explicitSessionId) {
    const sessionId = explicitSessionId !== void 0 ? explicitSessionId : ++this.currentSessionId;
    if (index < 0 || index >= this.segments.length) {
      this.stop();
      return;
    }
    this.isSwitchingSegment = true;
    if (this.audio) {
      this.audio.pause();
    }
    this.stopWebSpeechTimer();
    this.webSpeechProvider.stop();
    this.currentSegmentIndex = index;
    const segment = this.segments[index];
    this.setState("loading");
    if (this.sessionLanguageOverride) {
      segment.lang = this.sessionLanguageOverride;
    }
    let voiceId = segment.voiceId || (segment.lang === "hi" ? "hi" : "en");
    if (this.settings.autoDetectLanguage || this.sessionLanguageOverride) {
      if (segment.lang === "hi") {
        if (this.settings.provider === "edge" && (!this.settings.defaultHindiVoice || this.settings.defaultHindiVoice === "hi")) {
          voiceId = "hi-IN-SwaraNeural";
        } else {
          voiceId = this.settings.defaultHindiVoice || "hi";
        }
      } else {
        if (this.settings.provider === "edge" && (!this.settings.defaultEnglishVoice || this.settings.defaultEnglishVoice === "en")) {
          voiceId = "en-US-JennyNeural";
        } else {
          voiceId = this.settings.defaultEnglishVoice || "en";
        }
      }
    }
    segment.voiceId = voiceId;
    if (this.settings.provider === "webspeech") {
      if (this.currentSessionId !== sessionId) return;
      this.isSwitchingSegment = false;
      this.playViaWebSpeech(segment, voiceId, startRatio);
      return;
    }
    try {
      let audioUrl = this.blobUrlCache.get(segment.id);
      if (!audioUrl) {
        const blob = await this.synthesizeSegmentWithFallback(segment, voiceId);
        if (this.currentSessionId !== sessionId) return;
        audioUrl = URL.createObjectURL(blob);
        this.blobUrlCache.set(segment.id, audioUrl);
        segment.audioBlob = blob;
        segment.audioUrl = audioUrl;
      }
      if (this.currentSessionId !== sessionId) return;
      this.activePlaybackSource = "audio";
      this.audio.src = audioUrl;
      this.audio.playbackRate = this.settings.rate;
      this.audio.volume = this.settings.volume;
      this.audio.currentTime = 0;
      this.lastHighlightedSentence = null;
      if (startRatio > 0) {
        const seekToRatio = () => {
          if (this.currentSessionId !== sessionId) return;
          if (isFinite(this.audio.duration) && this.audio.duration > 0) {
            this.audio.currentTime = Math.min(Math.max(0, this.audio.duration - 0.05), startRatio * this.audio.duration);
            this.updateActiveSentenceHighlight();
          }
        };
        if (this.audio.readyState >= 1) {
          seekToRatio();
        } else {
          this.audio.addEventListener("loadedmetadata", seekToRatio, { once: true });
        }
      }
      if (this.currentSessionId !== sessionId) return;
      if (this.isUserPaused) {
        this.isSwitchingSegment = false;
        return;
      }
      this.isSwitchingSegment = false;
      await this.audio.play();
      if (this.currentSessionId !== sessionId || this.isUserPaused) {
        this.audio.pause();
        return;
      }
      this.setState("playing");
      this.updateActiveSentenceHighlight();
      setTimeout(() => {
        if (this.currentSessionId === sessionId && this.state === "playing") {
          this.prefetchSegment(index + 1);
        }
      }, 500);
    } catch (err) {
      if (this.currentSessionId !== sessionId) return;
      this.isSwitchingSegment = false;
      console.error("Speech Craft Synthesis Error:", err);
      try {
        this.playViaWebSpeech(segment, voiceId, startRatio);
      } catch (fallbackErr) {
        new import_obsidian3.Notice(`Speech Craft Playback Error: ${err.message || err}`);
        this.setState("idle");
      }
    }
  }
  updateActiveSentenceHighlight() {
    if (this.settings.highlightActiveSentence === false) return;
    const segment = this.segments[this.currentSegmentIndex];
    if (!segment) return;
    if (segment.sentences && segment.sentences.length > 0) {
      const duration = this.audio.duration;
      const currentTime = this.audio.currentTime;
      let ratio = 0;
      if (!isNaN(duration) && duration > 0) {
        ratio = Math.max(0, Math.min(1, currentTime / duration));
      }
      let currentSentence = segment.sentences[0];
      for (const sent of segment.sentences) {
        if (ratio >= sent.startRatio) {
          currentSentence = sent;
        } else {
          break;
        }
      }
      if (currentSentence && currentSentence.docFrom !== void 0 && currentSentence.docTo !== void 0) {
        if (this.lastHighlightedSentence !== currentSentence) {
          this.lastHighlightedSentence = currentSentence;
          applyHighlightToActiveView(this.app, currentSentence.docFrom, currentSentence.docTo);
        }
      }
    } else if (segment.docFrom !== void 0 && segment.docTo !== void 0) {
      applyHighlightToActiveView(this.app, segment.docFrom, segment.docTo);
    }
  }
  async synthesizeSegmentWithFallback(segment, voiceId) {
    const primaryProvider = this.getPrimaryProvider();
    try {
      return await primaryProvider.synthesizeToBlob(segment.cleanText, voiceId, {
        rate: this.settings.rate,
        pitch: this.settings.pitch,
        volume: this.settings.volume,
        lang: segment.lang === "hi" ? "hi-IN" : "en-US"
      });
    } catch (primaryErr) {
      console.warn("Primary provider failed, using Google Cloud TTS fallback:", primaryErr);
      return await this.googleProvider.synthesizeToBlob(
        segment.cleanText,
        segment.lang === "hi" ? "hi" : "en",
        {
          rate: this.settings.rate,
          pitch: this.settings.pitch,
          volume: this.settings.volume,
          lang: segment.lang === "hi" ? "hi" : "en"
        }
      );
    }
  }
  async prefetchSegment(index) {
    if (index >= this.segments.length) return;
    const seg = this.segments[index];
    if (this.blobUrlCache.has(seg.id) || this.prefetchQueue.has(seg.id)) return;
    this.prefetchQueue.add(seg.id);
    try {
      const voiceId = this.settings.autoDetectLanguage && seg.lang === "hi" ? this.settings.defaultHindiVoice : this.settings.defaultEnglishVoice;
      const blob = await this.synthesizeSegmentWithFallback(seg, voiceId);
      const url = URL.createObjectURL(blob);
      this.blobUrlCache.set(seg.id, url);
      seg.audioBlob = blob;
      seg.audioUrl = url;
    } catch {
    } finally {
      this.prefetchQueue.delete(seg.id);
    }
  }
  getPrimaryProvider() {
    switch (this.settings.provider) {
      case "edge":
        return this.edgeProvider;
      case "custom":
        return this.customProvider;
      case "google":
      default:
        return this.googleProvider;
    }
  }
  startWebSpeechTimer() {
    this.stopWebSpeechTimer();
    this.webSpeechTimer = setInterval(() => {
      if (this.state === "playing") {
        if (this.webSpeechDuration > 0) {
          this.webSpeechElapsed = Math.min(this.webSpeechDuration, this.webSpeechElapsed + 0.2);
        }
        this.notify();
      }
    }, 200);
  }
  stopWebSpeechTimer() {
    if (this.webSpeechTimer) {
      clearInterval(this.webSpeechTimer);
      this.webSpeechTimer = null;
    }
  }
  playViaWebSpeech(segment, voiceId, startRatio = 0) {
    this.activePlaybackSource = "webspeech";
    if (this.audio) {
      this.audio.pause();
    }
    this.webSpeechProvider.stop();
    this.stopWebSpeechTimer();
    this.webSpeechCurrentVoiceId = voiceId;
    this.webSpeechSentences = segment.sentences && segment.sentences.length > 0 ? segment.sentences : [
      {
        text: segment.cleanText,
        cleanText: segment.cleanText,
        docFrom: segment.docFrom,
        docTo: segment.docTo,
        startRatio: 0,
        endRatio: 1,
        weight: 1
      }
    ];
    const effectiveRate = Math.max(0.25, this.settings.rate || 1);
    this.webSpeechDuration = Math.max(1, segment.cleanText.length / (15 * effectiveRate));
    this.webSpeechElapsed = startRatio > 0 ? startRatio * this.webSpeechDuration : 0;
    let startIdx = 0;
    if (startRatio > 0) {
      for (let i = 0; i < this.webSpeechSentences.length; i++) {
        if (startRatio >= this.webSpeechSentences[i].startRatio) {
          startIdx = i;
        } else {
          break;
        }
      }
    }
    this.webSpeechCurrentSentenceIdx = startIdx;
    this.setState("playing");
    this.startWebSpeechTimer();
    const speakSentenceAt = (idx) => {
      if (this.state !== "playing") return;
      if (idx >= this.webSpeechSentences.length) {
        this.stopWebSpeechTimer();
        if (this.currentSegmentIndex + 1 < this.segments.length) {
          this.playSegment(this.currentSegmentIndex + 1);
        } else {
          new import_obsidian3.Notice("Speech Craft: Finished reading note");
          this.stop();
        }
        return;
      }
      this.webSpeechCurrentSentenceIdx = idx;
      const span = this.webSpeechSentences[idx];
      this.webSpeechElapsed = span.startRatio * this.webSpeechDuration;
      if (this.settings.highlightActiveSentence !== false && span.docFrom !== void 0 && span.docTo !== void 0) {
        applyHighlightToActiveView(this.app, span.docFrom, span.docTo);
      }
      this.webSpeechProvider.speak(
        span.cleanText || span.text,
        voiceId,
        {
          rate: this.settings.rate,
          pitch: this.settings.pitch,
          volume: this.settings.volume
        },
        void 0,
        () => {
          if (this.state === "playing") {
            speakSentenceAt(idx + 1);
          }
        },
        (err) => {
          console.error("Speech Craft WebSpeech Error:", err);
          if (this.state === "playing") {
            if (idx + 1 < this.webSpeechSentences.length) {
              speakSentenceAt(idx + 1);
            } else {
              this.stop();
            }
          }
        }
      );
    };
    speakSentenceAt(this.webSpeechCurrentSentenceIdx);
  }
  async startPlaybackFromIndex(segments, index) {
    await this.startPlaybackFromIndexAndRatio(segments, index, 0);
  }
  async startPlaybackFromIndexAndRatio(segments, index, startRatio = 0) {
    if (!segments || segments.length === 0) return;
    const sessionId = ++this.currentSessionId;
    this.lastHighlightedSentence = null;
    clearHighlightFromActiveView(this.app);
    if (this.audio) {
      this.audio.pause();
    }
    this.stopWebSpeechTimer();
    this.webSpeechProvider.stop();
    this.segments = segments;
    const targetIdx = Math.max(0, Math.min(index, segments.length - 1));
    await this.playSegment(targetIdx, startRatio, sessionId);
    if (this.currentSessionId === sessionId) {
      setTimeout(() => {
        if (this.currentSessionId === sessionId && this.state === "playing") {
          this.prefetchSegment(targetIdx + 1);
        }
      }, 500);
    }
  }
  replayCurrentSegment() {
    if (this.activePlaybackSource === "webspeech") {
      this.playViaWebSpeech(this.segments[this.currentSegmentIndex], this.webSpeechCurrentVoiceId, 0);
    } else if (this.audio && isFinite(this.audio.duration)) {
      this.audio.currentTime = 0;
      if (this.audio.paused) {
        this.audio.play();
      }
      this.setState("playing");
    } else if (this.segments.length > 0) {
      this.playSegment(this.currentSegmentIndex);
    }
  }
  markDocumentEdited() {
    this.isDocumentEdited = true;
  }
  pause() {
    this.isUserPaused = true;
    if (this.activePlaybackSource === "webspeech") {
      this.stopWebSpeechTimer();
      this.webSpeechProvider.pause();
      this.setState("paused");
      return;
    }
    if (this.audio) {
      this.audio.pause();
      this.setState("paused");
    }
  }
  resume() {
    this.isUserPaused = false;
    if (this.isDocumentEdited) {
      this.isDocumentEdited = false;
      if (this.segments.length > 0) {
        this.playSegment(this.currentSegmentIndex);
        return;
      }
    }
    if (this.activePlaybackSource === "webspeech") {
      this.setState("playing");
      this.startWebSpeechTimer();
      if (this.webSpeechSentences && this.webSpeechCurrentSentenceIdx < this.webSpeechSentences.length) {
        const span = this.webSpeechSentences[this.webSpeechCurrentSentenceIdx];
        if (this.settings.highlightActiveSentence !== false && span?.docFrom !== void 0 && span?.docTo !== void 0) {
          applyHighlightToActiveView(this.app, span.docFrom, span.docTo);
        }
      }
      this.webSpeechProvider.resume();
      return;
    }
    if (this.audio && this.audio.paused && this.audio.src) {
      this.audio.play().catch(() => {
        this.playSegment(this.currentSegmentIndex);
      });
      this.setState("playing");
    } else if (this.segments.length > 0 && this.state === "idle") {
      this.playSegment(this.currentSegmentIndex);
    }
  }
  togglePlayPause() {
    if (this.state === "playing" || this.state === "loading") {
      this.pause();
    } else if (this.state === "paused") {
      this.resume();
    } else if (this.state === "idle" && this.segments.length > 0) {
      this.playSegment(this.currentSegmentIndex);
    }
  }
  stop() {
    this.currentSessionId++;
    this.stopWebSpeechTimer();
    this.activePlaybackSource = "idle";
    this.webSpeechElapsed = 0;
    this.webSpeechDuration = 0;
    this.lastHighlightedSentence = null;
    clearHighlightFromActiveView(this.app);
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    this.webSpeechProvider.stop();
    for (const url of this.blobUrlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
      }
    }
    this.blobUrlCache.clear();
    this.prefetchQueue.clear();
    this.segments = [];
    this.currentSegmentIndex = 0;
    this.setState("idle");
  }
  getCurrentSentenceIndex() {
    const segment = this.segments[this.currentSegmentIndex];
    if (!segment || !segment.sentences || segment.sentences.length === 0) {
      return 0;
    }
    const duration = this.audio ? this.audio.duration : 0;
    const currentTime = this.audio ? this.audio.currentTime : 0;
    let ratio = 0;
    if (!isNaN(duration) && duration > 0) {
      ratio = Math.max(0, Math.min(1, currentTime / duration));
    }
    let foundIdx = 0;
    for (let i = 0; i < segment.sentences.length; i++) {
      if (ratio >= segment.sentences[i].startRatio) {
        foundIdx = i;
      } else {
        break;
      }
    }
    return foundIdx;
  }
  nextSentence() {
    if (this.segments.length === 0) return;
    const segment = this.segments[this.currentSegmentIndex];
    if (segment && segment.sentences && segment.sentences.length > 1) {
      const currentSentenceIdx = this.getCurrentSentenceIndex();
      if (currentSentenceIdx + 1 < segment.sentences.length) {
        const nextSent = segment.sentences[currentSentenceIdx + 1];
        if (this.audio && !isNaN(this.audio.duration) && this.audio.duration > 0) {
          this.audio.currentTime = nextSent.startRatio * this.audio.duration;
          this.updateActiveSentenceHighlight();
          this.notify();
          return;
        }
      }
    }
    if (this.currentSegmentIndex + 1 < this.segments.length) {
      this.playSegment(this.currentSegmentIndex + 1, 0);
    }
  }
  previousSentence() {
    if (this.segments.length === 0) return;
    const segment = this.segments[this.currentSegmentIndex];
    if (segment && segment.sentences && segment.sentences.length > 0) {
      const currentSentenceIdx = this.getCurrentSentenceIndex();
      const currentSent = segment.sentences[currentSentenceIdx];
      const duration = this.audio ? this.audio.duration : 0;
      const currentTime = this.audio ? this.audio.currentTime : 0;
      const sentStartTime = !isNaN(duration) && duration > 0 ? currentSent.startRatio * duration : 0;
      if (currentTime - sentStartTime > 1.5 && this.audio) {
        this.audio.currentTime = sentStartTime;
        this.updateActiveSentenceHighlight();
        this.notify();
        return;
      }
      if (currentSentenceIdx > 0) {
        const prevSent = segment.sentences[currentSentenceIdx - 1];
        if (this.audio && !isNaN(this.audio.duration) && this.audio.duration > 0) {
          this.audio.currentTime = prevSent.startRatio * this.audio.duration;
          this.updateActiveSentenceHighlight();
          this.notify();
          return;
        }
      }
    }
    if (this.currentSegmentIndex > 0) {
      const prevSeg = this.segments[this.currentSegmentIndex - 1];
      const lastSentRatio = prevSeg.sentences && prevSeg.sentences.length > 0 ? prevSeg.sentences[prevSeg.sentences.length - 1].startRatio : 0;
      this.playSegment(this.currentSegmentIndex - 1, lastSentRatio);
    } else if (this.audio) {
      this.audio.currentTime = 0;
      this.updateActiveSentenceHighlight();
      this.notify();
    }
  }
  next() {
    if (this.currentSegmentIndex + 1 < this.segments.length) {
      this.playSegment(this.currentSegmentIndex + 1);
    }
  }
  previous() {
    if (this.currentSegmentIndex > 0) {
      this.playSegment(this.currentSegmentIndex - 1);
    }
  }
  getSegments() {
    return this.segments;
  }
  async jumpToParagraph(index) {
    if (this.segments.length === 0) return;
    const targetIdx = Math.max(0, Math.min(index, this.segments.length - 1));
    await this.playSegment(targetIdx, 0);
  }
  seek(seconds) {
    if (this.activePlaybackSource === "webspeech") {
      if (this.webSpeechDuration > 0) {
        const ratio = Math.max(0, Math.min(1, seconds / this.webSpeechDuration));
        this.playSegment(this.currentSegmentIndex, ratio);
      }
      return;
    }
    if (this.audio && isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.notify();
    }
  }
  setRate(rate) {
    this.settings.rate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.notify();
  }
  setState(state) {
    this.state = state;
    this.notify();
  }
};

// src/services/textExtractor.ts
var import_obsidian4 = require("obsidian");

// src/services/languageDetector.ts
function detectLanguage(text) {
  if (!text || text.trim().length === 0) {
    return "en";
  }
  const devanagariMatches = text.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;
  const latinMatches = text.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;
  if (devanagariCount > 0) {
    if (latinCount === 0 || devanagariCount >= latinCount || devanagariCount > 3) {
      return "hi";
    }
  }
  return "en";
}
function splitLongClause(text, maxLen = 320) {
  if (text.length <= maxLen) return [text];
  const clauseRegex = /.*?[;:—–]+['"”’»\)\]]*(?=\s|$)|.+$/gu;
  const clauseMatches = text.match(clauseRegex);
  if (clauseMatches && clauseMatches.length > 1) {
    const res = [];
    for (const cm of clauseMatches) {
      const t = cm.trim();
      if (t.length > maxLen) {
        res.push(...splitByCommaOrWords(t, maxLen));
      } else if (t.length > 0) {
        res.push(t);
      }
    }
    if (res.length > 0) return res;
  }
  return splitByCommaOrWords(text, maxLen);
}
function splitByCommaOrWords(text, maxLen = 320) {
  if (text.length <= maxLen) return [text];
  const commaRegex = /.*?,+['"”’»\)\]]*(?=\s|$)|.+$/gu;
  const commaMatches = text.match(commaRegex);
  if (commaMatches && commaMatches.length > 1) {
    const res = [];
    let current2 = "";
    for (const cm of commaMatches) {
      const t = cm.trim();
      if ((current2 + " " + t).trim().length > maxLen && current2.length > 0) {
        res.push(current2.trim());
        current2 = t;
      } else {
        current2 = current2 ? current2 + " " + t : t;
      }
    }
    if (current2.trim().length > 0) {
      res.push(current2.trim());
    }
    if (res.length > 1) return res;
  }
  const words = text.split(/\s+/);
  const chunks = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}
function splitParagraphIntoSentences(para) {
  if (!para) return [];
  const sentenceRegex = /.*?[.!?।॥؟۔]+['"”’»\)\]]*(?=\s|$)|.+$/gu;
  const matches = para.match(sentenceRegex) || [para];
  const sentences = [];
  for (const s of matches) {
    const trimmed = s.trim();
    if (trimmed.length > 0 && !/^[\s.!?।॥؟۔'"”’»\)\]]+$/.test(trimmed)) {
      sentences.push(trimmed);
    }
  }
  const baseSentences = sentences.length > 0 ? sentences : [para.trim()];
  const refined = [];
  for (const sent of baseSentences) {
    if (sent.length > 350) {
      refined.push(...splitLongClause(sent, 320));
    } else {
      refined.push(sent);
    }
  }
  return refined.length > 0 ? refined : [para.trim()];
}

// src/services/textExtractor.ts
var TextExtractor = class {
  constructor(app, getSettings) {
    this.app = app;
    this.getSettings = getSettings;
  }
  extractFromActiveView(editor) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    const activeEditor = editor || view?.editor;
    if (!activeEditor) {
      return null;
    }
    const settings = this.getSettings();
    const selection = activeEditor.getSelection();
    let textToRead = "";
    let sourceType = "full-note";
    let baseOffset = 0;
    if (selection && selection.trim().length > 0) {
      textToRead = selection;
      sourceType = "selection";
      try {
        baseOffset = activeEditor.posToOffset(activeEditor.getCursor("from"));
      } catch {
        baseOffset = 0;
      }
    } else {
      textToRead = activeEditor.getValue();
      sourceType = "full-note";
      baseOffset = 0;
    }
    if (!textToRead || textToRead.trim().length === 0) {
      return null;
    }
    if (settings.skipFrontmatter !== false && (sourceType === "full-note" || baseOffset === 0)) {
      const fmMatch = textToRead.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
      if (fmMatch) {
        const fmLength = fmMatch[0].length;
        textToRead = textToRead.slice(fmLength);
        baseOffset += fmLength;
      }
    }
    if (!textToRead || textToRead.trim().length === 0) {
      return null;
    }
    const rawBlocks = [];
    const blockRegex = /(?:\r?\n\s*){2,}/g;
    let match;
    let lastIndex = 0;
    while ((match = blockRegex.exec(textToRead)) !== null) {
      const raw = textToRead.slice(lastIndex, match.index);
      if (raw.trim().length > 0) {
        const trimmedStart = raw.search(/\S/);
        const trimmedEnd = raw.search(/\s+$/);
        const from = lastIndex + (trimmedStart >= 0 ? trimmedStart : 0);
        const to = trimmedEnd >= 0 ? lastIndex + trimmedEnd : match.index;
        rawBlocks.push({
          rawText: raw.trim(),
          docFrom: baseOffset + from,
          docTo: baseOffset + to
        });
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < textToRead.length) {
      const raw = textToRead.slice(lastIndex);
      if (raw.trim().length > 0) {
        const trimmedStart = raw.search(/\S/);
        const trimmedEnd = raw.search(/\s+$/);
        const from = lastIndex + (trimmedStart >= 0 ? trimmedStart : 0);
        const to = trimmedEnd >= 0 ? lastIndex + trimmedEnd : textToRead.length;
        rawBlocks.push({
          rawText: raw.trim(),
          docFrom: baseOffset + from,
          docTo: baseOffset + to
        });
      }
    }
    const segments = [];
    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i];
      if (settings.skipFrontmatter && block.rawText.startsWith("---") && block.rawText.endsWith("---")) {
        continue;
      }
      if (settings.skipCodeBlocks && block.rawText.startsWith("```") && block.rawText.endsWith("```")) {
        continue;
      }
      const isPureImage = block.rawText.startsWith("![[") && block.rawText.endsWith("]]") || block.rawText.startsWith("![") && block.rawText.endsWith(")");
      if (isPureImage) {
        continue;
      }
      const cleaned = cleanMarkdownForTTS(block.rawText, {
        skipFrontmatter: true,
        skipCodeBlocks: settings.skipCodeBlocks
      });
      if (!cleaned || cleaned.trim().length === 0) {
        continue;
      }
      const lang = detectLanguage(cleaned);
      let chosenVoice;
      if (settings.autoDetectLanguage) {
        chosenVoice = lang === "hi" ? settings.defaultHindiVoice : settings.defaultEnglishVoice;
      } else {
        chosenVoice = settings.defaultEnglishVoice;
      }
      const sentences = splitParagraphIntoSentences(cleaned);
      const sentenceSpans = [];
      let sentSearchCursor = block.docFrom - baseOffset;
      for (const sent of sentences) {
        const isEndOfSentence = /[.!?।॥؟۔]/.test(sent);
        const pauseWeight = isEndOfSentence ? 14 : 4;
        const weight = Math.max(1, sent.length + pauseWeight);
        let sFrom = baseOffset + sentSearchCursor;
        let sTo = baseOffset + sentSearchCursor + sent.length;
        const sPrefix = sent.slice(0, Math.min(15, sent.length)).trim();
        if (sPrefix.length > 0) {
          let found = textToRead.indexOf(sPrefix, sentSearchCursor);
          if (found === -1) {
            const strippedPrefix = sPrefix.replace(/^['"“‘(]+/, "").slice(0, 10).trim();
            if (strippedPrefix.length > 2) {
              found = textToRead.indexOf(strippedPrefix, sentSearchCursor);
            }
          }
          if (found !== -1 && found < block.docTo - baseOffset) {
            sFrom = baseOffset + found;
            sTo = Math.min(block.docTo, sFrom + sent.length);
            sentSearchCursor = sTo - baseOffset;
          }
        }
        sentenceSpans.push({
          text: sent,
          cleanText: sent,
          docFrom: sFrom,
          docTo: sTo,
          weight,
          startRatio: 0,
          endRatio: 1
        });
      }
      const totalWeight = sentenceSpans.reduce((acc, s) => acc + s.weight, 0);
      let accumulatedWeight = 0;
      for (const span of sentenceSpans) {
        span.startRatio = totalWeight > 0 ? accumulatedWeight / totalWeight : 0;
        accumulatedWeight += span.weight;
        span.endRatio = totalWeight > 0 ? accumulatedWeight / totalWeight : 1;
      }
      segments.push({
        id: `para-${segments.length}-${Date.now()}`,
        originalText: block.rawText,
        cleanText: cleaned,
        lang,
        voiceId: chosenVoice,
        docFrom: block.docFrom,
        docTo: block.docTo,
        sentences: sentenceSpans
      });
    }
    return {
      sourceType,
      segments,
      rawText: textToRead
    };
  }
  /**
   * Finds the segment and specific sentence matching a document character offset
   */
  findSegmentAndSentenceAtOffset(segments, offset) {
    if (segments.length === 0) {
      return { segmentIndex: 0, startRatio: 0 };
    }
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.docFrom !== void 0 && offset <= seg.docFrom) {
        return {
          segmentIndex: i,
          startRatio: 0,
          sentence: seg.sentences?.[0]
        };
      }
      if (seg.docFrom !== void 0 && seg.docTo !== void 0 && offset >= seg.docFrom && offset <= seg.docTo) {
        if (seg.sentences && seg.sentences.length > 0) {
          for (let s = 0; s < seg.sentences.length; s++) {
            const sent = seg.sentences[s];
            const nextSent = seg.sentences[s + 1];
            const sEnd = nextSent?.docFrom !== void 0 ? nextSent.docFrom : sent.docTo !== void 0 ? sent.docTo + 1 : seg.docTo;
            if (sent.docFrom !== void 0 && offset >= sent.docFrom && offset < sEnd) {
              return {
                segmentIndex: i,
                startRatio: sent.startRatio,
                sentence: sent
              };
            }
          }
        }
        return { segmentIndex: i, startRatio: 0, sentence: seg.sentences?.[0] };
      }
      const nextSeg = segments[i + 1];
      if (seg.docTo !== void 0 && offset > seg.docTo && nextSeg && nextSeg.docFrom !== void 0 && offset <= nextSeg.docFrom) {
        return {
          segmentIndex: i + 1,
          startRatio: 0,
          sentence: nextSeg.sentences?.[0]
        };
      }
    }
    const lastIdx = segments.length - 1;
    return {
      segmentIndex: lastIdx,
      startRatio: 0,
      sentence: segments[lastIdx].sentences?.[0]
    };
  }
  /**
   * Finds the segment index matching a specific document character offset
   */
  findSegmentIndexAtOffset(segments, offset) {
    return this.findSegmentAndSentenceAtOffset(segments, offset).segmentIndex;
  }
};

// src/ui/playerBar.ts
var import_obsidian5 = require("obsidian");

// src/utils/time.ts
function formatSeconds(totalSeconds, forceHours = false) {
  if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) {
    totalSeconds = 0;
  }
  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor(rounded % 3600 / 60);
  const seconds = rounded % 60;
  const pad = (num) => num.toString().padStart(2, "0");
  if (hours > 0 || forceHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// src/ui/playerBar.ts
var PlayerBar = class {
  constructor(ttsManager, getSettings, onRateChange) {
    this.ttsManager = ttsManager;
    this.getSettings = getSettings;
    this.onRateChange = onRateChange;
    this.containerEl = null;
    this.unsubscribe = null;
    this.isVisible = false;
    this.currentSpeedIndex = 2;
    this.speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    // UI elements
    this.playPauseBtn = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.stopBtn = null;
    this.speedBtn = null;
    this.progressSlider = null;
    this.timeDisplay = null;
    this.langBadge = null;
    this.segmentCounter = null;
    this.currentState = "idle";
    const currentRate = this.getSettings().rate || 1;
    const matchIdx = this.speedOptions.indexOf(currentRate);
    this.currentSpeedIndex = matchIdx >= 0 ? matchIdx : this.speedOptions.indexOf(1);
  }
  mount(parentEl = document.body) {
    if (this.containerEl) return;
    this.containerEl = parentEl.createDiv({ cls: "speech-craft-pill hidden" });
    this.buildUI(this.containerEl);
    this.unsubscribe = this.ttsManager.onStatusChange((status) => {
      this.updateStatus(status);
    });
  }
  unmount() {
    this.unsubscribe?.();
    this.containerEl?.remove();
    this.containerEl = null;
  }
  updateSettings(settings) {
    const currentRate = settings.rate || 1;
    const matchIdx = this.speedOptions.indexOf(currentRate);
    this.currentSpeedIndex = matchIdx >= 0 ? matchIdx : this.speedOptions.indexOf(1);
    this.updateSpeedText();
  }
  isBarVisible() {
    return this.isVisible;
  }
  show() {
    if (!this.containerEl) return;
    this.containerEl.removeClass("hidden");
    const changed = !this.isVisible;
    this.isVisible = true;
    if (changed) {
      this.onVisibilityChange?.(true);
    }
  }
  hide() {
    if (!this.containerEl) return;
    this.containerEl.addClass("hidden");
    const changed = this.isVisible;
    this.isVisible = false;
    if (changed) {
      this.onVisibilityChange?.(false);
    }
  }
  buildUI(el) {
    const progressGroup = el.createDiv({ cls: "sc-pill-progress-group" });
    this.progressSlider = progressGroup.createEl("input", {
      type: "range",
      cls: "sc-pill-slider",
      value: "0"
    });
    this.progressSlider.min = "0";
    this.progressSlider.max = "100";
    this.progressSlider.step = "0.5";
    this.progressSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      this.progressSlider?.style.setProperty("--slider-progress", `${val}%`);
      const status = this.ttsManager.getStatus();
      if (status.duration > 0) {
        this.ttsManager.seek(val / 100 * status.duration);
      }
    };
    this.timeDisplay = progressGroup.createSpan({
      cls: "sc-pill-time",
      text: "00:00 / 00:00"
    });
    el.createDiv({ cls: "sc-pill-divider sc-pill-divider-desktop-1" });
    el.createDiv({ cls: "sc-pill-divider sc-pill-divider-desktop-2" });
    const controlsRow = el.createDiv({ cls: "sc-pill-controls-row" });
    const badgeGroup = controlsRow.createDiv({ cls: "sc-pill-badge-group" });
    this.langBadge = badgeGroup.createSpan({
      cls: "sc-pill-badge sc-pill-badge-clickable",
      text: "EN",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-label": "Language: English (Click to switch to Hindi)",
        title: "Language: English (Click to switch to Hindi)"
      }
    });
    this.langBadge.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ttsManager.toggleCurrentLanguage();
    };
    this.langBadge.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.ttsManager.toggleCurrentLanguage();
      }
    };
    this.segmentCounter = badgeGroup.createSpan({
      cls: "sc-pill-counter sc-pill-counter-clickable",
      text: "\xB6 1/1",
      attr: {
        "aria-label": "Paragraph 1 of 1",
        title: "Paragraph 1 of 1 (Click to jump to paragraph)"
      }
    });
    this.segmentCounter.onclick = () => {
      this.onJumpRequest?.();
    };
    const controls = controlsRow.createDiv({ cls: "sc-pill-controls" });
    this.prevBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-nav",
      attr: {
        "aria-label": "Previous sentence (Alt+Left)",
        title: "Previous sentence (Alt+Left) | Right-click: Previous paragraph"
      }
    });
    (0, import_obsidian5.setIcon)(this.prevBtn, "chevron-left");
    this.prevBtn.onclick = () => this.ttsManager.previousSentence();
    this.prevBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ttsManager.previous();
    });
    this.playPauseBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-play",
      attr: { "aria-label": "Play / Pause" }
    });
    (0, import_obsidian5.setIcon)(this.playPauseBtn, "play");
    this.playPauseBtn.onclick = () => this.ttsManager.togglePlayPause();
    this.nextBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-nav",
      attr: {
        "aria-label": "Next sentence (Alt+Right)",
        title: "Next sentence (Alt+Right) | Right-click: Next paragraph"
      }
    });
    (0, import_obsidian5.setIcon)(this.nextBtn, "chevron-right");
    this.nextBtn.onclick = () => this.ttsManager.nextSentence();
    this.nextBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.ttsManager.next();
    });
    this.stopBtn = controls.createEl("button", {
      cls: "sc-pill-btn sc-pill-btn-nav",
      attr: { "aria-label": "Stop" }
    });
    (0, import_obsidian5.setIcon)(this.stopBtn, "square");
    this.stopBtn.onclick = () => {
      this.ttsManager.stop();
      this.hide();
    };
    const trailingGroup = controlsRow.createDiv({ cls: "sc-pill-trailing-group" });
    this.speedBtn = trailingGroup.createEl("button", {
      cls: "sc-pill-speed",
      attr: {
        "aria-label": "Playback speed (Left click: Increase, Right click: Decrease)",
        title: "Left-click: Increase speed | Right-click: Decrease speed"
      }
    });
    this.updateSpeedText();
    this.speedBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.increaseSpeed();
    });
    this.speedBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.decreaseSpeed();
    });
    const closeBtn = trailingGroup.createEl("button", {
      cls: "sc-pill-btn sc-pill-close",
      attr: { "aria-label": "Close player", title: "Close player" }
    });
    (0, import_obsidian5.setIcon)(closeBtn, "x");
    closeBtn.onclick = () => {
      this.ttsManager.stop();
      this.hide();
    };
  }
  increaseSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedOptions.length;
    const rate = this.speedOptions[this.currentSpeedIndex];
    this.ttsManager.setRate(rate);
    this.updateSpeedText();
    this.onRateChange?.(rate);
  }
  decreaseSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex - 1 + this.speedOptions.length) % this.speedOptions.length;
    const rate = this.speedOptions[this.currentSpeedIndex];
    this.ttsManager.setRate(rate);
    this.updateSpeedText();
    this.onRateChange?.(rate);
  }
  updateSpeedText() {
    if (this.speedBtn) {
      const rate = this.speedOptions[this.currentSpeedIndex];
      this.speedBtn.setText(`${rate}x`);
    }
  }
  updateStatus(status) {
    if (status.state === "idle") {
      if (this.isVisible) {
        this.hide();
      }
      return;
    }
    if (!this.isVisible) {
      this.show();
    }
    if (this.playPauseBtn && this.currentState !== status.state) {
      this.currentState = status.state;
      this.playPauseBtn.empty();
      if (status.state === "loading") {
        (0, import_obsidian5.setIcon)(this.playPauseBtn, "loader-2");
        this.playPauseBtn.addClass("sc-spin");
      } else if (status.state === "playing") {
        (0, import_obsidian5.setIcon)(this.playPauseBtn, "pause");
        this.playPauseBtn.removeClass("sc-spin");
      } else {
        (0, import_obsidian5.setIcon)(this.playPauseBtn, "play");
        this.playPauseBtn.removeClass("sc-spin");
      }
    }
    if (this.langBadge && status.activeSegment) {
      if (status.activeSegment.lang === "hi") {
        this.langBadge.setText("HI");
        this.langBadge.addClass("sc-badge-hi");
        this.langBadge.setAttribute("title", "Language: Hindi (Click to switch to English)");
        this.langBadge.setAttribute("aria-label", "Language: Hindi (Click to switch to English)");
      } else {
        this.langBadge.setText("EN");
        this.langBadge.removeClass("sc-badge-hi");
        this.langBadge.setAttribute("title", "Language: English (Click to switch to Hindi)");
        this.langBadge.setAttribute("aria-label", "Language: English (Click to switch to Hindi)");
      }
    }
    if (this.segmentCounter) {
      const current = status.totalSegments > 0 ? status.currentSegmentIndex + 1 : 0;
      this.segmentCounter.setText(`\xB6 ${current}/${status.totalSegments}`);
      this.segmentCounter.setAttribute(
        "title",
        `Paragraph ${current} of ${status.totalSegments} (Click to jump to paragraph)`
      );
      this.segmentCounter.setAttribute(
        "aria-label",
        `Paragraph ${current} of ${status.totalSegments}`
      );
    }
    if (this.timeDisplay) {
      const cur = formatSeconds(status.currentTime);
      const total = status.duration > 0 ? formatSeconds(status.duration) : "00:00";
      this.timeDisplay.setText(`${cur} / ${total}`);
    }
    if (this.progressSlider && status.duration > 0) {
      const percent = Math.min(100, Math.max(0, status.currentTime / status.duration * 100));
      this.progressSlider.value = percent.toFixed(1);
      this.progressSlider.style.setProperty("--slider-progress", `${percent.toFixed(1)}%`);
    }
  }
};

// src/ui/settingsTab.ts
var obsidian = __toESM(require("obsidian"));
var import_obsidian6 = require("obsidian");
var SpeechCraftSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  async display() {
    const { containerEl } = this;
    containerEl.empty();
    const SecretComponentClass = obsidian.SecretComponent;
    const isKeychainSupported = this.plugin.keychainService.isAvailable();
    containerEl.createEl("h2", { text: "Speech Craft Settings" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Configure text-to-speech providers, voices, OS Keychain secrets, and translation proofreading."
    });
    containerEl.createEl("h3", { text: "TTS Engine & Provider" });
    new import_obsidian6.Setting(containerEl).setName("Active Provider").setDesc("Select the speech engine. Google Cloud TTS works both free (zero key) and with your official Google Cloud API key.").addDropdown((dropdown) => {
      dropdown.addOption("google", "Google Cloud TTS (Free & Official API)").addOption("edge", "Microsoft Edge TTS (Neural Voices)").addOption("webspeech", "Web Speech API (100% Offline / Local OS)").addOption("custom", "Custom / Local Server (OpenAI Compatible, Piper/XTTS)").setValue(this.plugin.settings.provider).onChange(async (val) => {
        this.plugin.settings.provider = val;
        const hasGoogleKey = Boolean(this.plugin.keychainService.getGoogleApiKey(this.plugin.settings));
        if (val === "google") {
          if (hasGoogleKey) {
            this.plugin.settings.defaultEnglishVoice = "en-US-Neural2-F";
            this.plugin.settings.defaultHindiVoice = "hi-IN-Neural2-A";
          } else {
            this.plugin.settings.defaultEnglishVoice = "en";
            this.plugin.settings.defaultHindiVoice = "hi";
          }
        } else if (val === "edge") {
          this.plugin.settings.defaultEnglishVoice = "en-US-JennyNeural";
          this.plugin.settings.defaultHindiVoice = "hi-IN-SwaraNeural";
        } else if (val === "custom") {
          this.plugin.settings.defaultEnglishVoice = "alloy";
          this.plugin.settings.defaultHindiVoice = "alloy";
        }
        await this.plugin.saveSettings();
        this.display();
      });
    });
    let secretCompInstance = null;
    if (this.plugin.settings.provider === "google") {
      const useKeychain = Boolean(
        this.plugin.settings.useKeychain || isKeychainSupported && Boolean(this.plugin.settings.googleApiSecretId)
      );
      if (isKeychainSupported) {
        new import_obsidian6.Setting(containerEl).setName("Use Obsidian Keychain (SecretStorage)").setDesc(
          isKeychainSupported ? "Store and select your Google Cloud API key securely from your Obsidian Keychain instead of plaintext." : "Obsidian Keychain (SecretStorage) is supported in Obsidian v1.11.4+. You are currently using plaintext storage."
        ).addToggle((toggle) => {
          toggle.setValue(useKeychain).setDisabled(!isKeychainSupported).onChange(async (val) => {
            this.plugin.settings.useKeychain = val;
            await this.plugin.saveSettings();
            this.display();
          });
        });
      }
      if (useKeychain && isKeychainSupported) {
        if (SecretComponentClass) {
          new import_obsidian6.Setting(containerEl).setName("Keychain Secret").setDesc("Select an existing secret or click '+' to create a secret containing your Google Cloud API key.").addComponent((cb) => {
            secretCompInstance = new SecretComponentClass(this.app, cb);
            secretCompInstance.setValue(this.plugin.settings.googleApiSecretId || "").onChange(async (val) => {
              this.plugin.settings.googleApiSecretId = val;
              const key = this.plugin.keychainService.getGoogleApiKey(this.plugin.settings);
              if (key) {
                if (this.plugin.settings.defaultEnglishVoice === "en") {
                  this.plugin.settings.defaultEnglishVoice = "en-US-Neural2-F";
                }
                if (this.plugin.settings.defaultHindiVoice === "hi") {
                  this.plugin.settings.defaultHindiVoice = "hi-IN-Neural2-A";
                }
              }
              await this.plugin.saveSettings();
              this.plugin.ttsManager.clearVoiceCache();
              await renderVoicesSection();
            });
            return secretCompInstance;
          }).addButton((btn) => {
            btn.setButtonText("Test Key").setCta().onClick(async () => {
              const key = this.plugin.keychainService.getGoogleApiKey(this.plugin.settings);
              if (!key) {
                new import_obsidian6.Notice("No secret selected or secret is empty in Obsidian Keychain.");
                return;
              }
              btn.setButtonText("Testing...");
              btn.setDisabled(true);
              try {
                const testUrl = `https://texttospeech.googleapis.com/v1/voices?key=${key}`;
                const res = await obsidian.requestUrl({ url: testUrl });
                if (res.status === 200) {
                  new import_obsidian6.Notice("Google Cloud API Key verified! Unlocked Neural2 & Journey voices.");
                  if (this.plugin.settings.defaultEnglishVoice === "en") {
                    this.plugin.settings.defaultEnglishVoice = "en-US-Neural2-F";
                  }
                  if (this.plugin.settings.defaultHindiVoice === "hi") {
                    this.plugin.settings.defaultHindiVoice = "hi-IN-Neural2-A";
                  }
                  await this.plugin.saveSettings();
                  this.plugin.ttsManager.clearVoiceCache();
                  await renderVoicesSection();
                } else {
                  new import_obsidian6.Notice(`Google Cloud API returned status ${res.status}`);
                }
              } catch (err) {
                new import_obsidian6.Notice(`Failed to verify key: ${err?.message || "Invalid API key"}`);
              } finally {
                btn.setButtonText("Test Key");
                btn.setDisabled(false);
              }
            });
          });
        } else {
          new import_obsidian6.Setting(containerEl).setName("Keychain Secret Identifier").setDesc("Enter the name of your secret in Obsidian Keychain.").addText((text) => {
            text.setPlaceholder("e.g. google-cloud-api-key").setValue(this.plugin.settings.googleApiSecretId || "").onChange(async (val) => {
              this.plugin.settings.googleApiSecretId = val.trim();
              await this.plugin.saveSettings();
              this.plugin.ttsManager.clearVoiceCache();
              await renderVoicesSection();
            });
          });
        }
        const secretStorage = this.app.secretStorage;
        if (secretStorage && typeof secretStorage.setSecret === "function") {
          let saveKeyInput = "";
          new import_obsidian6.Setting(containerEl).setName("Save New API Key to Keychain").setDesc("Paste a Google Cloud API key to store it securely into Obsidian Keychain as 'google-cloud-api-key'.").addText((text) => {
            text.setPlaceholder("AIzaSy...").onChange((val) => {
              saveKeyInput = val.trim();
            });
            text.inputEl.type = "password";
            text.inputEl.style.width = "220px";
          }).addButton((btn) => {
            btn.setButtonText("Save to Keychain").onClick(async () => {
              if (!saveKeyInput) {
                new import_obsidian6.Notice("Please enter a valid Google Cloud API key.");
                return;
              }
              try {
                await secretStorage.setSecret("google-cloud-api-key", saveKeyInput);
                this.plugin.settings.googleApiSecretId = "google-cloud-api-key";
                this.plugin.settings.googleApiKey = "";
                this.plugin.settings.useKeychain = true;
                if (this.plugin.settings.defaultEnglishVoice === "en") {
                  this.plugin.settings.defaultEnglishVoice = "en-US-Neural2-F";
                }
                if (this.plugin.settings.defaultHindiVoice === "hi") {
                  this.plugin.settings.defaultHindiVoice = "hi-IN-Neural2-A";
                }
                await this.plugin.saveSettings();
                this.plugin.ttsManager.clearVoiceCache();
                if (secretCompInstance) {
                  secretCompInstance.setValue("google-cloud-api-key");
                }
                await renderVoicesSection();
                new import_obsidian6.Notice("Saved Google Cloud API key to Obsidian Keychain and unlocked Neural voices!");
              } catch (err) {
                new import_obsidian6.Notice(`Failed to save to Keychain: ${err?.message || "Unknown error"}`);
              }
            });
          });
        }
      } else {
        new import_obsidian6.Setting(containerEl).setName("Google Cloud API Key (Optional)").setDesc("Leave empty to use the 100% free Google TTS service. Enter your key to unlock premium Neural2, Journey, and WaveNet voices.").addText((text) => {
          text.setPlaceholder("AIzaSy...").setValue(this.plugin.settings.googleApiKey).onChange(async (val) => {
            this.plugin.settings.googleApiKey = val.trim();
            await this.plugin.saveSettings();
            this.plugin.ttsManager.clearVoiceCache();
            await renderVoicesSection();
          });
        });
      }
    } else if (this.plugin.settings.provider === "custom") {
      new import_obsidian6.Setting(containerEl).setName("API Endpoint").setDesc("The full URL of the OpenAI-compatible speech endpoint (e.g. LocalAI, Piper HTTP server, XTTS).").addText((text) => {
        text.setPlaceholder("http://localhost:8000/v1/audio/speech").setValue(this.plugin.settings.customEndpoint).onChange(async (val) => {
          this.plugin.settings.customEndpoint = val.trim();
          await this.plugin.saveSettings();
        });
      });
      const useCustomKeychain = Boolean(
        this.plugin.settings.useKeychain || isKeychainSupported && Boolean(this.plugin.settings.customApiSecretId)
      );
      if (isKeychainSupported) {
        new import_obsidian6.Setting(containerEl).setName("Use Obsidian Keychain (SecretStorage)").setDesc("Select or create your API key securely from your Obsidian Keychain.").addToggle((toggle) => {
          toggle.setValue(useCustomKeychain).setDisabled(!isKeychainSupported).onChange(async (val) => {
            this.plugin.settings.useKeychain = val;
            await this.plugin.saveSettings();
            this.display();
          });
        });
      }
      if (useCustomKeychain && isKeychainSupported) {
        if (SecretComponentClass) {
          new import_obsidian6.Setting(containerEl).setName("Keychain Secret").setDesc("Select an existing secret or click '+' to create a secret containing your custom server / OpenAI API key.").addComponent((cb) => {
            const comp = new SecretComponentClass(this.app, cb);
            comp.setValue(this.plugin.settings.customApiSecretId || "").onChange(async (val) => {
              this.plugin.settings.customApiSecretId = val;
              await this.plugin.saveSettings();
            });
            return comp;
          });
        } else {
          new import_obsidian6.Setting(containerEl).setName("Keychain Secret Identifier").setDesc("Enter the name of your secret in Obsidian Keychain.").addText((text) => {
            text.setPlaceholder("e.g. openai-api-key").setValue(this.plugin.settings.customApiSecretId || "").onChange(async (val) => {
              this.plugin.settings.customApiSecretId = val.trim();
              await this.plugin.saveSettings();
            });
          });
        }
      } else {
        new import_obsidian6.Setting(containerEl).setName("API Key (Optional)").setDesc("Leave empty for local servers without authentication.").addText((text) => {
          text.setPlaceholder("sk-...").setValue(this.plugin.settings.customApiKey).onChange(async (val) => {
            this.plugin.settings.customApiKey = val.trim();
            await this.plugin.saveSettings();
          });
        });
      }
      new import_obsidian6.Setting(containerEl).setName("Model Name").setDesc("Model identifier (e.g. tts-1 or local model name).").addText((text) => {
        text.setPlaceholder("tts-1").setValue(this.plugin.settings.customModel).onChange(async (val) => {
          this.plugin.settings.customModel = val.trim();
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian6.Setting(containerEl).setName("Voice Name").setDesc("Voice name to send in the request payload.").addText((text) => {
        text.setPlaceholder("alloy").setValue(this.plugin.settings.customVoice).onChange(async (val) => {
          this.plugin.settings.customVoice = val.trim();
          await this.plugin.saveSettings();
        });
      });
    }
    const voicesContainer = containerEl.createDiv({ cls: "speech-craft-voices-container" });
    const renderVoicesSection = async () => {
      voicesContainer.empty();
      voicesContainer.createEl("h3", { text: "Language & Voices" });
      new import_obsidian6.Setting(voicesContainer).setName("Smart Hindi & English Auto-Detection").setDesc("Automatically detect Devanagari script (Hindi) and English text in your notes and route each sentence to the matching voice.").addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoDetectLanguage).onChange(async (val) => {
          this.plugin.settings.autoDetectLanguage = val;
          await this.plugin.saveSettings();
        });
      });
      const voices = await this.plugin.ttsManager.getAvailableVoices();
      const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
      const hindiVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("hi"));
      if (this.plugin.settings.provider === "google") {
        const hasKey = Boolean(this.plugin.keychainService.getGoogleApiKey(this.plugin.settings));
        const bannerDiv = voicesContainer.createDiv({ cls: "setting-item-description" });
        bannerDiv.style.padding = "6px 10px";
        bannerDiv.style.borderRadius = "6px";
        bannerDiv.style.marginBottom = "14px";
        bannerDiv.style.fontWeight = "500";
        if (hasKey) {
          bannerDiv.style.backgroundColor = "rgba(46, 160, 67, 0.15)";
          bannerDiv.style.color = "var(--text-success, #2ea043)";
          bannerDiv.setText("Google Cloud API Key Active \u2014 Premium Neural2, Journey & WaveNet voices unlocked!");
        } else {
          bannerDiv.style.backgroundColor = "rgba(128, 128, 128, 0.1)";
          bannerDiv.style.color = "var(--text-muted)";
          bannerDiv.setText("Free Google TTS Active \u2014 Using standard voices. Select a Keychain secret or add an API key above to unlock Neural voices.");
        }
      }
      if (englishVoices.length > 0 && !englishVoices.some((v) => v.id === this.plugin.settings.defaultEnglishVoice)) {
        this.plugin.settings.defaultEnglishVoice = englishVoices[0].id;
        await this.plugin.saveSettings();
      }
      if (hindiVoices.length > 0 && !hindiVoices.some((v) => v.id === this.plugin.settings.defaultHindiVoice)) {
        this.plugin.settings.defaultHindiVoice = hindiVoices[0].id;
        await this.plugin.saveSettings();
      }
      const enSetting = new import_obsidian6.Setting(voicesContainer).setName("Default English Voice").setDesc("Voice used for English sentences.");
      enSetting.addDropdown((dropdown) => {
        if (englishVoices.length > 0) {
          for (const voice of englishVoices) {
            dropdown.addOption(voice.id, voice.name);
          }
        } else {
          dropdown.addOption(this.plugin.settings.defaultEnglishVoice, this.plugin.settings.defaultEnglishVoice);
        }
        dropdown.setValue(this.plugin.settings.defaultEnglishVoice);
        dropdown.onChange(async (val) => {
          this.plugin.settings.defaultEnglishVoice = val;
          await this.plugin.saveSettings();
        });
      });
      enSetting.addButton((btn) => {
        btn.setIcon("volume-2").setButtonText("Test English").onClick(() => {
          this.previewVoice("Hello! This is a test of your English text to speech settings.", "en");
        });
      });
      const hiSetting = new import_obsidian6.Setting(voicesContainer).setName("Default Hindi Voice").setDesc("Voice used for Hindi / Devanagari sentences.");
      hiSetting.addDropdown((dropdown) => {
        if (hindiVoices.length > 0) {
          for (const voice of hindiVoices) {
            dropdown.addOption(voice.id, voice.name);
          }
        } else {
          dropdown.addOption(this.plugin.settings.defaultHindiVoice, this.plugin.settings.defaultHindiVoice);
        }
        dropdown.setValue(this.plugin.settings.defaultHindiVoice);
        dropdown.onChange(async (val) => {
          this.plugin.settings.defaultHindiVoice = val;
          await this.plugin.saveSettings();
        });
      });
      hiSetting.addButton((btn) => {
        btn.setIcon("volume-2").setButtonText("Test Hindi").onClick(() => {
          this.previewVoice("\u0928\u092E\u0938\u094D\u0924\u0947! \u092F\u0939 \u0906\u092A\u0915\u0940 \u0939\u093F\u0902\u0926\u0940 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u091F\u0942 \u0938\u094D\u092A\u0940\u091A \u0938\u0947\u091F\u093F\u0902\u0917 \u0915\u093E \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u0939\u0948\u0964", "hi");
        });
      });
    };
    await renderVoicesSection();
    containerEl.createEl("h3", { text: "Book Translation & Proofreading" });
    new import_obsidian6.Setting(containerEl).setName("Live Sentence Highlighting & Auto-Scroll").setDesc("Highlight each individual sentence in the editor and auto-scroll smoothly as speech plays.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.highlightActiveSentence).onChange(async (val) => {
        this.plugin.settings.highlightActiveSentence = val;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Show Play Icon on Paragraph Hover").setDesc("Display a subtle play icon in the margin when hovering over a paragraph to jump directly from it while the player is active.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showParagraphHoverPlay !== false).onChange(async (val) => {
        this.plugin.settings.showParagraphHoverPlay = val;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Smart Auto-Pause on Edit").setDesc("Automatically pause speech when you edit or type in the note so you can fix translations without audio talking over you.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.autoPauseOnEdit).onChange(async (val) => {
        this.plugin.settings.autoPauseOnEdit = val;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Remember Playback Position per Note").setDesc("Automatically save where you left off in each note and resume from that paragraph when you come back.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.rememberPlaybackPosition !== false).onChange(async (val) => {
        this.plugin.settings.rememberPlaybackPosition = val;
        await this.plugin.saveSettings();
      });
    });
    const savedCount = Object.keys(this.plugin.settings.filePositions || {}).length;
    if (savedCount > 0) {
      new import_obsidian6.Setting(containerEl).setName("Saved Note Locations").setDesc(`Currently remembering playback locations for ${savedCount} note${savedCount === 1 ? "" : "s"}.`).addButton((btn) => {
        btn.setButtonText("Clear Saved Locations").setWarning().onClick(async () => {
          this.plugin.settings.filePositions = {};
          await this.plugin.saveSettings();
          new import_obsidian6.Notice("Speech Craft: Cleared all saved note playback locations.");
          this.display();
        });
      });
    }
    containerEl.createEl("h3", { text: "Audio & Playback Controls" });
    new import_obsidian6.Setting(containerEl).setName("Default Playback Speed").setDesc("Speed multiplier (0.5x to 2.0x). You can also adjust this dynamically on the player pill.").addSlider((slider) => {
      slider.setLimits(0.5, 2, 0.25).setValue(this.plugin.settings.rate).setDynamicTooltip().onChange(async (val) => {
        this.plugin.settings.rate = val;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Pitch Adjustment").setDesc("Adjust the pitch of speech output (-20 to +20).").addSlider((slider) => {
      slider.setLimits(-20, 20, 1).setValue(this.plugin.settings.pitch || 0).setDynamicTooltip().onChange(async (val) => {
        this.plugin.settings.pitch = val;
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("h3", { text: "Note Content Filters" });
    new import_obsidian6.Setting(containerEl).setName("Skip YAML Frontmatter").setDesc("Ignore frontmatter blocks at the start of notes so tags and metadata aren't spoken.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.skipFrontmatter).onChange(async (val) => {
        this.plugin.settings.skipFrontmatter = val;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Skip Code Blocks").setDesc("Skip code blocks (``` ... ```) during speech playback.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.skipCodeBlocks).onChange(async (val) => {
        this.plugin.settings.skipCodeBlocks = val;
        await this.plugin.saveSettings();
      });
    });
  }
  previewVoice(sampleText, lang) {
    new import_obsidian6.Notice(`Testing ${lang === "hi" ? "Hindi" : "English"} voice...`);
    const voiceId = lang === "hi" ? this.plugin.settings.defaultHindiVoice : this.plugin.settings.defaultEnglishVoice;
    this.plugin.ttsManager.startPlayback([
      {
        id: `preview-${Date.now()}`,
        originalText: sampleText,
        cleanText: sampleText,
        lang,
        voiceId
      }
    ]);
  }
};

// src/editor/paragraphPlayPlugin.ts
var import_state2 = require("@codemirror/state");
var import_view2 = require("@codemirror/view");
var import_obsidian7 = require("obsidian");
var ParagraphPlayWidget = class extends import_view2.WidgetType {
  constructor(pos, plugin) {
    super();
    this.pos = pos;
    this.plugin = plugin;
  }
  eq(other) {
    return this.pos === other.pos;
  }
  toDOM() {
    const btn = document.createElement("span");
    btn.className = "sc-para-play-btn";
    btn.setAttribute("aria-label", "Play from this paragraph");
    btn.setAttribute("title", "Play from this paragraph");
    (0, import_obsidian7.setIcon)(btn, "play");
    btn.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.plugin.isPlayerActive()) return;
      this.plugin.speakFromOffset(this.pos);
    };
    return btn;
  }
  ignoreEvent() {
    return false;
  }
};
function createParagraphPlayExtension(plugin) {
  return import_view2.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.buildDecorations(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged || update.geometryChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }
      buildDecorations(view) {
        if (!plugin.settings.showParagraphHoverPlay) {
          return import_view2.Decoration.none;
        }
        const builder = new import_state2.RangeSetBuilder();
        const doc = view.state.doc;
        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = doc.lineAt(pos);
            const lineText = line.text.trim();
            const isImage = lineText.startsWith("![[") || lineText.startsWith("![") || lineText.startsWith("<img");
            if (lineText.length > 0 && !isImage && !lineText.startsWith("```") && !lineText.startsWith("---") && !lineText.startsWith("<!--")) {
              let isParaStart = false;
              if (line.number === 1) {
                isParaStart = true;
              } else {
                const prevLine = doc.line(line.number - 1);
                const prevTrimmed = prevLine.text.trim();
                const prevIsImage = prevTrimmed.startsWith("![[") || prevTrimmed.startsWith("![") || prevTrimmed.startsWith("<img");
                const prevIsCodeOrRule = prevTrimmed.startsWith("```") || prevTrimmed === "---";
                if (prevTrimmed.length === 0 || prevIsImage || prevIsCodeOrRule) {
                  isParaStart = true;
                }
              }
              if (isParaStart) {
                builder.add(
                  line.from,
                  line.from,
                  import_view2.Decoration.widget({
                    widget: new ParagraphPlayWidget(line.from, plugin),
                    side: -1
                  })
                );
              }
            }
            pos = line.to + 1;
          }
        }
        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}

// src/modals/jumpToParagraphModal.ts
var import_obsidian8 = require("obsidian");
var JumpToParagraphModal = class extends import_obsidian8.Modal {
  constructor(app, segments, currentIndex, onJump, onCloseCallback) {
    super(app);
    this.segments = segments;
    this.currentIndex = currentIndex;
    this.onJump = onJump;
    this.onCloseCallback = onCloseCallback;
    this.filterQuery = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sc-jump-modal");
    const header = contentEl.createDiv({ cls: "sc-jump-header" });
    header.createEl("h2", { text: "Jump to Paragraph" });
    header.createEl("p", {
      cls: "setting-item-description",
      text: `Currently reading Paragraph ${this.currentIndex + 1} of ${this.segments.length}`
    });
    const directRow = contentEl.createDiv({ cls: "sc-jump-direct-row" });
    let inputElRef = null;
    new import_obsidian8.Setting(directRow).setName("Go to paragraph number:").setDesc(`Enter any number from 1 to ${this.segments.length} and press Enter`).addText((text) => {
      inputElRef = text.inputEl;
      text.inputEl.type = "number";
      text.inputEl.min = "1";
      text.inputEl.max = `${this.segments.length}`;
      text.setValue(`${this.currentIndex + 1}`);
      text.inputEl.style.width = "90px";
      text.inputEl.style.textAlign = "center";
      text.inputEl.style.fontWeight = "bold";
      text.inputEl.onkeydown = (e) => {
        if (e.key === "Enter") {
          const num = parseInt(text.getValue().trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= this.segments.length) {
            this.close();
            this.onJump(num - 1);
          }
        }
      };
    }).addButton((btn) => {
      btn.setButtonText("Jump (Enter)").setCta().onClick(() => {
        const num = parseInt(inputElRef?.value || "1", 10);
        if (!isNaN(num) && num >= 1 && num <= this.segments.length) {
          this.close();
          this.onJump(num - 1);
        }
      });
    });
    setTimeout(() => {
      inputElRef?.focus();
      inputElRef?.select();
    }, 50);
    const searchRow = contentEl.createDiv({ cls: "sc-jump-search-row" });
    const searchInput = searchRow.createEl("input", {
      type: "text",
      cls: "sc-jump-search-input",
      placeholder: "Filter paragraphs by text or number..."
    });
    const listContainer = contentEl.createDiv({ cls: "sc-jump-list-container" });
    const renderList = () => {
      listContainer.empty();
      const q = this.filterQuery.toLowerCase().trim();
      const filtered = this.segments.map((seg, idx) => ({ seg, idx })).filter(({ seg, idx }) => {
        if (!q) return true;
        return `\xB6 ${idx + 1}`.includes(q) || `${idx + 1}` === q || seg.cleanText.toLowerCase().includes(q);
      });
      if (filtered.length === 0) {
        listContainer.createDiv({
          cls: "sc-jump-empty",
          text: "No matching paragraphs found."
        });
        return;
      }
      for (const { seg, idx } of filtered) {
        const isCurrent = idx === this.currentIndex;
        const item = listContainer.createDiv({
          cls: `sc-jump-item ${isCurrent ? "is-active" : ""}`
        });
        item.createSpan({
          cls: "sc-jump-item-badge",
          text: `\xB6 ${idx + 1}`
        });
        item.createSpan({
          cls: "sc-jump-item-preview",
          text: seg.cleanText.slice(0, 140) + (seg.cleanText.length > 140 ? "..." : "")
        });
        item.onclick = () => {
          this.close();
          this.onJump(idx);
        };
        if (isCurrent && !q) {
          setTimeout(() => item.scrollIntoView({ block: "center" }), 60);
        }
      }
    };
    searchInput.oninput = (e) => {
      this.filterQuery = e.target.value;
      renderList();
    };
    renderList();
  }
  onClose() {
    this.contentEl.empty();
    this.onCloseCallback?.();
  }
};

// src/main.ts
var SpeechCraftPlugin = class extends import_obsidian9.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.activePlayingFilePath = null;
    this.saveTimeout = null;
    this.activeJumpModal = null;
  }
  async onload() {
    await this.loadSettings();
    this.keychainService = new KeychainService(this.app);
    this.ttsManager = new TTSManager(this.app, this.settings, this.keychainService);
    this.textExtractor = new TextExtractor(this.app, () => this.settings);
    this.registerEditorExtension(speechHighlightField);
    this.registerEditorExtension(createParagraphPlayExtension(this));
    this.registerMarkdownPostProcessor((element) => {
      if (!this.settings.showParagraphHoverPlay) return;
      const paragraphs = element.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
      paragraphs.forEach((p) => {
        const text = p.textContent?.trim();
        if (!text) return;
        const btn = document.createElement("span");
        btn.className = "sc-para-play-btn sc-para-play-btn-reading";
        btn.setAttribute("aria-label", "Play from this paragraph");
        btn.setAttribute("title", "Play from this paragraph");
        (0, import_obsidian9.setIcon)(btn, "play");
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.isPlayerActive()) return;
          const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
          if (view && view.editor) {
            const docText = view.editor.getValue();
            const prefix = text.slice(0, Math.min(30, text.length));
            const idx = docText.indexOf(prefix);
            if (idx !== -1) {
              this.speakFromOffset(idx, view.editor);
            } else {
              this.speakActiveContext(view.editor);
            }
          }
        };
        p.classList.add("sc-para-reading-container");
        p.prepend(btn);
      });
    });
    this.playerBar = new PlayerBar(
      this.ttsManager,
      () => this.settings,
      async (rate) => {
        this.settings.rate = rate;
        await this.saveSettings();
      }
    );
    this.playerBar.onJumpRequest = () => {
      this.openJumpToParagraphModal();
    };
    this.playerBar.onVisibilityChange = () => {
      this.updatePlayerActiveState();
    };
    this.playerBar.mount(document.body);
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("speech-craft-status-bar");
    this.statusBarEl.setText("Speech Craft");
    this.statusBarEl.onclick = () => {
      const status = this.ttsManager.getStatus();
      if (status.state === "idle") {
        this.speakActiveContext();
      } else {
        this.ttsManager.togglePlayPause();
      }
    };
    this.ttsManager.onStatusChange((status) => {
      this.updatePlayerActiveState(status);
      if (this.activePlayingFilePath && status.totalSegments > 0) {
        if (!this.settings.filePositions) {
          this.settings.filePositions = {};
        }
        this.settings.filePositions[this.activePlayingFilePath] = {
          paragraphIndex: status.currentSegmentIndex,
          totalParagraphs: status.totalSegments,
          timestamp: Date.now()
        };
        this.debouncedSaveSettings();
      }
      if (status.state === "playing") {
        this.statusBarEl.setText(`Playing (\xB6 ${status.currentSegmentIndex + 1}/${status.totalSegments})`);
      } else if (status.state === "paused") {
        this.statusBarEl.setText("Paused");
      } else if (status.state === "loading") {
        this.statusBarEl.setText("Synthesizing...");
      } else {
        this.statusBarEl.setText("Speech Craft");
      }
    });
    this.addRibbonIcon("headphones", "Speech Craft: Read note / selection", () => {
      this.speakActiveContext();
    });
    this.registerDomEvent(document, "contextmenu", (evt) => {
      if (!evt.altKey) return;
      const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
      if (!view || !view.editor) return;
      const editorDom = view.editor.cm?.dom || view.contentEl;
      if (!editorDom || !editorDom.contains(evt.target)) return;
      evt.preventDefault();
      evt.stopPropagation();
      let offset = 0;
      const cm = view.editor.cm;
      if (cm && typeof cm.posAtCoords === "function") {
        const cmPos = cm.posAtCoords({ x: evt.clientX, y: evt.clientY });
        if (typeof cmPos === "number") {
          offset = cmPos;
        } else if (cmPos && typeof cmPos.pos === "number") {
          offset = cmPos.pos;
        }
      }
      if (!offset) {
        const cursor = view.editor.getCursor();
        offset = view.editor.posToOffset(cursor);
      }
      this.speakFromOffset(offset, view.editor);
    });
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor) => {
        this.ttsManager.markDocumentEdited();
        if (this.settings.autoPauseOnEdit && this.ttsManager.getStatus().state === "playing") {
          this.ttsManager.pause();
          new import_obsidian9.Notice("Speech Craft: Auto-paused for editing");
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.checkIfPlayingFileWasClosed();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.checkIfPlayingFileWasClosed();
      })
    );
    this.addCommand({
      id: "speak-context",
      name: "Speak Selection or Active Note",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
        if (checking) return !!view;
        this.speakActiveContext();
        return true;
      }
    });
    this.addCommand({
      id: "jump-to-paragraph",
      name: "Jump to Paragraph...",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
        if (checking) return !!view || this.ttsManager.getSegments().length > 0;
        this.openJumpToParagraphModal();
        return true;
      }
    });
    this.addCommand({
      id: "restart-from-beginning",
      name: "Restart Active Note from Beginning (Paragraph 1)",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
        if (checking) return !!view;
        const activeFile = view?.file;
        if (activeFile && this.settings.filePositions) {
          delete this.settings.filePositions[activeFile.path];
          this.saveSettings();
        }
        const extracted = this.textExtractor.extractFromActiveView();
        if (extracted && extracted.segments.length > 0) {
          if (activeFile) this.activePlayingFilePath = activeFile.path;
          this.playerBar.show();
          this.ttsManager.startPlaybackFromIndex(extracted.segments, 0);
          new import_obsidian9.Notice(`Restarted "${activeFile?.basename || "note"}" from Paragraph 1`);
        }
        return true;
      }
    });
    this.addCommand({
      id: "toggle-play-pause",
      name: "Play / Pause",
      callback: () => {
        const status = this.ttsManager.getStatus();
        if (status.state === "idle") {
          this.speakActiveContext();
        } else {
          this.ttsManager.togglePlayPause();
        }
      }
    });
    this.addCommand({
      id: "replay-current-sentence",
      name: "Replay Current Paragraph",
      callback: () => {
        this.ttsManager.replayCurrentSegment();
      }
    });
    this.addCommand({
      id: "reread-sentence-and-continue",
      name: "Re-read Current Sentence & Continue (Resume from Edit)",
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
        if (!view || !view.editor) return;
        const cursor = view.editor.getCursor();
        const offset = view.editor.posToOffset(cursor);
        this.speakFromOffset(offset, view.editor);
      }
    });
    this.addCommand({
      id: "stop-speech",
      name: "Stop Playback",
      callback: () => {
        this.ttsManager.stop();
        this.playerBar.hide();
      }
    });
    this.addCommand({
      id: "next-sentence",
      name: "Next Sentence",
      hotkeys: [{ modifiers: ["Alt"], key: "ArrowRight" }],
      callback: () => {
        this.ttsManager.nextSentence();
      }
    });
    this.addCommand({
      id: "prev-sentence",
      name: "Previous Sentence",
      hotkeys: [{ modifiers: ["Alt"], key: "ArrowLeft" }],
      callback: () => {
        this.ttsManager.previousSentence();
      }
    });
    this.addCommand({
      id: "next-segment",
      name: "Next Paragraph",
      hotkeys: [{ modifiers: ["Alt"], key: "n" }],
      callback: () => {
        this.ttsManager.next();
      }
    });
    this.addCommand({
      id: "prev-segment",
      name: "Previous Paragraph",
      hotkeys: [{ modifiers: ["Alt"], key: "p" }],
      callback: () => {
        this.ttsManager.previous();
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const selection = editor.getSelection();
        if (selection && selection.trim().length > 0) {
          menu.addItem((item) => {
            item.setTitle("Speak Selection (Speech Craft)").setIcon("headphones").onClick(() => {
              this.speakActiveContext(editor);
            });
          });
        }
      })
    );
    this.addSettingTab(new SpeechCraftSettingTab(this.app, this));
    this.updatePlayerActiveState();
  }
  speakActiveContext(editor) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
    const activeFile = view?.file;
    const extracted = this.textExtractor.extractFromActiveView(editor);
    if (!extracted || extracted.segments.length === 0) {
      new import_obsidian9.Notice("Speech Craft: No readable text found in active note");
      return;
    }
    if (activeFile) {
      this.activePlayingFilePath = activeFile.path;
    }
    if (extracted.sourceType === "full-note" && activeFile && this.settings.rememberPlaybackPosition !== false) {
      const saved = this.settings.filePositions?.[activeFile.path];
      if (saved && saved.paragraphIndex > 0 && saved.paragraphIndex < extracted.segments.length) {
        new import_obsidian9.Notice(`\u25B6 Resumed "${activeFile.basename}" from Paragraph ${saved.paragraphIndex + 1} of ${extracted.segments.length}`);
        this.playerBar.show();
        this.ttsManager.startPlaybackFromIndex(extracted.segments, saved.paragraphIndex);
        return;
      }
    }
    const typeMsg = extracted.sourceType === "selection" ? "Speaking selection..." : "Reading active note...";
    new import_obsidian9.Notice(typeMsg);
    this.playerBar.show();
    this.ttsManager.startPlayback(extracted.segments);
  }
  speakFromOffset(offset, editor) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
    const activeEditor = editor || view?.editor;
    if (!activeEditor) return;
    const activeFile = view?.file;
    const extracted = this.textExtractor.extractFromActiveView(activeEditor);
    if (!extracted || extracted.segments.length === 0) {
      new import_obsidian9.Notice("Speech Craft: No readable text found in active note");
      return;
    }
    if (activeFile) {
      this.activePlayingFilePath = activeFile.path;
    }
    const match = this.textExtractor.findSegmentAndSentenceAtOffset(extracted.segments, offset);
    new import_obsidian9.Notice(`Reading Paragraph ${match.segmentIndex + 1} of ${extracted.segments.length}...`);
    this.playerBar.show();
    this.ttsManager.startPlaybackFromIndexAndRatio(extracted.segments, match.segmentIndex, match.startRatio);
  }
  openJumpToParagraphModal() {
    if (this.activeJumpModal) {
      const modal2 = this.activeJumpModal;
      this.activeJumpModal = null;
      modal2.close();
      return;
    }
    const currentSegments = this.ttsManager.getSegments();
    const status = this.ttsManager.getStatus();
    if (currentSegments.length > 0) {
      const modal2 = new JumpToParagraphModal(
        this.app,
        currentSegments,
        status.currentSegmentIndex,
        (targetIndex) => {
          this.ttsManager.jumpToParagraph(targetIndex);
          new import_obsidian9.Notice(`Jumped to Paragraph ${targetIndex + 1} of ${currentSegments.length}`);
        },
        () => {
          this.activeJumpModal = null;
        }
      );
      this.activeJumpModal = modal2;
      modal2.open();
      return;
    }
    const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
    const activeFile = view?.file;
    const extracted = this.textExtractor.extractFromActiveView();
    if (!extracted || extracted.segments.length === 0) {
      new import_obsidian9.Notice("Speech Craft: No readable paragraphs found in active note");
      return;
    }
    if (activeFile) {
      this.activePlayingFilePath = activeFile.path;
    }
    const saved = activeFile ? this.settings.filePositions?.[activeFile.path] : null;
    const initialIndex = saved?.paragraphIndex || 0;
    const modal = new JumpToParagraphModal(
      this.app,
      extracted.segments,
      initialIndex,
      (targetIndex) => {
        this.playerBar.show();
        this.ttsManager.startPlaybackFromIndex(extracted.segments, targetIndex);
        new import_obsidian9.Notice(`Jumped to Paragraph ${targetIndex + 1} of ${extracted.segments.length}`);
      },
      () => {
        this.activeJumpModal = null;
      }
    );
    this.activeJumpModal = modal;
    modal.open();
  }
  checkIfPlayingFileWasClosed() {
    if (!this.activePlayingFilePath) return;
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    const isStillOpen = leaves.some((leaf) => {
      const v = leaf.view;
      return v?.file?.path === this.activePlayingFilePath;
    });
    if (!isStillOpen) {
      const status = this.ttsManager.getStatus();
      if (status.totalSegments > 0) {
        if (!this.settings.filePositions) this.settings.filePositions = {};
        this.settings.filePositions[this.activePlayingFilePath] = {
          paragraphIndex: status.currentSegmentIndex,
          totalParagraphs: status.totalSegments,
          timestamp: Date.now()
        };
        this.saveSettings();
      }
      this.ttsManager.stop();
      this.playerBar.hide();
      clearHighlightFromActiveView(this.app);
      const fileName = this.activePlayingFilePath.split("/").pop() || "note";
      new import_obsidian9.Notice(`Speech Craft: Closed player & saved position for "${fileName}".`);
      this.activePlayingFilePath = null;
    }
  }
  debouncedSaveSettings() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 1e3);
  }
  isPlayerActive() {
    const status = this.ttsManager?.getStatus();
    const isPlaybackActive = status ? status.state !== "idle" : false;
    const isBarVisible = this.playerBar ? this.playerBar.isBarVisible() : false;
    return Boolean(isPlaybackActive || isBarVisible);
  }
  updatePlayerActiveState(status) {
    const isPlaybackActive = status ? status.state !== "idle" : this.ttsManager?.getStatus().state !== "idle";
    const isBarVisible = this.playerBar ? this.playerBar.isBarVisible() : false;
    const isActive = Boolean(isPlaybackActive || isBarVisible);
    document.body.classList.toggle("sc-player-active", isActive);
  }
  onunload() {
    if (this.activeJumpModal) {
      this.activeJumpModal.close();
      this.activeJumpModal = null;
    }
    this.ttsManager?.stop();
    this.playerBar?.unmount();
    clearHighlightFromActiveView(this.app);
    document.body.classList.remove("sc-player-active");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.filePositions) {
      this.settings.filePositions = {};
    }
    const isKeychainSupported = Boolean(
      this.app.secretStorage && typeof this.app.secretStorage.getSecret === "function"
    );
    if (this.settings.useKeychain === void 0 && isKeychainSupported) {
      this.settings.useKeychain = true;
    }
    if (this.settings.googleApiSecretId === "speech-craft-google-api-key") {
      const secretStorage = this.app.secretStorage;
      if (!secretStorage?.getSecret?.("speech-craft-google-api-key")) {
        this.settings.googleApiSecretId = "";
      }
    }
    if (this.settings.customApiSecretId === "speech-craft-custom-api-key") {
      const secretStorage = this.app.secretStorage;
      if (!secretStorage?.getSecret?.("speech-craft-custom-api-key")) {
        this.settings.customApiSecretId = "";
      }
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.ttsManager?.updateSettings(this.settings);
    this.playerBar?.updateSettings(this.settings);
  }
};
