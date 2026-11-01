import * as obsidian from "obsidian";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import SpeechCraftPlugin from "../main";
import { TTSProviderType, TTSVoice } from "../types";

export class SpeechCraftSettingTab extends PluginSettingTab {
  plugin: SpeechCraftPlugin;

  constructor(app: App, plugin: SpeechCraftPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    const SecretComponentClass = (obsidian as any).SecretComponent;
    const isKeychainSupported = this.plugin.keychainService.isAvailable();

    containerEl.createEl("h2", { text: "Speech Craft Settings" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Configure text-to-speech providers, voices, OS Keychain secrets, and translation proofreading."
    });

    // ==========================================
    // 1. PROVIDER SELECTION
    // ==========================================
    containerEl.createEl("h3", { text: "TTS Engine & Provider" });

    new Setting(containerEl)
      .setName("Active Provider")
      .setDesc("Select the speech engine. Google Cloud TTS works both free (zero key) and with your official Google Cloud API key.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("google", "Google Cloud TTS (Free & Official API)")
          .addOption("edge", "Microsoft Edge TTS (Neural Voices)")
          .addOption("webspeech", "Web Speech API (100% Offline / Local OS)")
          .addOption("custom", "Custom / Local Server (OpenAI Compatible, Piper/XTTS)")
          .setValue(this.plugin.settings.provider)
          .onChange(async (val: string) => {
            this.plugin.settings.provider = val as TTSProviderType;

            const hasGoogleKey = Boolean(this.plugin.keychainService.getGoogleApiKey(this.plugin.settings));

            // Update sensible defaults for the selected provider
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

    let secretCompInstance: any = null;

    // Provider-specific credentials/endpoints
    if (this.plugin.settings.provider === "google") {
      const useKeychain = Boolean(
        this.plugin.settings.useKeychain ||
        (isKeychainSupported && Boolean(this.plugin.settings.googleApiSecretId))
      );

      // Keychain toggle
      if (isKeychainSupported) {
        new Setting(containerEl)
          .setName("Use Obsidian Keychain (SecretStorage)")
          .setDesc(
            isKeychainSupported
              ? "Store and select your Google Cloud API key securely from your Obsidian Keychain instead of plaintext."
              : "Obsidian Keychain (SecretStorage) is supported in Obsidian v1.11.4+. You are currently using plaintext storage."
          )
          .addToggle((toggle) => {
            toggle
              .setValue(useKeychain)
              .setDisabled(!isKeychainSupported)
              .onChange(async (val) => {
                this.plugin.settings.useKeychain = val;
                await this.plugin.saveSettings();
                this.display();
              });
          });
      }

      if (useKeychain && isKeychainSupported) {
        if (SecretComponentClass) {
          new Setting(containerEl)
            .setName("Keychain Secret")
            .setDesc("Select an existing secret or click '+' to create a secret containing your Google Cloud API key.")
            .addComponent((cb) => {
              secretCompInstance = new SecretComponentClass(this.app, cb);
              secretCompInstance
                .setValue(this.plugin.settings.googleApiSecretId || "")
                .onChange(async (val: string) => {
                  this.plugin.settings.googleApiSecretId = val;
                  // If switching to an active secret, upgrade voice to Neural2 if still on free
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
            })
            .addButton((btn) => {
              btn.setButtonText("Test Key")
                .setCta()
                .onClick(async () => {
                  const key = this.plugin.keychainService.getGoogleApiKey(this.plugin.settings);
                  if (!key) {
                    new Notice("❌ No secret selected or secret is empty in Obsidian Keychain.");
                    return;
                  }
                  btn.setButtonText("Testing...");
                  btn.setDisabled(true);
                  try {
                    const testUrl = `https://texttospeech.googleapis.com/v1/voices?key=${key}`;
                    const res = await (obsidian as any).requestUrl({ url: testUrl });
                    if (res.status === 200) {
                      new Notice("✅ Google Cloud API Key verified! Unlocked Neural2 & Journey voices.");
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
                      new Notice(`❌ Google Cloud API returned status ${res.status}`);
                    }
                  } catch (err: any) {
                    new Notice(`❌ Failed to verify key: ${err?.message || "Invalid API key"}`);
                  } finally {
                    btn.setButtonText("Test Key");
                    btn.setDisabled(false);
                  }
                });
            });
        } else {
          new Setting(containerEl)
            .setName("Keychain Secret Identifier")
            .setDesc("Enter the name of your secret in Obsidian Keychain.")
            .addText((text) => {
              text
                .setPlaceholder("e.g. google-cloud-api-key")
                .setValue(this.plugin.settings.googleApiSecretId || "")
                .onChange(async (val) => {
                  this.plugin.settings.googleApiSecretId = val.trim();
                  await this.plugin.saveSettings();
                  this.plugin.ttsManager.clearVoiceCache();
                  await renderVoicesSection();
                });
            });
        }

        const secretStorage = (this.app as any).secretStorage;
        if (secretStorage && typeof secretStorage.setSecret === "function") {
          let saveKeyInput = "";
          new Setting(containerEl)
            .setName("Save New API Key to Keychain")
            .setDesc("Paste a Google Cloud API key to store it securely into Obsidian Keychain as 'google-cloud-api-key'.")
            .addText((text) => {
              text
                .setPlaceholder("AIzaSy...")
                .onChange((val) => {
                  saveKeyInput = val.trim();
                });
              text.inputEl.type = "password";
              text.inputEl.style.width = "220px";
            })
            .addButton((btn) => {
              btn.setButtonText("Save to Keychain")
                .onClick(async () => {
                  if (!saveKeyInput) {
                    new Notice("Please enter a valid Google Cloud API key.");
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
                    new Notice("✅ Saved Google Cloud API key to Obsidian Keychain and unlocked Neural voices!");
                  } catch (err: any) {
                    new Notice(`Failed to save to Keychain: ${err?.message || "Unknown error"}`);
                  }
                });
            });
        }
      } else {
        new Setting(containerEl)
          .setName("Google Cloud API Key (Optional)")
          .setDesc("Leave empty to use the 100% free Google TTS service. Enter your key to unlock premium Neural2, Journey, and WaveNet voices.")
          .addText((text) => {
            text
              .setPlaceholder("AIzaSy...")
              .setValue(this.plugin.settings.googleApiKey)
              .onChange(async (val) => {
                this.plugin.settings.googleApiKey = val.trim();
                await this.plugin.saveSettings();
                this.plugin.ttsManager.clearVoiceCache();
                await renderVoicesSection();
              });
          });
      }
    } else if (this.plugin.settings.provider === "custom") {
      new Setting(containerEl)
        .setName("API Endpoint")
        .setDesc("The full URL of the OpenAI-compatible speech endpoint (e.g. LocalAI, Piper HTTP server, XTTS).")
        .addText((text) => {
          text
            .setPlaceholder("http://localhost:8000/v1/audio/speech")
            .setValue(this.plugin.settings.customEndpoint)
            .onChange(async (val) => {
              this.plugin.settings.customEndpoint = val.trim();
              await this.plugin.saveSettings();
            });
        });

      const useCustomKeychain = Boolean(
        this.plugin.settings.useKeychain ||
        (isKeychainSupported && Boolean(this.plugin.settings.customApiSecretId))
      );

      if (isKeychainSupported) {
        new Setting(containerEl)
          .setName("Use Obsidian Keychain (SecretStorage)")
          .setDesc("Select or create your API key securely from your Obsidian Keychain.")
          .addToggle((toggle) => {
            toggle
              .setValue(useCustomKeychain)
              .setDisabled(!isKeychainSupported)
              .onChange(async (val) => {
                this.plugin.settings.useKeychain = val;
                await this.plugin.saveSettings();
                this.display();
              });
          });
      }

      if (useCustomKeychain && isKeychainSupported) {
        if (SecretComponentClass) {
          new Setting(containerEl)
            .setName("Keychain Secret")
            .setDesc("Select an existing secret or click '+' to create a secret containing your custom server / OpenAI API key.")
            .addComponent((cb) => {
              const comp = new SecretComponentClass(this.app, cb);
              comp
                .setValue(this.plugin.settings.customApiSecretId || "")
                .onChange(async (val: string) => {
                  this.plugin.settings.customApiSecretId = val;
                  await this.plugin.saveSettings();
                });
              return comp;
            });
        } else {
          new Setting(containerEl)
            .setName("Keychain Secret Identifier")
            .setDesc("Enter the name of your secret in Obsidian Keychain.")
            .addText((text) => {
              text
                .setPlaceholder("e.g. openai-api-key")
                .setValue(this.plugin.settings.customApiSecretId || "")
                .onChange(async (val) => {
                  this.plugin.settings.customApiSecretId = val.trim();
                  await this.plugin.saveSettings();
                });
            });
        }
      } else {
        new Setting(containerEl)
          .setName("API Key (Optional)")
          .setDesc("Leave empty for local servers without authentication.")
          .addText((text) => {
            text
              .setPlaceholder("sk-...")
              .setValue(this.plugin.settings.customApiKey)
              .onChange(async (val) => {
                this.plugin.settings.customApiKey = val.trim();
                await this.plugin.saveSettings();
              });
          });
      }

      new Setting(containerEl)
        .setName("Model Name")
        .setDesc("Model identifier (e.g. tts-1 or local model name).")
        .addText((text) => {
          text
            .setPlaceholder("tts-1")
            .setValue(this.plugin.settings.customModel)
            .onChange(async (val) => {
              this.plugin.settings.customModel = val.trim();
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("Voice Name")
        .setDesc("Voice name to send in the request payload.")
        .addText((text) => {
          text
            .setPlaceholder("alloy")
            .setValue(this.plugin.settings.customVoice)
            .onChange(async (val) => {
              this.plugin.settings.customVoice = val.trim();
              await this.plugin.saveSettings();
            });
        });
    }

    // ==========================================
    // 2. LANGUAGE & VOICE PREFERENCES (DYNAMIC CONTAINER)
    // ==========================================
    const voicesContainer = containerEl.createDiv({ cls: "speech-craft-voices-container" });

    const renderVoicesSection = async () => {
      voicesContainer.empty();

      voicesContainer.createEl("h3", { text: "Language & Voices" });

      new Setting(voicesContainer)
        .setName("Smart Hindi & English Auto-Detection")
        .setDesc("Automatically detect Devanagari script (Hindi) and English text in your notes and route each sentence to the matching voice.")
        .addToggle((toggle) => {
          toggle.setValue(this.plugin.settings.autoDetectLanguage).onChange(async (val) => {
            this.plugin.settings.autoDetectLanguage = val;
            await this.plugin.saveSettings();
          });
        });

      // Clear voice cache to ensure latest state is fetched
      const voices: TTSVoice[] = await this.plugin.ttsManager.getAvailableVoices();
      const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
      const hindiVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("hi"));

      // Status banner indicating active quality tier
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
          bannerDiv.setText("⚡ Google Cloud API Key Active — Premium Neural2, Journey & WaveNet voices unlocked!");
        } else {
          bannerDiv.style.backgroundColor = "rgba(128, 128, 128, 0.1)";
          bannerDiv.style.color = "var(--text-muted)";
          bannerDiv.setText("ℹ️ Free Google TTS Active — Using standard voices. Select a Keychain secret or add an API key above to unlock Neural voices.");
        }
      }

      // Ensure valid voice is selected
      if (englishVoices.length > 0 && !englishVoices.some((v) => v.id === this.plugin.settings.defaultEnglishVoice)) {
        this.plugin.settings.defaultEnglishVoice = englishVoices[0].id;
        await this.plugin.saveSettings();
      }
      if (hindiVoices.length > 0 && !hindiVoices.some((v) => v.id === this.plugin.settings.defaultHindiVoice)) {
        this.plugin.settings.defaultHindiVoice = hindiVoices[0].id;
        await this.plugin.saveSettings();
      }

      // Default English Voice Setting with Preview Button
      const enSetting = new Setting(voicesContainer)
        .setName("Default English Voice")
        .setDesc("Voice used for English sentences.");

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
        btn.setButtonText("🔊 Test English").onClick(() => {
          this.previewVoice("Hello! This is a test of your English text to speech settings.", "en");
        });
      });

      // Default Hindi Voice Setting with Preview Button
      const hiSetting = new Setting(voicesContainer)
        .setName("Default Hindi Voice")
        .setDesc("Voice used for Hindi / Devanagari sentences.");

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
        btn.setButtonText("🔊 Test Hindi").onClick(() => {
          this.previewVoice("नमस्ते! यह आपकी हिंदी टेक्स्ट टू स्पीच सेटिंग का परीक्षण है।", "hi");
        });
      });
    };

    // Initial render of the voices section
    await renderVoicesSection();

    // ==========================================
    // 3. BOOK TRANSLATION & PROOFREADING
    // ==========================================
    containerEl.createEl("h3", { text: "Book Translation & Proofreading" });

    new Setting(containerEl)
      .setName("Live Sentence Highlighting & Auto-Scroll")
      .setDesc("Highlight each individual sentence in the editor and auto-scroll smoothly as speech plays.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.highlightActiveSentence).onChange(async (val) => {
          this.plugin.settings.highlightActiveSentence = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Show Play Icon on Paragraph Hover")
      .setDesc("Display a subtle play icon in the margin when hovering over a paragraph to jump directly from it while the player is active.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showParagraphHoverPlay !== false).onChange(async (val) => {
          this.plugin.settings.showParagraphHoverPlay = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Smart Auto-Pause on Edit")
      .setDesc("Automatically pause speech when you edit or type in the note so you can fix translations without audio talking over you.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoPauseOnEdit).onChange(async (val) => {
          this.plugin.settings.autoPauseOnEdit = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Remember Playback Position per Note")
      .setDesc("Automatically save where you left off in each note and resume from that paragraph when you come back.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.rememberPlaybackPosition !== false).onChange(async (val) => {
          this.plugin.settings.rememberPlaybackPosition = val;
          await this.plugin.saveSettings();
        });
      });

    const savedCount = Object.keys(this.plugin.settings.filePositions || {}).length;
    if (savedCount > 0) {
      new Setting(containerEl)
        .setName("Saved Note Locations")
        .setDesc(`Currently remembering playback locations for ${savedCount} note${savedCount === 1 ? "" : "s"}.`)
        .addButton((btn) => {
          btn.setButtonText("Clear Saved Locations")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.filePositions = {};
              await this.plugin.saveSettings();
              new Notice("Speech Craft: Cleared all saved note playback locations.");
              this.display();
            });
        });
    }

    // ==========================================
    // 4. AUDIO PLAYBACK SETTINGS
    // ==========================================
    containerEl.createEl("h3", { text: "Audio & Playback Controls" });

    new Setting(containerEl)
      .setName("Default Playback Speed")
      .setDesc("Speed multiplier (0.5x to 2.0x). You can also adjust this dynamically on the player pill.")
      .addSlider((slider) => {
        slider
          .setLimits(0.5, 2.0, 0.25)
          .setValue(this.plugin.settings.rate)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.rate = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Pitch Adjustment")
      .setDesc("Adjust the pitch of speech output (-20 to +20).")
      .addSlider((slider) => {
        slider
          .setLimits(-20, 20, 1)
          .setValue(this.plugin.settings.pitch || 0)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.pitch = val;
            await this.plugin.saveSettings();
          });
      });

    // ==========================================
    // 5. CONTENT PROCESSING FILTERS
    // ==========================================
    containerEl.createEl("h3", { text: "Note Content Filters" });

    new Setting(containerEl)
      .setName("Skip YAML Frontmatter")
      .setDesc("Ignore frontmatter blocks at the start of notes so tags and metadata aren't spoken.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.skipFrontmatter).onChange(async (val) => {
          this.plugin.settings.skipFrontmatter = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Skip Code Blocks")
      .setDesc("Skip code blocks (``` ... ```) during speech playback.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.skipCodeBlocks).onChange(async (val) => {
          this.plugin.settings.skipCodeBlocks = val;
          await this.plugin.saveSettings();
        });
      });
  }

  private previewVoice(sampleText: string, lang: "en" | "hi") {
    new Notice(`Testing ${lang === "hi" ? "Hindi" : "English"} voice...`);
    const voiceId =
      lang === "hi"
        ? this.plugin.settings.defaultHindiVoice
        : this.plugin.settings.defaultEnglishVoice;

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
}
