import type { AdventureFeedback } from "./adventure";

/** Original score and sound design. No recordings, remote requests or provider SDKs. */
export type GardenMix = {
  sound: boolean;
  music: number;
  effects: number;
  ambience: number;
};
export const defaultGardenMix: GardenMix = {
  sound: false,
  music: 0.55,
  effects: 0.7,
  ambience: 0.4,
};
export const GARDEN_TEMPO = 76;
const BEAT = 60 / GARDEN_TEMPO;
type Group = "music" | "effects" | "ambience";
type Instrument = "harp" | "felt" | "pad" | "bass" | "bell";
export type GardenNote = {
  midi: number;
  offset: number;
  duration: number;
  volume: number;
  pan: number;
  instrument: Instrument;
};
export type GardenCue =
  | AdventureFeedback
  | "buddy"
  | "confirm"
  | "cancel"
  | "open"
  | "step-grass"
  | "step-path"
  | "flutter"
  | "plant-grass"
  | "plant-flower";
export function normalizeGardenMix(value: Partial<GardenMix>): GardenMix {
  const volume = (key: "music" | "effects" | "ambience") =>
    typeof value[key] === "number" && Number.isFinite(value[key])
      ? Math.min(1, Math.max(0, value[key]!))
      : defaultGardenMix[key];
  return {
    sound: value.sound === true,
    music: volume("music"),
    effects: volume("effects"),
    ambience: volume("ambience"),
  };
}

// “A Little More Green”: 32 bars / 101.05 seconds. A spacious melody-and-answer form.
// Cmaj9 / Am9 / Fmaj9 / G6, then Em7 / Am9 / Dm9 / Gsus2. Written melody;
// rests are intentional. The evening arrangement softens the harp and omits upper bells.
const HARMONY = [
  [48, 55, 59, 64, 74],
  [45, 52, 55, 60, 71],
  [41, 53, 57, 64, 67],
  [43, 55, 59, 62, 69],
  [40, 52, 55, 59, 62],
  [45, 52, 55, 60, 71],
  [38, 53, 57, 60, 64],
  [43, 55, 57, 62, 67],
];
const MELODY = [
  [76, -1, 79, 74, -1, 72, -1, -1],
  [71, -1, 72, -1, 76, -1, -1, -1],
  [69, -1, 72, 76, -1, 74, 72, -1],
  [71, -1, 69, -1, 67, -1, -1, -1],
  [67, -1, 71, -1, 74, -1, 76, -1],
  [72, -1, 71, 69, -1, 67, -1, -1],
  [65, -1, 69, -1, 72, -1, 76, -1],
  [74, -1, 69, -1, 67, -1, -1, -1],
];

export function gardenScoreStep(
  step: number,
  night = false,
  blooming = false,
): GardenNote[] {
  const bar = Math.floor(step / 8) % 32,
    pulse = step % 8;
  const chordIndex = Math.floor(bar / 2) % 8,
    chord = HARMONY[chordIndex];
  const notes: GardenNote[] = [];
  const add = (
    midi: number,
    instrument: Instrument,
    volume: number,
    duration: number,
    pan = 0,
    offset = 0,
  ) => notes.push({ midi, instrument, volume, duration, pan, offset });
  if (!pulse) {
    add(chord[0], "bass", 0.09, BEAT * 3.8);
    chord
      .slice(1, 4)
      .forEach((n, i) =>
        add(n, "pad", night ? 0.035 : 0.026, BEAT * 4.8, (i - 1) * 0.3),
      );
  }
  if (pulse === 0 || pulse === 3 || pulse === 6) {
    const n = chord[1 + [0, 3, 6].indexOf(pulse)];
    add(
      n + 12,
      "harp",
      night ? 0.025 : 0.047,
      1.9,
      pulse === 3 ? 0.35 : -0.3,
      pulse === 3 ? 0.018 : 0,
    );
  }
  const phrase = MELODY[chordIndex],
    melody = phrase[pulse];
  if (bar % 2 === 0 && melody >= 0)
    add(melody, "felt", night ? 0.045 : 0.068, 2.2, 0.1);
  // The answer phrase changes in the second half, with breathing space between phrases.
  if (bar >= 16 && bar % 2 === 1 && (pulse === 2 || pulse === 5))
    add(chord[pulse === 2 ? 3 : 2] + 12, "felt", 0.042, 2, -0.1);
  if (blooming && !night && bar % 4 === 3 && pulse === 6)
    add(chord[4] + 12, "bell", 0.018, 1.8, 0.45);
  return notes;
}

/** Shared instruments used by the live player and the offline listening preview. */
export class GardenAudioGraph {
  readonly groups: Record<Group, GainNode>;
  readonly master: GainNode;
  private readonly sources = new Set<AudioScheduledSourceNode>();
  private readonly nodes: AudioNode[] = [];
  private readonly noise: AudioBuffer;
  private ambienceStarted = false;
  private variation = 0;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  constructor(readonly ctx: BaseAudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.18;
    this.master.connect(limiter).connect(ctx.destination);
    this.groups = {
      music: ctx.createGain(),
      effects: ctx.createGain(),
      ambience: ctx.createGain(),
    };
    Object.values(this.groups).forEach((g) => {
      g.gain.value = 0;
      g.connect(this.master);
    });
    this.nodes.push(this.master, limiter, ...Object.values(this.groups));
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 1979;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 0x80000000 - 1;
    }
  }
  mix(mix: GardenMix) {
    for (const key of ["music", "effects", "ambience"] as const)
      this.groups[key].gain.setTargetAtTime(
        mix.sound ? mix[key] : 0,
        this.ctx.currentTime,
        0.025,
      );
  }
  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      nodes.forEach((n) => n.disconnect());
    };
  }
  note(note: GardenNote, at: number, group: Group = "music") {
    const { ctx } = this;
    const partials =
      note.instrument === "pad"
        ? [
            [1, 1],
            [2.003, 0.16],
          ]
        : note.instrument === "bass"
          ? [
              [1, 1],
              [2, 0.12],
            ]
          : note.instrument === "bell"
            ? [
                [1, 1],
                [2.76, 0.22],
                [5.4, 0.045],
              ]
            : [
                [1, 1],
                [2, 0.3],
                [3, 0.08],
              ];
    const when = at + note.offset,
      duration = note.duration;
    partials.forEach(([multiple, level], i) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        pan = ctx.createStereoPanner();
      osc.frequency.value = 440 * 2 ** ((note.midi - 69) / 12) * multiple;
      const attack =
        note.instrument === "pad"
          ? 0.6
          : note.instrument === "bass"
            ? 0.06
            : 0.007;
      const peak = note.volume * level;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(peak, when + attack);
      gain.gain.exponentialRampToValueAtTime(
        0.00001,
        when + duration / (1 + i * 0.3),
      );
      gain.gain.linearRampToValueAtTime(0, when + duration + 0.02);
      pan.pan.value = note.pan;
      osc.connect(gain).connect(pan).connect(this.groups[group]);
      this.track(osc, [gain, pan]);
      osc.start(when);
      osc.stop(when + duration + 0.04);
    });
  }
  private rustle(
    at: number,
    duration: number,
    volume: number,
    frequency: number,
    pan = 0,
  ) {
    const source = this.ctx.createBufferSource(),
      filter = this.ctx.createBiquadFilter(),
      gain = this.ctx.createGain(),
      stereo = this.ctx.createStereoPanner();
    source.buffer = this.noise;
    source.playbackRate.value = 0.8 + (this.variation++ % 5) * 0.09;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    stereo.pan.value = pan;
    source
      .connect(filter)
      .connect(gain)
      .connect(stereo)
      .connect(this.groups.effects);
    this.track(source, [filter, gain, stereo]);
    source.start(at);
    source.stop(at + duration + 0.03);
  }
  cue(kind: GardenCue, at = this.ctx.currentTime, pan = 0) {
    if (this.sources.size > 220) return;
    const play = (
      midi: number,
      offset = 0,
      volume = 0.085,
      duration = 0.65,
      instrument: Instrument = "felt",
    ) =>
      this.note(
        { midi, offset, volume, duration, pan, instrument },
        at,
        "effects",
      );
    const variation = this.variation++ % 7;
    switch (kind) {
      case "step-grass":
      case "step-path":
        this.rustle(
          at,
          0.075 + variation * 0.005,
          0.045 + variation * 0.003,
          kind === "step-path" ? 400 + variation * 40 : 950 + variation * 120,
          pan,
        );
        break;
      case "flutter":
        for (let i = 0; i < 3; i++)
          this.rustle(at + i * 0.085, 0.055, 0.022, 2400 + i * 150, pan);
        break;
      case "shelter-open":
      case "shelter-close":
        this.rustle(at, 0.42, 0.13, 1100, pan);
        break;
      case "water":
      case "refill":
      case "rainwater":
        this.rustle(at, kind === "refill" ? 1.1 : 0.7, 0.16, 1800, pan);
        [74, 81, 76, 86, 79].forEach((n, i) =>
          play(n, i * 0.105, 0.032, 0.18, "bell"),
        );
        break;
      case "plant":
      case "plant-grass":
      case "plant-flower":
        this.rustle(
          at,
          0.18 + variation * 0.012,
          0.2,
          kind === "plant-grass" ? 1050 : 550 + variation * 35,
          pan,
        );
        play(55, 0, 0.075, 0.2);
        play(kind === "plant-flower" ? 79 : 72, 0.13, 0.045, 0.55, "harp");
        break;
      case "harvest":
        this.rustle(
          at,
          0.12 + variation * 0.01,
          0.15,
          2100 + variation * 140,
          pan,
        );
        [72, 76, 79].forEach((n, i) => play(n, i * 0.095, 0.07, 1.1, "harp"));
        break;
      case "forage":
        this.rustle(at, 0.13, 0.1, 2300, pan);
        play(79, 0, 0.06);
        play(84, 0.1, 0.055);
        break;
      case "discover":
        [67, 74, 79, 83].forEach((n, i) =>
          play(n, i * 0.18, 0.055, 1.5, "bell"),
        );
        break;
      case "deliver":
      case "trail-won":
        [60, 67, 72, 76, 79, 84].forEach((n, i) =>
          play(n, i * 0.14, 0.07, 1.8, "harp"),
        );
        break;
      case "buddy":
        [79, 81, 74].forEach((n, i) => play(n, i * 0.19, 0.052, 0.6));
        break;
      case "trail-start":
        [74, 79, 81].forEach((n, i) => play(n, i * 0.14, 0.05, 0.7, "bell"));
        break;
      case "trail-stop":
        play(79, 0, 0.05, 0.9, "bell");
        play(86, 0.15, 0.038, 1.1, "bell");
        break;
      case "trail-failed":
        play(69, 0, 0.052);
        play(67, 0.24, 0.04, 0.9);
        break;
      case "dash":
        this.rustle(at, 0.24, 0.13, 950, pan);
        break;
      case "rain-wait":
      case "need-water":
      case "need-basket":
      case "growing":
        play(62, 0, 0.035, 0.25);
        break;
      case "open":
        play(72, 0, 0.032, 0.22, "harp");
        break;
      case "confirm":
        play(76, 0, 0.032, 0.3, "harp");
        break;
      case "cancel":
      case "cancelled":
        play(67, 0, 0.027, 0.2, "harp");
        break;
    }
  }
  startAmbience(at: number) {
    if (this.ambienceStarted) return;
    this.ambienceStarted = true;
    // A continuous filtered breeze, gently modulated; no loop seam or file decode.
    const source = this.ctx.createBufferSource(),
      filter = this.ctx.createBiquadFilter(),
      gain = this.ctx.createGain(),
      lfo = this.ctx.createOscillator(),
      depth = this.ctx.createGain();
    source.buffer = this.noise;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 850;
    gain.gain.value = 0.07;
    lfo.frequency.value = 0.085;
    depth.gain.value = 0.024;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain).connect(this.groups.ambience);
    this.track(source, [filter, gain]);
    this.track(lfo, [depth]);
    this.windGain = gain;
    const rainSource = this.ctx.createBufferSource(),
      rainFilter = this.ctx.createBiquadFilter(),
      rainGain = this.ctx.createGain();
    rainSource.buffer = this.noise;
    rainSource.loop = true;
    rainSource.playbackRate.value = 1.37;
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 1700;
    rainGain.gain.value = 0;
    rainSource
      .connect(rainFilter)
      .connect(rainGain)
      .connect(this.groups.ambience);
    this.track(rainSource, [rainFilter, rainGain]);
    this.rainGain = rainGain;
    rainSource.start(at);
    source.start(at);
    lfo.start(at);
  }
  weather(raining: boolean, night: boolean) {
    this.rainGain?.gain.setTargetAtTime(
      raining ? 0.065 : 0,
      this.ctx.currentTime,
      0.8,
    );
    this.windGain?.gain.setTargetAtTime(
      raining ? 0.09 : night ? 0.035 : 0.065,
      this.ctx.currentTime,
      1.5,
    );
  }
  bird(at: number, night: boolean) {
    if (night) return;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator(),
        gain = this.ctx.createGain(),
        pan = this.ctx.createStereoPanner(),
        start = at + i * 0.16;
      osc.frequency.setValueAtTime(1700 + i * 180, start);
      osc.frequency.exponentialRampToValueAtTime(2550 + i * 110, start + 0.055);
      osc.frequency.exponentialRampToValueAtTime(1850, start + 0.11);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.018, start + 0.025);
      gain.gain.linearRampToValueAtTime(0, start + 0.12);
      pan.pan.value = Math.sin(at) * 0.65;
      osc.connect(gain).connect(pan).connect(this.groups.ambience);
      this.track(osc, [gain, pan]);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }
  dispose() {
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      source.disconnect();
    });
    this.sources.clear();
    this.nodes.forEach((node) => node.disconnect());
  }
}

/** One audio owner per entered account world; all activation follows a user gesture. */
export class GardenAudio {
  private ctx: AudioContext | null = null;
  private graph: GardenAudioGraph | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;
  private preferences = defaultGardenMix;
  private playing = false;
  private night = false;
  private raining = false;
  private blooming = false;
  private step = 0;
  private nextAt = 0;
  private lastCue = new Map<GardenCue, number>();
  private disposed = false;
  configure(mix: GardenMix, night: boolean) {
    this.preferences = normalizeGardenMix(mix);
    this.night = night;
    this.graph?.mix(this.preferences);
    if (!this.preferences.sound) this.sleep();
  }
  setAtmosphere(night: boolean, raining: boolean) {
    if (this.night === night && this.raining === raining) return;
    this.night = night;
    this.raining = raining;
    this.graph?.weather(raining, night);
  }
  setBlooming(blooming: boolean) {
    this.blooming = blooming;
  }
  setPlaying(playing: boolean) {
    this.playing = playing;
    if (!playing) this.sleep();
  }
  unlock(cue?: GardenCue) {
    if (this.disposed || !this.preferences.sound || !this.playing) return;
    try {
      this.ctx ??= new AudioContext();
      this.graph ??= new GardenAudioGraph(this.ctx);
      this.graph.mix(this.preferences);
      if (this.suspendTimer) clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
      this.graph.master.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.035);
      void this.ctx
        .resume()
        .then(() => {
          if (this.disposed || !this.playing || !this.preferences.sound) {
            this.sleep();
            return;
          }
          if (cue) this.play(cue);
          if (!this.ctx || !this.graph || this.timer) return;
          this.graph.startAmbience(this.ctx.currentTime);
          this.graph.weather(this.raining, this.night);
          this.nextAt = Math.max(this.nextAt, this.ctx.currentTime + 0.06);
          const schedule = () => {
            if (!this.ctx || !this.graph || this.ctx.state !== "running")
              return;
            // Skip a stalled scheduler's past notes; never burst a backlog after a slow frame.
            if (this.nextAt < this.ctx.currentTime - 0.1)
              this.nextAt = this.ctx.currentTime + 0.04;
            while (this.nextAt < this.ctx.currentTime + 0.22) {
              if (this.preferences.music > 0)
                gardenScoreStep(this.step, this.night, this.blooming).forEach(
                  (note) => this.graph!.note(note, this.nextAt),
                );
              if (this.step % 72 === 24 && this.preferences.ambience > 0)
                this.graph.bird(this.nextAt, this.night);
              this.step++;
              this.nextAt += BEAT / 2;
            }
          };
          schedule();
          this.timer = setInterval(schedule, 50);
        })
        .catch(() => {
          /* Browser audio denial never prevents play. */
        });
    } catch {
      /* Audio unavailable: visual and text feedback remain complete. */
    }
  }
  play(kind: GardenCue, pan = 0) {
    if (
      !this.graph ||
      !this.ctx ||
      this.ctx.state !== "running" ||
      !this.playing ||
      !this.preferences.sound ||
      this.preferences.effects === 0
    )
      return;
    const now = this.ctx.currentTime;
    if (
      now - (this.lastCue.get(kind) ?? -Infinity) <
      (kind.startsWith("need-") || kind === "growing" ? 1.5 : 0.09)
    )
      return;
    this.lastCue.set(kind, now);
    this.graph.cue(kind, now + 0.005, Math.max(-0.65, Math.min(0.65, pan)));
  }
  private sleep() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (!this.ctx || this.ctx.state === "closed" || this.suspendTimer) return;
    this.graph?.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.012);
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = null;
      if (!this.playing || !this.preferences.sound || this.disposed)
        void this.ctx?.suspend().catch(() => {});
    }, 65);
  }
  dispose() {
    this.disposed = true;
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    this.timer = null;
    this.graph?.dispose();
    this.graph = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
