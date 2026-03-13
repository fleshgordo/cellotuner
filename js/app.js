// App Initialization
document.addEventListener("DOMContentLoaded", function () {
  // Initialize router
  Router.init();

  // Set up navigation listeners
  setupNavigation();

  // Additional app initialization
  console.log("App initialized");
});

// Navigation Setup
function setupNavigation() {
  const navButtons = document.querySelectorAll("[data-nav]");

  navButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const target = this.getAttribute("data-nav");
      Router.show(target);

      // Refresh debug display when switching to home screen
      if (
        target === "home" &&
        window.celloTuner &&
        window.celloTuner.debugMode
      ) {
        setTimeout(() => {
          window.celloTuner.showDebugNote();
        }, 100);
      }
    });
  });
}

// Add any additional app logic here

// Cello Tuner with Pitch Detection
class CelloTuner {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.isRunning = false;
    this.baseFreq = 440; // A4 standard

    // Notation preference (false = letter names, true = solfege)
    this.useSolfege = localStorage.getItem("notation") === "solfege";

    // Debug mode
    this.debugMode = localStorage.getItem("debugMode") === "true";
    this.debugIndex = 0;
    this.debugStates = [
      {
        note: "C2",
        freq: "65.41 Hz",
        cents: "0 cents",
        angle: 0,
        label: "IN TUNE",
      },
      {
        note: "C2",
        freq: "65.46 Hz",
        cents: "1 cents",
        angle: 5,
        label: "IN TUNE",
      },
      {
        note: "C2",
        freq: "65.79 Hz",
        cents: "+10 cents",
        angle: 18,
        label: "ALMOST IN TUNE",
      },
      {
        note: "C2",
        freq: "65.03 Hz",
        cents: "-10 cents",
        angle: -18,
        label: "ALMOST IN TUNE",
      },
      {
        note: "C2",
        freq: "64.50 Hz",
        cents: "-25 cents",
        angle: -45,
        label: "FLAT",
      },
      {
        note: "C2",
        freq: "66.32 Hz",
        cents: "+25 cents",
        angle: 45,
        label: "SHARP",
      },
      {
        note: "C2",
        freq: "63.60 Hz",
        cents: "-50 cents",
        angle: -90,
        label: "VERY FLAT",
      },
      {
        note: "C2",
        freq: "67.23 Hz",
        cents: "+50 cents",
        angle: 90,
        label: "VERY SHARP",
      },
    ];

    // Cello string frequencies at 440Hz
    this.celloStrings = [
      { note: "C", octave: 2, freq: 65.41 },
      { note: "G", octave: 2, freq: 98.0 },
      { note: "D", octave: 3, freq: 146.83 },
      { note: "A", octave: 3, freq: 220.0 },
    ];

    // Solfege mapping
    this.solfegeMap = {
      C: "Do",
      D: "Re",
      E: "Mi",
      F: "Fa",
      G: "Sol",
      A: "La",
      B: "Ti",
    };

    // Smoothing for stable display
    this.pitchHistory = [];
    this.maxHistoryLength = 5;
    this.minConfidence = 0.92; // Higher threshold for better accuracy

    this.setupControls();
    this.loadNotationPreference();
  }

  setupControls() {
    // Base frequency selector
    const freqSelect = document.getElementById("base-freq");
    if (freqSelect) {
      freqSelect.addEventListener("change", (e) => {
        this.baseFreq = parseInt(e.target.value);
        this.updateDisplay(`Base: ${this.baseFreq}Hz`);
      });
    }

    // Notation toggle
    const notationToggle = document.getElementById("notation-toggle");
    if (notationToggle) {
      notationToggle.addEventListener("change", (e) => {
        this.useSolfege = e.target.checked;
        localStorage.setItem(
          "notation",
          this.useSolfege ? "solfege" : "letter",
        );
      });
    }

    // Debug toggle
    const debugToggle = document.getElementById("debug-toggle");
    if (debugToggle) {
      debugToggle.addEventListener("change", (e) => {
        this.debugMode = e.target.checked;
        localStorage.setItem("debugMode", this.debugMode ? "true" : "false");
        if (this.debugMode) {
          this.debugIndex = 0;
          this.showDebugNote();
        } else {
          this.resetMeter();
          this.updateDisplay("READY.");
        }
      });
    }

    // Start/Stop button
    const startBtn = document.getElementById("start-tuner");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (this.isRunning) {
          this.stop();
        } else {
          this.start();
        }
      });
    }
  }

  loadNotationPreference() {
    // Load and apply saved notation preference
    const notationToggle = document.getElementById("notation-toggle");
    if (notationToggle) {
      notationToggle.checked = this.useSolfege;
    }

    // Load and apply debug mode preference
    const debugToggle = document.getElementById("debug-toggle");
    if (debugToggle) {
      debugToggle.checked = this.debugMode;
      if (this.debugMode) {
        this.showDebugNote();
      }
    }
  }

  showDebugNote() {
    const state = this.debugStates[this.debugIndex];
    const noteEl = document.getElementById("detected-note");
    const freqEl = document.getElementById("detected-freq");
    const centsEl = document.getElementById("cents-off");
    const needle = document.getElementById("tuner-needle");
    const inTuneZone = document.querySelector(".dial-intune-zone");

    if (noteEl) {
      noteEl.textContent = state.note;
      // Add click handler to cycle through states
      noteEl.style.cursor = "pointer";
      noteEl.onclick = () => {
        this.debugIndex = (this.debugIndex + 1) % this.debugStates.length;
        this.showDebugNote();
      };
    }

    if (freqEl) freqEl.textContent = state.freq;
    if (centsEl) {
      centsEl.textContent = state.cents;
      if (state.angle === 0) {
        centsEl.classList.add("in-tune");
      } else {
        centsEl.classList.remove("in-tune");
      }
    }
    if (needle) {
      needle.style.transform = `translateX(-50%) translateY(-100%) rotate(${state.angle}deg)`;
    }

    // Highlight in-tune zone in debug mode (within ±18 degrees = ±10 cents)
    if (inTuneZone) {
      inTuneZone.classList.toggle("active", Math.abs(state.angle) <= 18);
    }

    const display = document.getElementById("tuner-display");
    if (display) {
      display.textContent = `DEBUG: ${state.label}`;
    }
  }

  getNoteName(note, octave) {
    if (this.useSolfege) {
      return `${this.solfegeMap[note]}${octave}`;
    }
    return `${note}${octave}`;
  }

  async start() {
    // Don't start if in debug mode
    if (this.debugMode) {
      this.updateDisplay("Debug mode active");
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Create audio context
      this.audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 8192; // Larger for better low-frequency accuracy
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Reset history
      this.pitchHistory = [];

      // Update UI
      this.isRunning = true;
      const startBtn = document.getElementById("start-tuner");
      startBtn.classList.add("active");
      startBtn.querySelector(".toggle-text").textContent = "STOP TUNER";

      this.updateDisplay("Listening...");

      // Start detection loop
      this.detectPitch();
    } catch (error) {
      console.error("Microphone access error:", error);
      this.updateDisplay("Mic access denied");
    }
  }

  stop() {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.isRunning = false;
    this.pitchHistory = [];

    const startBtn = document.getElementById("start-tuner");
    startBtn.classList.remove("active");
    startBtn.querySelector(".toggle-text").textContent = "START TUNER";

    this.updateDisplay("Stopped");
    this.resetMeter();
  }

  detectPitch() {
    if (!this.isRunning) return;

    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buffer);

    // Detect pitch using autocorrelation with confidence
    const detection = this.autoCorrelate(buffer, this.audioContext.sampleRate);

    if (detection.frequency > 0 && detection.confidence > this.minConfidence) {
      // Add to history for smoothing
      this.pitchHistory.push(detection.frequency);
      if (this.pitchHistory.length > this.maxHistoryLength) {
        this.pitchHistory.shift();
      }

      // Use median filtering to reduce jumpiness
      const smoothedPitch = this.getMedian(this.pitchHistory);
      this.processPitch(smoothedPitch);
    } else {
      // Decay history when no signal
      if (this.pitchHistory.length > 0) {
        this.pitchHistory.shift();
      }

      if (this.pitchHistory.length === 0) {
        this.updateDisplay("...");
        this.resetMeter();
      }
    }

    // Continue detection loop
    requestAnimationFrame(() => this.detectPitch());
  }

  getMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  autoCorrelate(buffer, sampleRate) {
    const SIZE = buffer.length;
    let rms = 0;

    // Calculate RMS
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // Not enough signal
    if (rms < 0.005) return { frequency: -1, confidence: 0 };

    // Define search range for cello (50Hz to 500Hz)
    const minFreq = 50;
    const maxFreq = 500;
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);

    let bestOffset = -1;
    let bestCorrelation = 0;

    // Autocorrelation with normalization
    for (let offset = minPeriod; offset < maxPeriod; offset++) {
      let correlation = 0;
      let n = 0;

      for (let i = 0; i < SIZE - offset; i++) {
        correlation += buffer[i] * buffer[i + offset];
        n++;
      }

      // Normalize correlation
      correlation = correlation / n;

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }

    // Calculate confidence (normalize by RMS)
    const confidence = bestCorrelation / (rms * rms);

    if (bestOffset > 0) {
      // Parabolic interpolation for sub-sample accuracy
      let shift = 0;
      if (bestOffset > minPeriod && bestOffset < maxPeriod - 1) {
        const prev = bestOffset - 1;
        const next = bestOffset + 1;

        let corrPrev = 0,
          corrNext = 0,
          n = 0;
        for (let i = 0; i < SIZE - next; i++) {
          corrPrev += buffer[i] * buffer[i + prev];
          corrNext += buffer[i] * buffer[i + next];
          n++;
        }
        corrPrev /= n;
        corrNext /= n;

        // Parabolic interpolation
        const denom = corrPrev - 2 * bestCorrelation + corrNext;
        if (denom !== 0) {
          shift = (0.5 * (corrPrev - corrNext)) / denom;
        }
      }

      const frequency = sampleRate / (bestOffset + shift);
      return { frequency, confidence };
    }

    return { frequency: -1, confidence: 0 };
  }

  processPitch(frequency) {
    // Adjust frequency based on selected base (A4)
    const freqRatio = this.baseFreq / 440;

    // Find closest cello string within reasonable range (within 1 semitone = 100 cents)
    let closestString = null;
    let minDiff = Infinity;
    const maxCentsDiff = 100; // Don't match if more than 1 semitone away

    this.celloStrings.forEach((string) => {
      const adjustedFreq = string.freq * freqRatio;
      const diff = Math.abs(frequency - adjustedFreq);
      const cents = Math.abs(1200 * Math.log2(frequency / adjustedFreq));

      if (diff < minDiff && cents < maxCentsDiff) {
        minDiff = diff;
        closestString = { ...string, adjustedFreq };
      }
    });

    if (closestString) {
      // Calculate cents off (100 cents = 1 semitone)
      const cents = 1200 * Math.log2(frequency / closestString.adjustedFreq);

      // Update display
      this.updateTunerDisplay(closestString, frequency, cents);
      this.updateMeterNeedle(cents);
    } else {
      // Frequency detected but not a cello string
      this.updateDisplay("Out of range");
    }
  }

  updateTunerDisplay(string, frequency, cents) {
    const noteEl = document.getElementById("detected-note");
    const freqEl = document.getElementById("detected-freq");
    const centsEl = document.getElementById("cents-off");
    const inTuneZone = document.querySelector(".dial-intune-zone");

    if (noteEl) {
      noteEl.textContent = this.getNoteName(string.note, string.octave);
    }

    if (freqEl) {
      freqEl.textContent = `${frequency.toFixed(1)} Hz`;
    }

    if (centsEl) {
      const centsRounded = Math.round(cents);
      const inTune = Math.abs(centsRounded) < 5;

      centsEl.textContent = `${centsRounded > 0 ? "+" : ""}${centsRounded} cents`;
      centsEl.classList.toggle("in-tune", inTune);
    }

    // Highlight in-tune zone when tuned or close to tuned
    const almostInTune = Math.abs(cents) < 10;
    if (inTuneZone) {
      inTuneZone.classList.toggle("active", almostInTune);
    }

    this.updateDisplay(
      Math.abs(cents) < 5 ? "IN TUNE!" : cents > 0 ? "Sharp ♯" : "Flat ♭",
    );
  }

  updateMeterNeedle(cents) {
    const needle = document.getElementById("tuner-needle");
    if (!needle) return;

    // Clamp cents to -50 to +50 range for display
    const clampedCents = Math.max(-50, Math.min(50, cents));

    // Convert cents to rotation angle (-90deg to +90deg)
    // -50 cents = -90deg (left), 0 cents = 0deg (center), +50 cents = +90deg (right)
    const angle = (clampedCents / 50) * 90;

    needle.style.transform = `translateX(-50%) translateY(-100%) rotate(${angle}deg)`;
  }

  resetMeter() {
    const needle = document.getElementById("tuner-needle");
    if (needle) {
      needle.style.transform =
        "translateX(-50%) translateY(-100%) rotate(0deg)";
    }

    const noteEl = document.getElementById("detected-note");
    const freqEl = document.getElementById("detected-freq");
    const centsEl = document.getElementById("cents-off");
    const inTuneZone = document.querySelector(".dial-intune-zone");

    if (noteEl) {
      noteEl.textContent = "--";
      noteEl.style.cursor = "";
      noteEl.onclick = null;
    }
    if (freqEl) freqEl.textContent = "-- Hz";
    if (centsEl) {
      centsEl.textContent = "-- cents";
      centsEl.classList.remove("in-tune");
    }
    if (inTuneZone) {
      inTuneZone.classList.remove("active");
    }
  }

  updateDisplay(text) {
    const display = document.getElementById("tuner-display");
    if (display) {
      display.textContent = text;
    }
  }
}

// Initialize tuner when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.celloTuner = new CelloTuner();
});
