import { App, Notice } from "obsidian";
import { EdgeTtsProvider } from "../providers/edgeTtsProvider";
import { GoogleTtsProvider } from "../providers/googleTtsProvider";
import { WebSpeechProvider } from "../providers/webSpeechProvider";
import { CustomLocalProvider } from "../providers/customLocalProvider";
import { KeychainService } from "./keychainService";
import { TTSProvider } from "../providers/baseProvider";
import {
  AudioPlaybackStatus,
  PlaybackState,
  SentenceSpan,
  SpeechCraftSettings,
  SpeechSegment,
  TTSVoice
} from "../types";
import {
  applyHighlightToActiveView,
  clearHighlightFromActiveView
} from "../editor/karaokeHighlight";

export type StatusListener = (status: AudioPlaybackStatus) => void;

export class TTSManager {
  private googleProvider: GoogleTtsProvider;
  private edgeProvider: EdgeTtsProvider;
  private webSpeechProvider: WebSpeechProvider;
  private customProvider: CustomLocalProvider;

  // Persistent reusable Audio element
  private audio: HTMLAudioElement;
  private segments: SpeechSegment[] = [];
  private currentSegmentIndex: number = 0;
  private state: PlaybackState = "idle";
  private listeners: Set<StatusListener> = new Set();

  private blobUrlCache: Map<string, string> = new Map();
  private prefetchQueue: Set<string> = new Set();

  private keychainService: KeychainService;
  private lastHighlightedSentence: SentenceSpan | null = null;
  private currentSessionId: number = 0;

  constructor(
    private app: App,
    private settings: SpeechCraftSettings,
    keychainService?: KeychainService
  ) {
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

    // Initialize single persistent Audio element
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.setupAudioListeners();
  }

  private setupAudioListeners() {
    this.audio.ontimeupdate = () => {
      this.updateActiveSentenceHighlight();
      this.notify();
    };

    this.audio.onended = () => {
      if (this.currentSegmentIndex + 1 < this.segments.length) {
        // Auto-advance to next segment seamlessly
        this.playSegment(this.currentSegmentIndex + 1);
      } else {
        new Notice("Speech Craft: Finished reading note");
        this.stop();
      }
    };

    this.audio.onerror = (e) => {
      console.warn("Audio element playback error:", e);
      const seg = this.segments[this.currentSegmentIndex];
      // If error occurred during playback, try fallback to WebSpeech before advancing
      if (seg && this.state === "playing" && this.settings.provider !== "webspeech") {
        try {
          const voiceId =
            this.settings.autoDetectLanguage && seg.lang === "hi"
              ? this.settings.defaultHindiVoice
              : this.settings.defaultEnglishVoice;
          this.playViaWebSpeech(seg, voiceId);
          return;
        } catch {}
      }

      if (this.state === "playing" && this.currentSegmentIndex + 1 < this.segments.length) {
        this.playSegment(this.currentSegmentIndex + 1);
      } else {
        this.stop();
      }
    };
  }

  updateSettings(settings: SpeechCraftSettings) {
    this.settings = settings;
    this.googleProvider.clearCache();
    if (this.audio) {
      this.audio.playbackRate = this.settings.rate;
      this.audio.volume = this.settings.volume;
    }
    // Clear audio blob cache so voice/provider changes take effect immediately
    for (const url of this.blobUrlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.blobUrlCache.clear();
    this.prefetchQueue.clear();
  }

  clearVoiceCache(): void {
    this.googleProvider.clearCache();
  }

  getCurrentSettings(): SpeechCraftSettings {
    return this.settings;
  }

  onStatusChange(listener: StatusListener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }

  getStatus(): AudioPlaybackStatus {
    const activeSeg = this.segments[this.currentSegmentIndex];
    let currentTime = 0;
    let duration = 0;

    if (this.audio && !isNaN(this.audio.duration)) {
      currentTime = this.audio.currentTime || 0;
      duration = this.audio.duration || 0;
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

  async getAvailableVoices(): Promise<TTSVoice[]> {
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

  async startPlayback(segments: SpeechSegment[]) {
    if (!segments || segments.length === 0) {
      new Notice("Speech Craft: No text to speak");
      return;
    }

    this.stop();
    this.segments = segments;
    this.currentSegmentIndex = 0;

    // Start segment 0 immediately
    await this.playSegment(0);

    // Pre-fetch upcoming segments in parallel for instantaneous transitions
    this.prefetchSegment(1);
    this.prefetchSegment(2);
  }

  private async playSegment(index: number, startRatio: number = 0, explicitSessionId?: number) {
    const sessionId = explicitSessionId !== undefined ? explicitSessionId : ++this.currentSessionId;

    if (index < 0 || index >= this.segments.length) {
      this.stop();
      return;
    }

    // Immediately stop old audio and web speech
    if (this.audio) {
      this.audio.pause();
    }
    this.webSpeechProvider.stop();

    this.currentSegmentIndex = index;
    const segment = this.segments[index];
    this.setState("loading");

    // Select voice according to language auto-detection
    let voiceId = segment.voiceId;
    if (this.settings.autoDetectLanguage) {
      voiceId = segment.lang === "hi" ? this.settings.defaultHindiVoice : this.settings.defaultEnglishVoice;
    } else {
      voiceId = this.settings.defaultEnglishVoice;
    }

    if (this.settings.provider === "webspeech") {
      if (this.currentSessionId !== sessionId) return;
      this.playViaWebSpeech(segment, voiceId);
      return;
    }

    try {
      let audioUrl = this.blobUrlCache.get(segment.id);
      if (!audioUrl) {
        const blob = await this.synthesizeSegmentWithFallback(segment, voiceId);
        // If user clicked another paragraph while this was synthesizing, abandon immediately!
        if (this.currentSessionId !== sessionId) return;

        audioUrl = URL.createObjectURL(blob);
        this.blobUrlCache.set(segment.id, audioUrl);
        segment.audioBlob = blob;
        segment.audioUrl = audioUrl;
      }

      if (this.currentSessionId !== sessionId) return;

      this.audio.src = audioUrl;
      this.audio.playbackRate = this.settings.rate;
      this.audio.volume = this.settings.volume;
      this.audio.currentTime = 0;

      this.lastHighlightedSentence = null;

      if (startRatio > 0) {
        const seekToRatio = () => {
          if (this.currentSessionId !== sessionId) return;
          if (!isNaN(this.audio.duration) && this.audio.duration > 0) {
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

      await this.audio.play();
      if (this.currentSessionId !== sessionId) {
        this.audio.pause();
        return;
      }

      this.setState("playing");

      // Highlight the active sentence within this paragraph
      this.updateActiveSentenceHighlight();

      // Continuously prefetch subsequent segments
      this.prefetchSegment(index + 1);
      this.prefetchSegment(index + 2);
    } catch (err: any) {
      if (this.currentSessionId !== sessionId) return;
      console.error("Speech Craft Synthesis Error:", err);
      // Fallback to Web Speech if audio playback failed
      try {
        this.playViaWebSpeech(segment, voiceId);
      } catch (fallbackErr) {
        new Notice(`Speech Craft Playback Error: ${err.message || err}`);
        this.setState("idle");
      }
    }
  }

  private updateActiveSentenceHighlight() {
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

      // Find the sentence matching current playback ratio
      let currentSentence = segment.sentences[0];
      for (const sent of segment.sentences) {
        if (ratio >= sent.startRatio) {
          currentSentence = sent;
        } else {
          break;
        }
      }

      if (currentSentence && currentSentence.docFrom !== undefined && currentSentence.docTo !== undefined) {
        if (this.lastHighlightedSentence !== currentSentence) {
          this.lastHighlightedSentence = currentSentence;
          applyHighlightToActiveView(this.app, currentSentence.docFrom, currentSentence.docTo);
        }
      }
    } else if (segment.docFrom !== undefined && segment.docTo !== undefined) {
      applyHighlightToActiveView(this.app, segment.docFrom, segment.docTo);
    }
  }

  private async synthesizeSegmentWithFallback(segment: SpeechSegment, voiceId: string): Promise<Blob> {
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

  private async prefetchSegment(index: number) {
    if (index >= this.segments.length) return;
    const seg = this.segments[index];
    if (this.blobUrlCache.has(seg.id) || this.prefetchQueue.has(seg.id)) return;

    this.prefetchQueue.add(seg.id);
    try {
      const voiceId =
        this.settings.autoDetectLanguage && seg.lang === "hi"
          ? this.settings.defaultHindiVoice
          : this.settings.defaultEnglishVoice;

      const blob = await this.synthesizeSegmentWithFallback(seg, voiceId);
      const url = URL.createObjectURL(blob);
      this.blobUrlCache.set(seg.id, url);
      seg.audioBlob = blob;
      seg.audioUrl = url;
    } catch {
      // Prefetch fails quietly; will retry in playSegment
    } finally {
      this.prefetchQueue.delete(seg.id);
    }
  }

  private getPrimaryProvider(): TTSProvider {
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

  private playViaWebSpeech(segment: SpeechSegment, voiceId: string) {
    this.webSpeechProvider.stop();
    this.setState("playing");

    const sentencesToSpeak =
      segment.sentences && segment.sentences.length > 0
        ? segment.sentences
        : [
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

    let sIdx = 0;

    const speakNextSentence = () => {
      if (this.state !== "playing") return;

      if (sIdx >= sentencesToSpeak.length) {
        // onEnd of all sentences in segment -> advance to next segment
        if (this.currentSegmentIndex + 1 < this.segments.length) {
          this.playSegment(this.currentSegmentIndex + 1);
        } else {
          new Notice("Speech Craft: Finished reading note");
          this.stop();
        }
        return;
      }

      const currentSpan = sentencesToSpeak[sIdx];
      sIdx++;

      if (
        this.settings.highlightActiveSentence !== false &&
        currentSpan.docFrom !== undefined &&
        currentSpan.docTo !== undefined
      ) {
        applyHighlightToActiveView(this.app, currentSpan.docFrom, currentSpan.docTo);
      }

      this.webSpeechProvider.speak(
        currentSpan.cleanText || currentSpan.text,
        voiceId,
        {
          rate: this.settings.rate,
          pitch: this.settings.pitch,
          volume: this.settings.volume
        },
        undefined,
        () => {
          speakNextSentence();
        },
        (err) => {
          console.error("Speech Craft WebSpeech Error:", err);
          if (sIdx < sentencesToSpeak.length) {
            speakNextSentence();
          } else {
            this.stop();
          }
        }
      );
    };

    speakNextSentence();
  }

  async startPlaybackFromIndex(segments: SpeechSegment[], index: number) {
    await this.startPlaybackFromIndexAndRatio(segments, index, 0);
  }

  async startPlaybackFromIndexAndRatio(segments: SpeechSegment[], index: number, startRatio: number = 0) {
    if (!segments || segments.length === 0) return;
    const sessionId = ++this.currentSessionId;

    this.lastHighlightedSentence = null;
    clearHighlightFromActiveView(this.app);
    if (this.audio) {
      this.audio.pause();
    }
    this.webSpeechProvider.stop();

    this.segments = segments;
    const targetIdx = Math.max(0, Math.min(index, segments.length - 1));
    await this.playSegment(targetIdx, startRatio, sessionId);
    if (this.currentSessionId === sessionId) {
      this.prefetchSegment(targetIdx + 1);
      this.prefetchSegment(targetIdx + 2);
    }
  }

  replayCurrentSegment() {
    if (this.audio && !isNaN(this.audio.duration)) {
      this.audio.currentTime = 0;
      if (this.audio.paused) {
        this.audio.play();
      }
      this.setState("playing");
    } else if (this.segments.length > 0) {
      this.playSegment(this.currentSegmentIndex);
    }
  }

  private isDocumentEdited: boolean = false;

  public markDocumentEdited(): void {
    this.isDocumentEdited = true;
  }

  pause() {
    if (this.settings.provider === "webspeech") {
      this.webSpeechProvider.pause();
      this.setState("paused");
      return;
    }

    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.setState("paused");
    }
  }

  resume() {
    if (this.isDocumentEdited) {
      this.isDocumentEdited = false;
      if (this.segments.length > 0) {
        this.playSegment(this.currentSegmentIndex);
        return;
      }
    }

    if (this.settings.provider === "webspeech") {
      this.webSpeechProvider.resume();
      this.setState("playing");
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
    if (this.state === "playing") {
      this.pause();
    } else if (this.state === "paused") {
      this.resume();
    } else if (this.state === "idle" && this.segments.length > 0) {
      this.playSegment(this.currentSegmentIndex);
    }
  }

  stop() {
    this.currentSessionId++;
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
      } catch {}
    }
    this.blobUrlCache.clear();
    this.prefetchQueue.clear();

    this.segments = [];
    this.currentSegmentIndex = 0;
    this.setState("idle");
  }

  getCurrentSentenceIndex(): number {
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

    // Advance to next paragraph (at sentence 0)
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

      // If playing more than 1.5 seconds into the current sentence, rewind to the start of this sentence first
      if (currentTime - sentStartTime > 1.5 && this.audio) {
        this.audio.currentTime = sentStartTime;
        this.updateActiveSentenceHighlight();
        this.notify();
        return;
      }

      // If not at the first sentence, go to previous sentence in this paragraph
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

    // At the start of paragraph: jump to the last sentence of the previous paragraph
    if (this.currentSegmentIndex > 0) {
      const prevSeg = this.segments[this.currentSegmentIndex - 1];
      const lastSentRatio = prevSeg.sentences && prevSeg.sentences.length > 0
        ? prevSeg.sentences[prevSeg.sentences.length - 1].startRatio
        : 0;
      this.playSegment(this.currentSegmentIndex - 1, lastSentRatio);
    } else if (this.audio) {
      // Beginning of document
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

  getSegments(): SpeechSegment[] {
    return this.segments;
  }

  async jumpToParagraph(index: number) {
    if (this.segments.length === 0) return;
    const targetIdx = Math.max(0, Math.min(index, this.segments.length - 1));
    await this.playSegment(targetIdx, 0);
  }

  seek(seconds: number) {
    if (this.audio && !isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.notify();
    }
  }

  setRate(rate: number) {
    this.settings.rate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.notify();
  }

  private setState(state: PlaybackState) {
    this.state = state;
    this.notify();
  }
}
