# Speech Craft (Obsidian Text-to-Speech)

**Speech Craft** is a natural, multilingual Text-to-Speech (TTS) plugin built for Obsidian — optimized specifically for **book translation, proofreading, learning, and audio note-taking**.

Featuring ultra-realistic **Microsoft Edge Neural** and **Google Cloud** voices with zero setup required, smart **Hindi & English** auto-detection, live **karaoke sentence highlighting**, proofreading auto-pause, paragraph navigation, and a responsive floating player bar.

---

## ✨ Features

- 🎙️ **Ultra-Natural Neural Voices**:
  - **Microsoft Edge Neural TTS**: Access 100+ high-quality human-like voices (including Hindi *Swara*, *Madhur*, and English *Ava*, *Guy*, *Jenny*) directly with **zero API key or subscription**.
  - **Google Cloud TTS**: Free instant mode, plus optional Google Cloud API key support for **Neural2**, **Journey**, and **WaveNet** voices.
  - **Offline Web Speech API**: Native browser speech engine fallback when offline.
  - **Custom Local / HTTP Server**: Connect to local TTS engines like Piper, Kokoro, or Sherpa-ONNX.
- 🇮🇳 **Smart Hindi & English Auto-Detection**:
  - Automatically identifies Devanagari script and dynamically routes segments to your chosen Hindi or English voice without manual switching.
- 📖 **Live Karaoke Highlighting & Auto-Scroll**:
  - Softly highlights each sentence in your editor as it speaks and smoothly auto-scrolls the active sentence into center view so you never lose your place.
- ⚡ **Alt + Click to Read from Any Sentence**:
  - Hold `Alt` and click anywhere in a sentence to immediately start listening from that exact position without selecting text or pressing buttons.
- ⏸️ **Smart Auto-Pause on Edit**:
  - When you spot a typo or translation mistake and start typing, speech automatically pauses so you can formulate your correction without audio talking over you.
- 🔁 **Re-read Current Sentence & Continue (`Alt + Enter`)**:
  - Once you finish editing your sentence, press `Alt + Enter` to immediately re-listen to your newly corrected sentence to confirm natural rhythm (लय), and then automatically resume reading forward!
- 🎛️ **Responsive Floating Player Pill**:
  - **Desktop**: Sleek, non-intrusive floating pill with accent-colored progress bar, time display (`01:23 / 04:56`), paragraph counter (`¶ 1/25`), language badge, speed toggle (`0.5x` to `2.0x`), and native Lucide controls.
  - **Mobile & Small Screens**: Automatically transitions to an ergonomic 2-row layout with the scrubber timeline on top and playback controls comfortably accessible below.
- 🔢 **Jump to Paragraph Modal**:
  - Click the paragraph counter (`¶ 1/N`) or use the command palette to open a fast paragraph picker. Jump by direct paragraph number or search by text snippets.
- 🧠 **Resilient Clause & Long-Paragraph Handling**:
  - Intelligent multi-tier sentence and clause partitioner prevents skipped paragraphs. Safely handles complex punctuation (Indic danda `।`, quotes, brackets) and oversized run-on blocks without speech timeouts or Google 429 rate limits.
- 💾 **Remember Playback Position**:
  - Automatically remembers the exact paragraph you last listened to for each note, letting you resume reading long articles and books seamlessly.
- 🧹 **Intelligent Markdown Filter**:
  - Cleans frontmatter YAML properties, headings, code blocks, wikilinks, footnotes, and math expressions before sending text to TTS.
- 🔐 **Secure Keychain API Storage**:
  - Safely stores sensitive API keys using Obsidian's native Secret Storage API.

---

## ⌨️ Hotkeys & Commands

| Command | Recommended Hotkey | Description |
| :--- | :--- | :--- |
| **Alt + Click** on any sentence | `Alt + Click` | Starts reading note from that exact sentence |
| **Re-read Sentence & Continue** | `Alt + Enter` | Re-reads newly edited sentence & resumes note |
| **Play / Pause** | `Alt + P` or `Space` | Toggles speech playback |
| **Previous Sentence** | `Alt + Left` | Moves back one sentence |
| **Next Sentence** | `Alt + Right` | Advances to the next sentence |
| **Previous Paragraph** | `Alt + P` | Jumps to the beginning of previous paragraph |
| **Next Paragraph** | `Alt + N` | Jumps to the beginning of next paragraph |
| **Stop Playback** | `Esc` | Stops speech and clears highlighting |

*(All hotkeys can be customized in Obsidian Settings → Hotkeys).*

---

## ⚙️ Configuration

In Obsidian Settings → **Speech Craft**:
- **TTS Engine / Provider**: Choose Microsoft Edge Neural (recommended), Google Cloud TTS, Offline Web Speech, or Custom HTTP Server.
- **Voice Selection**: Select default English and Hindi voices with live **`🔊 Test English`** and **`🔊 Test Hindi`** sample buttons.
- **Auto-Detection**: Enable/disable automatic Hindi & English voice switching.
- **Playback**: Adjust default speech rate, pitch, and enable remembering playback positions per file.
- **Proofreading Controls**: Toggle live karaoke highlighting, smooth auto-scrolling, and auto-pause while typing.
- **Content Filters**: Choose whether to skip YAML frontmatter or code blocks.

---

## ☕ Support

If you find **Speech Craft** helpful for your translation, proofreading, learning, or listening workflow, consider supporting its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sskhekhaliya)

---

## 📄 License & Credits

- **Author**: [SSKhekhaliya](https://www.sskhekhaliya.in/)
- **Support**: [buymeacoffee.com/sskhekhaliya](https://buymeacoffee.com/sskhekhaliya)
- **License**: MIT License © [SSKhekhaliya](https://www.sskhekhaliya.in/)
- Built with ❤️ for the [Obsidian](https://obsidian.md) community.
