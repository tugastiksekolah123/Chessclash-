import { ThemeType } from '../chess/types';

export interface MusicTrack {
  id: string;
  name: string;
  subname: string;
  theme: ThemeType;
  description: string;
}

export const THEME_TRACKS: Record<ThemeType, MusicTrack[]> = {
  flower: [
    {
      id: 'meadow',
      name: 'Meadow Drift',
      subname: 'Semilir Padang Bunga',
      theme: 'flower',
      description: 'D major pentatonic chimes with lush synthetic reverb and soothing ambient warmth.'
    },
    {
      id: 'bloom',
      name: 'Breeze in Bloom',
      subname: 'Tunas Mekar',
      theme: 'flower',
      description: 'Floating flute-like melodies and blossoming bell arpeggios.'
    },
    {
      id: 'garden',
      name: "The Gardener's Waltz",
      subname: 'Waltz Sang Kebun',
      theme: 'flower',
      description: 'Gentle, contemplative 3-beat botanical lullaby.'
    }
  ],
  war: [
    {
      id: 'cosmic_war',
      name: 'Cosmic War Odyssey',
      subname: 'Odisei Perang Kosmik',
      theme: 'war',
      description: 'Pulsating deep-space gravitational sub-bass, stellar nebula sweeps, and cosmic machine war arpeggios.'
    },
    {
      id: 'orbital',
      name: 'Orbital Watch',
      subname: 'Patroli Orbit',
      theme: 'war',
      description: '55Hz sub drone bed, lowpass sweep, and tactical 880Hz sonar pings.'
    },
    {
      id: 'reactor',
      name: 'Reactor Pulse',
      subname: 'Detak Reaktor',
      theme: 'war',
      description: 'Pulsing cybernetic bassline and mechanical core resonance.'
    },
    {
      id: 'cyber',
      name: 'Cyber Grid',
      subname: 'Kisi Tempur Siber',
      theme: 'war',
      description: 'Atmospheric futuristic synthwave radar arpeggios.'
    }
  ],
  beast: [
    {
      id: 'primal_drums',
      name: 'Primal Savanna Drums',
      subname: 'Gendang Rimba Purba',
      theme: 'beast',
      description: 'Deep resonant jungle toms, rhythmic tribal footstep pulses, and stalking predator shakers.'
    },
    {
      id: 'apex_stalk',
      name: 'Apex Predator Stalk',
      subname: 'Intaian Sang Alpha',
      theme: 'beast',
      description: 'Tense low-frequency savanna drone, wild bone flutes, and ferocious hunting rhythm.'
    },
    {
      id: 'wild_fury',
      name: 'Fury of the Wild',
      subname: 'Kemurkaan Rimba Buas',
      theme: 'beast',
      description: 'Driving tribal war drums with rhythmic claw slash transients and savage horn calls.'
    }
  ],
  greek: [
    {
      id: 'olympus_hymn',
      name: 'Hymn of Mount Olympus',
      subname: 'Gita Suci Olympus',
      theme: 'greek',
      description: 'Golden Apollo lyre arpeggios, celestial choir harmonics, and majestic Olympian temple reverberation.'
    },
    {
      id: 'zeus_thunder',
      name: 'Thunder of Zeus',
      subname: 'Gemuruh Petir Keraunos',
      theme: 'greek',
      description: 'Epic brass fanfares, booming war kettle-drums, and electric sparks echoing from Mount Olympus.'
    },
    {
      id: 'aegean_odyssey',
      name: 'Aegean Sea Odyssey',
      subname: 'Pelayaran Samudera Poseidon',
      theme: 'greek',
      description: 'Rolling oceanic swells, tranquil Dorian harp melodies, and mystical Mediterranean winds.'
    }
  ]
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private flowerAmbientGain: GainNode | null = null;
  private warAmbientGain: GainNode | null = null;
  private beastAmbientGain: GainNode | null = null;
  private greekAmbientGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  private isMuted: boolean = false;
  private isMusicEnabled: boolean = true; // Music can be toggled on/off separately!
  private volumeLevel: 'low' | 'med' | 'high' = 'med';
  private currentTheme: ThemeType = 'flower';

  private selectedFlowerTrack: string = 'meadow';
  private selectedWarTrack: string = 'cosmic_war';
  private selectedBeastTrack: string = 'primal_drums';
  private selectedGreekTrack: string = 'olympus_hymn';

  private musicTimer: number | null = null;
  private waltzStep: number = 0;
  private cyberStep: number = 0;
  private beastStep: number = 0;
  private greekStep: number = 0;
  private activeVoices: Set<AudioNode> = new Set();
  private maxVoices = 18;
  private flowerLastPitchIndex = 2;

  constructor() {
    try {
      const savedMute = localStorage.getItem('chess_muted');
      this.isMuted = savedMute !== null ? savedMute === 'true' : false; // Default to unmuted on user action

      const savedMusic = localStorage.getItem('chess_music_enabled');
      this.isMusicEnabled = savedMusic !== null ? savedMusic === 'true' : true;

      const savedVol = localStorage.getItem('chess_volume') as 'low' | 'med' | 'high' | null;
      if (savedVol) this.volumeLevel = savedVol;

      const savedFlTrack = localStorage.getItem('chess_flower_track');
      if (savedFlTrack) this.selectedFlowerTrack = savedFlTrack;

      const savedWarTrack = localStorage.getItem('chess_war_track');
      if (savedWarTrack) this.selectedWarTrack = savedWarTrack;

      const savedBeastTrack = localStorage.getItem('chess_beast_track');
      if (savedBeastTrack) this.selectedBeastTrack = savedBeastTrack;

      const savedGreekTrack = localStorage.getItem('chess_greek_track');
      if (savedGreekTrack) this.selectedGreekTrack = savedGreekTrack;
    } catch {
      // localStorage fallback
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend();
          }
        } else {
          if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
            this.ctx.resume();
          }
        }
      });
    }
  }

  public initOnGesture(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      const targetVol = this.isMuted ? 0 : this.getVolumeMultiplier();
      this.masterGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus (boosted for rich, punchy feedback)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(1.35, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Master Bus (Can be turned ON/OFF independently!)
      this.musicGain = this.ctx.createGain();
      const targetMusicVol = this.isMusicEnabled && !this.isMuted ? 0.65 : 0;
      this.musicGain.gain.setValueAtTime(targetMusicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Procedural Reverb Convolver
      this.convolver = this.createSyntheticReverb(1.8, 2.5);
      this.convolver.connect(this.musicGain);

      // Flower theme music bus
      this.flowerAmbientGain = this.ctx.createGain();
      const flVol = this.currentTheme === 'flower' ? 1.0 : 0.0;
      this.flowerAmbientGain.gain.setValueAtTime(flVol, this.ctx.currentTime);
      this.flowerAmbientGain.connect(this.musicGain);

      // War theme music bus
      this.warAmbientGain = this.ctx.createGain();
      const warVol = this.currentTheme === 'war' ? 1.0 : 0.0;
      this.warAmbientGain.gain.setValueAtTime(warVol, this.ctx.currentTime);
      this.warAmbientGain.connect(this.musicGain);

      // Beast theme music bus
      this.beastAmbientGain = this.ctx.createGain();
      const beastVol = this.currentTheme === 'beast' ? 1.0 : 0.0;
      this.beastAmbientGain.gain.setValueAtTime(beastVol, this.ctx.currentTime);
      this.beastAmbientGain.connect(this.musicGain);

      // Greek Mount Olympus theme music bus
      this.greekAmbientGain = this.ctx.createGain();
      const greekVol = this.currentTheme === 'greek' ? 1.0 : 0.0;
      this.greekAmbientGain.gain.setValueAtTime(greekVol, this.ctx.currentTime);
      this.greekAmbientGain.connect(this.musicGain);

      this.startMusicScheduler();
    } catch (e) {
      console.warn('AudioContext init notice:', e);
    }
  }

  private createSyntheticReverb(duration: number, decay: number): ConvolverNode {
    if (!this.ctx) throw new Error('No context');
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.exp(-n * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    const conv = this.ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  private getVolumeMultiplier(): number {
    switch (this.volumeLevel) {
      case 'low': return 0.50;
      case 'med': return 0.85;
      case 'high': return 1.0;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('chess_muted', String(muted));
    } catch {}

    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = muted ? 0 : this.getVolumeMultiplier();
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + (muted ? 0.3 : 1.0));

    if (!muted && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.initOnGesture();
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // MUSIC ON / OFF TOGGLE (Dapat dipilih dinyalakan atau tidak)
  public toggleMusic(): boolean {
    this.initOnGesture();
    this.setMusicEnabled(!this.isMusicEnabled);
    return this.isMusicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.isMusicEnabled = enabled;
    try {
      localStorage.setItem('chess_music_enabled', String(enabled));
    } catch {}

    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const target = enabled && !this.isMuted ? 0.38 : 0;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + 0.8);
  }

  public isMusicActive(): boolean {
    return this.isMusicEnabled && !this.isMuted;
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  // TRACK SELECTION (Lagu yang sesuai dengan tema dan dapat dipilih)
  public selectTrack(trackId: string): void {
    if (this.currentTheme === 'flower') {
      this.selectedFlowerTrack = trackId;
      try { localStorage.setItem('chess_flower_track', trackId); } catch {}
    } else if (this.currentTheme === 'beast') {
      this.selectedBeastTrack = trackId;
      try { localStorage.setItem('chess_beast_track', trackId); } catch {}
    } else if (this.currentTheme === 'greek') {
      this.selectedGreekTrack = trackId;
      try { localStorage.setItem('chess_greek_track', trackId); } catch {}
    } else {
      this.selectedWarTrack = trackId;
      try { localStorage.setItem('chess_war_track', trackId); } catch {}
    }
    // Restart rhythm immediately
    this.triggerMusicStep();
  }

  public getCurrentTrack(): MusicTrack {
    const list = THEME_TRACKS[this.currentTheme];
    const currentId = this.currentTheme === 'flower' 
      ? this.selectedFlowerTrack 
      : (this.currentTheme === 'beast' ? this.selectedBeastTrack : (this.currentTheme === 'greek' ? this.selectedGreekTrack : this.selectedWarTrack));
    return list.find(t => t.id === currentId) || list[0];
  }

  public getTracksForTheme(theme: ThemeType): MusicTrack[] {
    return THEME_TRACKS[theme];
  }

  public cycleTrack(): MusicTrack {
    const list = THEME_TRACKS[this.currentTheme];
    const currentId = this.currentTheme === 'flower' 
      ? this.selectedFlowerTrack 
      : (this.currentTheme === 'beast' ? this.selectedBeastTrack : (this.currentTheme === 'greek' ? this.selectedGreekTrack : this.selectedWarTrack));
    const currentIndex = list.findIndex(t => t.id === currentId);
    const nextIndex = (currentIndex + 1) % list.length;
    const nextTrack = list[nextIndex];
    this.selectTrack(nextTrack.id);
    return nextTrack;
  }

  public cycleVolume(): 'low' | 'med' | 'high' {
    const order: ('low' | 'med' | 'high')[] = ['low', 'med', 'high'];
    const nextIdx = (order.indexOf(this.volumeLevel) + 1) % order.length;
    this.volumeLevel = order[nextIdx];
    try {
      localStorage.setItem('chess_volume', this.volumeLevel);
    } catch {}
    if (this.masterGain && this.ctx && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.getVolumeMultiplier(), now + 0.15);
    }
    return this.volumeLevel;
  }

  public getVolume(): 'low' | 'med' | 'high' {
    return this.volumeLevel;
  }

  public setTheme(theme: ThemeType): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    if (!this.ctx || !this.flowerAmbientGain || !this.warAmbientGain || !this.beastAmbientGain || !this.greekAmbientGain) return;

    const now = this.ctx.currentTime;
    this.flowerAmbientGain.gain.cancelScheduledValues(now);
    this.warAmbientGain.gain.cancelScheduledValues(now);
    this.beastAmbientGain.gain.cancelScheduledValues(now);
    this.greekAmbientGain.gain.cancelScheduledValues(now);

    this.flowerAmbientGain.gain.linearRampToValueAtTime(theme === 'flower' ? 1.0 : 0.0, now + 1.2);
    this.warAmbientGain.gain.linearRampToValueAtTime(theme === 'war' ? 1.0 : 0.0, now + 1.2);
    this.beastAmbientGain.gain.linearRampToValueAtTime(theme === 'beast' ? 1.0 : 0.0, now + 1.2);
    this.greekAmbientGain.gain.linearRampToValueAtTime(theme === 'greek' ? 1.0 : 0.0, now + 1.2);
  }

  // MUSIC GENERATION SCHEDULER
  private startMusicScheduler(): void {
    const loop = () => {
      this.triggerMusicStep();
      const delay = this.getStepDelay();
      this.musicTimer = window.setTimeout(loop, delay);
    };
    loop();
  }

  private getStepDelay(): number {
    if (this.currentTheme === 'flower') {
      switch (this.selectedFlowerTrack) {
        case 'meadow': return 1800 + Math.random() * 1200; // 1.8s - 3.0s
        case 'bloom': return 1200 + Math.random() * 800;   // 1.2s - 2.0s
        case 'garden': return 900;                         // 3/4 steady pulse
        default: return 1800;
      }
    } else if (this.currentTheme === 'beast') {
      switch (this.selectedBeastTrack) {
        case 'primal_drums': return 440; // 440ms primal savanna drum rhythm
        case 'apex_stalk': return 580;   // 580ms stalking tension
        case 'wild_fury': return 330;    // 330ms fast hunting war drums
        default: return 440;
      }
    } else if (this.currentTheme === 'greek') {
      switch (this.selectedGreekTrack) {
        case 'olympus_hymn': return 620; // 620ms flowing golden kithara arpeggio
        case 'zeus_thunder': return 460; // 460ms driving epic brass march
        case 'aegean_odyssey': return 850; // 850ms gentle ocean swell harp
        default: return 620;
      }
    } else {
      switch (this.selectedWarTrack) {
        case 'cosmic_war': return 480;                      // 480ms driving cosmic war pulse
        case 'orbital': return 3200 + Math.random() * 1200; // ~4s sonar pulse
        case 'reactor': return 650;                         // 650ms cybernetic bass
        case 'cyber': return 450;                           // 450ms synthwave step
        default: return 480;
      }
    }
  }

  private triggerMusicStep(): void {
    if (!this.ctx || !this.isMusicEnabled || this.isMuted) return;

    if (this.currentTheme === 'flower') {
      switch (this.selectedFlowerTrack) {
        case 'meadow':
          this.playMeadowNote();
          break;
        case 'bloom':
          this.playBloomNote();
          break;
        case 'garden':
          this.playGardenWaltzStep();
          break;
        default:
          this.playMeadowNote();
      }
    } else if (this.currentTheme === 'beast') {
      this.playBeastMusicStep();
    } else if (this.currentTheme === 'greek') {
      this.playGreekMusicStep();
    } else {
      switch (this.selectedWarTrack) {
        case 'cosmic_war':
          this.playCosmicWarStep();
          break;
        case 'orbital':
          this.playWarSonarPing();
          break;
        case 'reactor':
          this.playReactorPulse();
          break;
        case 'cyber':
          this.playCyberGridStep();
          break;
        default:
          this.playCosmicWarStep();
      }
    }
  }

  // TRACK 1 FLOWER: Meadow Drift (D Major Pentatonic)
  private playMeadowNote(): void {
    if (!this.ctx || !this.flowerAmbientGain) return;
    const scale = [146.83, 164.81, 185.00, 220.00, 246.94, 293.66, 329.63, 369.99, 440.00, 493.88, 587.33];
    const step = (Math.random() < 0.6 ? 1 : 2) * (Math.random() < 0.5 ? -1 : 1);
    let nextIdx = Math.max(0, Math.min(scale.length - 1, this.flowerLastPitchIndex + step));
    if (Math.random() < 0.12) nextIdx = scale.length - 1; // High chime
    this.flowerLastPitchIndex = nextIdx;
    const freq = scale[nextIdx];

    const osc = this.ctx.createOscillator();
    osc.type = Math.random() < 0.6 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.flowerAmbientGain);
    if (this.convolver) gain.connect(this.convolver);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  // TRACK 2 FLOWER: Breeze in Bloom (Flute-like Sweeps & Blossom Chimes)
  private playBloomNote(): void {
    if (!this.ctx || !this.flowerAmbientGain) return;
    const notes = [293.66, 329.63, 369.99, 440.00, 587.33, 659.25, 739.99]; // D E F# A D E F#
    const chosenFreq = notes[Math.floor(Math.random() * notes.length)];
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(chosenFreq * 0.98, now);
    osc.frequency.exponentialRampToValueAtTime(chosenFreq, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(chosenFreq * 1.5, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.flowerAmbientGain);
    if (this.convolver) gain.connect(this.convolver);

    osc.start(now);
    osc.stop(now + 1.7);
  }

  // TRACK 3 FLOWER: The Gardener's Waltz (3/4 Botanical Progression)
  private playGardenWaltzStep(): void {
    const ctx = this.ctx;
    const flGain = this.flowerAmbientGain;
    if (!ctx || !flGain) return;
    const now = ctx.currentTime;
    const step = this.waltzStep % 3;
    this.waltzStep++;

    if (step === 0) {
      // Beat 1: Root Bass Note (D or G)
      const bassFreq = Math.floor(this.waltzStep / 3) % 2 === 0 ? 146.83 : 196.00;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc.connect(gain);
      gain.connect(flGain);
      osc.start(now);
      osc.stop(now + 1.2);
    } else {
      // Beat 2 & 3: Soft Chord Chime
      const chord = [369.99, 440.00, 587.33]; // F# A D
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

        osc.connect(gain);
        gain.connect(flGain);
        osc.start(now);
        osc.stop(now + 0.75);
      });
    }
  }

  // TRACK 1 WAR: Orbital Watch (A minor/phrygian sub drone + 880Hz sonar ping)
  private playWarSonarPing(): void {
    if (!this.ctx || !this.warAmbientGain) return;
    const now = this.ctx.currentTime;

    // 55Hz sub drone pulse
    const drone = this.ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(55, now);

    const dFilter = this.ctx.createBiquadFilter();
    dFilter.type = 'lowpass';
    dFilter.frequency.setValueAtTime(260, now);

    const dGain = this.ctx.createGain();
    dGain.gain.setValueAtTime(0.001, now);
    dGain.gain.linearRampToValueAtTime(0.07, now + 0.3);
    dGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    drone.connect(dFilter);
    dFilter.connect(dGain);
    dGain.connect(this.warAmbientGain);
    drone.start(now);
    drone.stop(now + 1.9);

    // Sonar ping (~880Hz sine fast attack/decay)
    const ping = this.ctx.createOscillator();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(880, now + 0.1);

    const pGain = this.ctx.createGain();
    pGain.gain.setValueAtTime(0.001, now + 0.1);
    pGain.gain.linearRampToValueAtTime(0.05, now + 0.13);
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    ping.connect(pGain);
    pGain.connect(this.warAmbientGain);
    ping.start(now + 0.1);
    ping.stop(now + 1.3);
  }

  // TRACK 2 WAR: Reactor Pulse (Pulsing Cybernetic Bassline)
  private playReactorPulse(): void {
    if (!this.ctx || !this.warAmbientGain) return;
    const now = this.ctx.currentTime;
    const bassline = [110.00, 110.00, 130.81, 146.83, 110.00, 164.81];
    const freq = bassline[this.cyberStep % bassline.length];
    this.cyberStep++;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.warAmbientGain);

    osc.start(now);
    osc.stop(now + 0.58);
  }

  // TRACK 3 WAR: Cyber Grid (Atmospheric Synthwave Radar Sequence)
  private playCyberGridStep(): void {
    if (!this.ctx || !this.warAmbientGain) return;
    const now = this.ctx.currentTime;
    const arp = [220.00, 261.63, 329.63, 440.00, 392.00, 329.63, 261.63, 196.00];
    const freq = arp[this.cyberStep % arp.length];
    this.cyberStep++;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.8, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.warAmbientGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // TRACK 0 WAR: Cosmic War Odyssey (Deep Space Sub-Bass Pulse + Cosmic Constellation Arpeggios)
  private playCosmicWarStep(): void {
    if (!this.ctx || !this.warAmbientGain) return;
    const now = this.ctx.currentTime;
    const step = this.cyberStep++;

    // Cosmic chord progression: Dm -> Bb -> F -> A
    const bassline = [73.42, 73.42, 58.27, 58.27, 87.31, 87.31, 55.00, 55.00];
    const root = bassline[Math.floor(step / 2) % bassline.length];

    // 1. Deep Sub-Bass Drone on beat
    if (step % 2 === 0) {
      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(root, now);

      const subFilter = this.ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(200, now);
      subFilter.Q.setValueAtTime(4.5, now);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.08, now + 0.04);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.warAmbientGain);
      subOsc.start(now);
      subOsc.stop(now + 0.9);
    }

    // 2. Cosmic Constellation Star Arpeggio
    const starNotes = [293.66, 349.23, 440.00, 523.25, 587.33, 698.46, 880.00, 1046.50];
    const starFreq = starNotes[(step * 3) % starNotes.length];

    const starOsc = this.ctx.createOscillator();
    starOsc.type = (step % 4 === 0) ? 'triangle' : 'sine';
    starOsc.frequency.setValueAtTime(starFreq, now);

    const starFilter = this.ctx.createBiquadFilter();
    starFilter.type = 'bandpass';
    starFilter.frequency.setValueAtTime(starFreq * 1.4, now);
    starFilter.Q.setValueAtTime(3.5, now);

    const starGain = this.ctx.createGain();
    starGain.gain.setValueAtTime(0.001, now);
    starGain.gain.linearRampToValueAtTime(0.045, now + 0.02);
    starGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    starOsc.connect(starFilter);
    starFilter.connect(starGain);
    starGain.connect(this.warAmbientGain);
    starOsc.start(now);
    starOsc.stop(now + 0.42);

    // 3. Cosmic Pulsar / Star Laser sweep every 8 steps
    if (step % 8 === 0) {
      const sweepOsc = this.ctx.createOscillator();
      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(1200, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(260, now + 0.25);

      const sweepFilter = this.ctx.createBiquadFilter();
      sweepFilter.type = 'lowpass';
      sweepFilter.frequency.setValueAtTime(900, now);

      const sweepGain = this.ctx.createGain();
      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.035, now + 0.02);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      sweepOsc.connect(sweepFilter);
      sweepFilter.connect(sweepGain);
      sweepGain.connect(this.warAmbientGain);
      sweepOsc.start(now);
      sweepOsc.stop(now + 0.3);
    }
  }

  // TRACK BEAST: Primal Savanna Drums & Apex Predator Stalk
  private playBeastMusicStep(): void {
    if (!this.ctx || !this.beastAmbientGain) return;
    const now = this.ctx.currentTime;
    const step = this.beastStep++;

    // 1. Tribal Hand Drum / Deep Jungle Tom (Resonant pitch-dropping percussion)
    const isDownbeat = (step % 2 === 0);
    const drumPitch = isDownbeat ? 140 : (step % 4 === 1 ? 190 : 160);
    const drumEndPitch = isDownbeat ? 48 : 65;

    const drumOsc = this.ctx.createOscillator();
    drumOsc.type = 'triangle';
    drumOsc.frequency.setValueAtTime(drumPitch, now);
    drumOsc.frequency.exponentialRampToValueAtTime(drumEndPitch, now + 0.14);

    const drumGain = this.ctx.createGain();
    drumGain.gain.setValueAtTime(0.001, now);
    drumGain.gain.linearRampToValueAtTime(isDownbeat ? 0.12 : 0.08, now + 0.015);
    drumGain.gain.exponentialRampToValueAtTime(0.0001, now + (isDownbeat ? 0.35 : 0.22));

    drumOsc.connect(drumGain);
    drumGain.connect(this.beastAmbientGain);
    drumOsc.start(now);
    drumOsc.stop(now + 0.38);

    // 2. Savanna Shaker / Predator Grass Rustle
    if (step % 2 === 1 || this.selectedBeastTrack === 'wild_fury') {
      this.playShakerNote(now);
    }

    // 3. Primal Bone Flute / Savanna Horn Motif (African Pentatonic: D, F, G, A, C)
    if (this.selectedBeastTrack === 'apex_stalk' || step % 4 === 2) {
      const melodyNotes = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33];
      const noteFreq = melodyNotes[(step * 2) % melodyNotes.length];

      const fluteOsc = this.ctx.createOscillator();
      fluteOsc.type = 'sine';
      fluteOsc.frequency.setValueAtTime(noteFreq * 0.98, now);
      fluteOsc.frequency.linearRampToValueAtTime(noteFreq, now + 0.08);

      const fluteFilter = this.ctx.createBiquadFilter();
      fluteFilter.type = 'lowpass';
      fluteFilter.frequency.setValueAtTime(noteFreq * 2.2, now);

      const fluteGain = this.ctx.createGain();
      fluteGain.gain.setValueAtTime(0.001, now);
      fluteGain.gain.linearRampToValueAtTime(0.05, now + 0.06);
      fluteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

      fluteOsc.connect(fluteFilter);
      fluteFilter.connect(fluteGain);
      fluteGain.connect(this.beastAmbientGain);
      if (this.convolver) fluteGain.connect(this.convolver);

      fluteOsc.start(now);
      fluteOsc.stop(now + 0.52);
    }
  }

  private playShakerNote(now: number): void {
    if (!this.ctx || !this.beastAmbientGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.beastAmbientGain);
    noise.start(now);
  }

  // TRACK GREEK: Mount Olympus Celestial Hymn & Thunder of Zeus
  private playGreekMusicStep(): void {
    if (!this.ctx || !this.greekAmbientGain) return;
    const now = this.ctx.currentTime;
    const step = this.greekStep++;

    if (this.selectedGreekTrack === 'zeus_thunder') {
      // Epic Zeus Thunder March: driving Dorian brass & thunderous kettle-drum
      const isDownbeat = (step % 2 === 0);
      const drumPitch = isDownbeat ? 120 : (step % 4 === 1 ? 160 : 130);
      const drumEndPitch = isDownbeat ? 38 : 50;

      const drumOsc = this.ctx.createOscillator();
      drumOsc.type = 'triangle';
      drumOsc.frequency.setValueAtTime(drumPitch, now);
      drumOsc.frequency.exponentialRampToValueAtTime(drumEndPitch, now + 0.16);

      const drumGain = this.ctx.createGain();
      drumGain.gain.setValueAtTime(0.001, now);
      drumGain.gain.linearRampToValueAtTime(isDownbeat ? 0.14 : 0.09, now + 0.015);
      drumGain.gain.exponentialRampToValueAtTime(0.0001, now + (isDownbeat ? 0.4 : 0.25));

      drumOsc.connect(drumGain);
      drumGain.connect(this.greekAmbientGain);
      drumOsc.start(now);
      drumOsc.stop(now + 0.45);

      // Heroic Dorian brass fanfare
      const brassScale = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
      if (step % 2 === 1 || Math.random() < 0.4) {
        const brassFreq = brassScale[(Math.floor(step / 2)) % brassScale.length];
        const brassOsc = this.ctx.createOscillator();
        brassOsc.type = 'sawtooth';
        brassOsc.frequency.setValueAtTime(brassFreq, now);

        const brassFilter = this.ctx.createBiquadFilter();
        brassFilter.type = 'lowpass';
        brassFilter.frequency.setValueAtTime(brassFreq * 2.5, now);
        brassFilter.frequency.exponentialRampToValueAtTime(brassFreq * 1.2, now + 0.3);

        const brassGain = this.ctx.createGain();
        brassGain.gain.setValueAtTime(0.001, now);
        brassGain.gain.linearRampToValueAtTime(0.08, now + 0.03);
        brassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        brassOsc.connect(brassFilter);
        brassFilter.connect(brassGain);
        brassGain.connect(this.greekAmbientGain);
        if (this.convolver) brassGain.connect(this.convolver);
        brassOsc.start(now);
        brassOsc.stop(now + 0.42);
      }
    } else if (this.selectedGreekTrack === 'aegean_odyssey') {
      // Aegean Odyssey: Gentle rolling oceanic waves + tranquil Dorian harp arpeggios
      const scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
      const noteIdx = (step * 3) % scale.length;
      const freq = scale[noteIdx];

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.greekAmbientGain);
      if (this.convolver) gain.connect(this.convolver);
      osc.start(now);
      osc.stop(now + 0.75);
    } else {
      // Hymn of Mount Olympus: Apollo's Golden Lyre (Kithara) arpeggio + celestial harmonics
      const lyreScale = [220.00, 246.94, 293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99];
      const stepIdx = (step % lyreScale.length);
      const freq = lyreScale[stepIdx];

      const lyreOsc = this.ctx.createOscillator();
      lyreOsc.type = 'triangle';
      lyreOsc.frequency.setValueAtTime(freq, now);

      const harmOsc = this.ctx.createOscillator();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(freq * 2, now);

      const lyreGain = this.ctx.createGain();
      lyreGain.gain.setValueAtTime(0.001, now);
      lyreGain.gain.linearRampToValueAtTime(0.11, now + 0.008);
      lyreGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      const harmGain = this.ctx.createGain();
      harmGain.gain.setValueAtTime(0.001, now);
      harmGain.gain.linearRampToValueAtTime(0.045, now + 0.01);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      lyreOsc.connect(lyreGain);
      harmOsc.connect(harmGain);
      lyreGain.connect(this.greekAmbientGain);
      harmGain.connect(this.greekAmbientGain);
      if (this.convolver) {
        lyreGain.connect(this.convolver);
        harmGain.connect(this.convolver);
      }

      lyreOsc.start(now);
      harmOsc.start(now);
      lyreOsc.stop(now + 0.6);
      harmOsc.stop(now + 0.38);
    }
  }

  // GREEK SFX: Zeus almighty thunderbolt crackle + reverberating thunder rumble
  public playThunderBolt(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. High-voltage lightning snap transient
    this.playNoiseBurst(0.25);

    // 2. Crackling electrical discharge sweep
    const boltOsc = this.ctx.createOscillator();
    boltOsc.type = 'sawtooth';
    boltOsc.frequency.setValueAtTime(980, now);
    boltOsc.frequency.exponentialRampToValueAtTime(90, now + 0.18);

    const boltFilter = this.ctx.createBiquadFilter();
    boltFilter.type = 'lowpass';
    boltFilter.frequency.setValueAtTime(1400, now);
    boltFilter.Q.setValueAtTime(4.0, now);

    const boltGain = this.ctx.createGain();
    boltGain.gain.setValueAtTime(0.24, now);
    boltGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    boltOsc.connect(boltFilter);
    boltFilter.connect(boltGain);
    boltGain.connect(this.sfxGain);
    boltOsc.start(now);
    boltOsc.stop(now + 0.3);

    // 3. Deep rolling Mount Olympus thunder rumble (sub-bass aftershock)
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const rumble = this.ctx.createOscillator();
      rumble.type = 'triangle';
      rumble.frequency.setValueAtTime(75, t);
      rumble.frequency.exponentialRampToValueAtTime(32, t + 0.55);

      const rumbleGain = this.ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.22, t);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

      rumble.connect(rumbleGain);
      rumbleGain.connect(this.sfxGain!);
      rumble.start(t);
      rumble.stop(t + 0.65);
    }, 45);
  }

  // GREEK SFX: Majestic Olympian horn / Delphi oracle fanfare
  public playOlympianHorn(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSynthTone(freq, 'sawtooth', 0.02, 0.35, 0.16);
      }, idx * 90);
    });
  }

  // BEAST SFX: Ferocious claw slash + predatory roar
  public playBeastRoar(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. Savage Claw Slash transient
    this.playNoiseBurst(0.22);

    // 2. Resonant Guttural Beast Roar (low rumble dropping in pitch)
    const roar = this.ctx.createOscillator();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(160, now);
    roar.frequency.exponentialRampToValueAtTime(55, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.Q.setValueAtTime(6.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    roar.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    roar.start(now);
    roar.stop(now + 0.45);
  }

  public playBeastGrowl(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playBeastTriumph(): void {
    this.playBeastRoar();
    setTimeout(() => {
      [90, 110, 140, 180].forEach((freq, idx) => {
        setTimeout(() => this.playSynthTone(freq, 'triangle', 0.02, 0.4, 0.12), idx * 100);
      });
    }, 150);
  }

  // BEAST SFX: Heavy Colossus Gorilla Punch / Knuckle Impact
  public playBeastPunch(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. Crisp Knuckle Crack Transient
    this.playNoiseBurst(0.12);

    // 2. Heavy Sub-Bass Impact Boom
    const punchOsc = this.ctx.createOscillator();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(110, now);
    punchOsc.frequency.exponentialRampToValueAtTime(26, now + 0.22);

    const punchFilter = this.ctx.createBiquadFilter();
    punchFilter.type = 'lowpass';
    punchFilter.frequency.setValueAtTime(280, now);
    punchFilter.Q.setValueAtTime(3.0, now);

    const punchGain = this.ctx.createGain();
    punchGain.gain.setValueAtTime(0.24, now);
    punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    punchOsc.connect(punchFilter);
    punchFilter.connect(punchGain);
    punchGain.connect(this.sfxGain);
    punchOsc.start(now);
    punchOsc.stop(now + 0.35);
  }

  // AMBUSH SFX (Venus Flytrap / Botanical Vine Trap Snap)
  public playAmbushTrap(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. Vine Rustle Whipping Whoosh
    this.playNoiseBurst(0.18);

    // 2. Carnivorous Trap Jaw Snap (Crisp snappy woody bite)
    const snap = this.ctx.createOscillator();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(340, now);
    snap.frequency.exponentialRampToValueAtTime(65, now + 0.12);

    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.18, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    snap.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snap.start(now);
    snap.stop(now + 0.2);

    // 3. Shimmering Spore & Pollen Burst Bloom Chimes
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      [659.25, 783.99, 987.77, 1318.51].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.04);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, t + i * 0.04);
        gain.gain.linearRampToValueAtTime(0.06, t + i * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(t + i * 0.04);
        osc.stop(t + i * 0.04 + 0.5);
      });
    }, 70);
  }

  // SFX EVENT PLAYBACK
  public play(event: 'select' | 'move' | 'capture' | 'ambush' | 'punch' | 'castle' | 'check' | 'checkmate' | 'stalemate' | 'draw_offer' | 'promotion' | 'victory' | 'defeat' | 'time_low' | 'flag_fall' | 'ui'): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    if (this.activeVoices.size >= this.maxVoices) return;

    switch (event) {
      case 'ambush':
        this.playAmbushTrap();
        break;
      case 'punch':
        this.playBeastPunch();
        break;
      case 'select':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(520, 'triangle', 0.01, 0.12, 0.08);
        } else if (this.currentTheme === 'beast') {
          this.playSynthTone(180, 'triangle', 0.01, 0.08, 0.09); // Low paw thump
        } else if (this.currentTheme === 'greek') {
          this.playSynthTone(784, 'triangle', 0.01, 0.15, 0.14); // Apollo golden lyre pluck
        } else {
          this.playSynthTone(1200, 'square', 0.005, 0.04, 0.06);
        }
        break;

      case 'move':
        if (this.currentTheme === 'flower') {
          this.playWhoosh(600, 1200, 0.25);
        } else if (this.currentTheme === 'beast') {
          this.playWhoosh(350, 180, 0.16); // Stalking predator step
        } else if (this.currentTheme === 'greek') {
          this.playWhoosh(750, 1400, 0.2); // Winged sandals celestial breeze
        } else {
          this.playSynthTone(660, 'sine', 0.01, 0.09, 0.08);
        }
        break;

      case 'capture':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(160, 'sine', 0.02, 0.35, 0.15);
          setTimeout(() => this.playSynthTone(784, 'triangle', 0.02, 0.3, 0.09), 60);
        } else if (this.currentTheme === 'beast') {
          this.playBeastRoar(); // Fierce claw slash & savage predator roar!
        } else if (this.currentTheme === 'greek') {
          this.playThunderBolt(); // Zeus almighty thunderbolt!
        } else {
          this.playNoiseBurst(0.28);
          this.playSynthTone(95, 'sawtooth', 0.01, 0.3, 0.14);
        }
        break;

      case 'castle':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(587, 'triangle', 0.02, 0.25, 0.08);
          setTimeout(() => this.playSynthTone(880, 'triangle', 0.02, 0.35, 0.08), 120);
        } else if (this.currentTheme === 'beast') {
          this.playSynthTone(220, 'triangle', 0.02, 0.2, 0.1);
          setTimeout(() => this.playSynthTone(330, 'triangle', 0.02, 0.25, 0.1), 100);
        } else if (this.currentTheme === 'greek') {
          this.playSynthTone(587.33, 'sawtooth', 0.02, 0.25, 0.12);
          setTimeout(() => this.playSynthTone(880, 'sawtooth', 0.02, 0.35, 0.14), 110);
        } else {
          this.playSynthTone(1400, 'square', 0.005, 0.05, 0.08);
          setTimeout(() => this.playSynthTone(1100, 'square', 0.005, 0.05, 0.08), 90);
        }
        break;

      case 'check':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(880, 'sine', 0.02, 0.5, 0.12);
        } else if (this.currentTheme === 'beast') {
          this.playBeastGrowl(); // Alpha predator warning snarl/growl
        } else if (this.currentTheme === 'greek') {
          this.playOlympianHorn(); // Delphi oracle warning fanfare
        } else {
          this.playSynthTone(1400, 'sawtooth', 0.01, 0.14, 0.1);
          setTimeout(() => this.playSynthTone(1400, 'sawtooth', 0.01, 0.16, 0.1), 160);
        }
        break;

      case 'checkmate':
      case 'victory':
        if (this.currentTheme === 'flower') {
          const notes = [440, 554.37, 659.25, 880, 1108.73];
          notes.forEach((freq, idx) => {
            setTimeout(() => this.playSynthTone(freq, 'triangle', 0.03, 0.45, 0.09), idx * 110);
          });
        } else if (this.currentTheme === 'beast') {
          this.playBeastTriumph(); // Apex Lion King triumphant roar
        } else if (this.currentTheme === 'greek') {
          this.playThunderBolt();
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            setTimeout(() => this.playSynthTone(freq, 'sawtooth', 0.02, 0.4, 0.15), idx * 110);
          });
        } else {
          const notes = [1200, 950, 720, 480];
          notes.forEach((freq, idx) => {
            setTimeout(() => this.playSynthTone(freq, 'sawtooth', 0.02, 0.35, 0.09), idx * 130);
          });
        }
        break;

      case 'defeat':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(392, 'sine', 0.05, 0.5, 0.1);
          setTimeout(() => this.playSynthTone(293.66, 'sine', 0.05, 0.8, 0.1), 220);
        } else if (this.currentTheme === 'beast') {
          this.playSynthTone(140, 'sawtooth', 0.05, 0.6, 0.12);
          setTimeout(() => this.playSynthTone(75, 'sawtooth', 0.05, 0.8, 0.12), 220);
        } else if (this.currentTheme === 'greek') {
          const notes = [440, 392, 349.23, 293.66];
          notes.forEach((freq, idx) => {
            setTimeout(() => this.playSynthTone(freq, 'sine', 0.04, 0.6, 0.14), idx * 160);
          });
        } else {
          this.playSynthTone(220, 'sawtooth', 0.03, 0.6, 0.1);
          setTimeout(() => this.playSynthTone(110, 'sawtooth', 0.03, 0.9, 0.12), 200);
        }
        break;

      case 'stalemate':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(440, 'triangle', 0.03, 0.4, 0.08);
          setTimeout(() => this.playSynthTone(440, 'triangle', 0.03, 0.5, 0.08), 160);
        } else {
          this.playSynthTone(600, 'square', 0.01, 0.08, 0.07);
          setTimeout(() => this.playSynthTone(600, 'square', 0.01, 0.08, 0.07), 120);
        }
        break;

      case 'draw_offer':
        this.playSynthTone(587.33, 'triangle', 0.02, 0.25, 0.07);
        setTimeout(() => this.playSynthTone(740, 'triangle', 0.02, 0.3, 0.08), 120);
        break;

      case 'promotion':
        if (this.currentTheme === 'flower') {
          [523.25, 659.25, 783.99].forEach((freq, idx) => {
            setTimeout(() => this.playSynthTone(freq, 'triangle', 0.02, 0.35, 0.09), idx * 90);
          });
        } else {
          [880, 1100].forEach((freq, idx) => {
            setTimeout(() => this.playSynthTone(freq, 'sawtooth', 0.01, 0.2, 0.09), idx * 100);
          });
        }
        break;

      case 'time_low':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(700, 'sine', 0.01, 0.08, 0.06);
        } else {
          this.playSynthTone(1100, 'square', 0.01, 0.09, 0.07);
        }
        break;

      case 'flag_fall':
        if (this.currentTheme === 'flower') {
          this.playSynthTone(330, 'triangle', 0.05, 0.7, 0.12);
        } else {
          this.playSynthTone(140, 'sawtooth', 0.01, 0.7, 0.15);
        }
        break;

      case 'ui':
        this.playSynthTone(this.currentTheme === 'flower' ? 660 : 1000, 'sine', 0.005, 0.05, 0.14);
        break;
    }
  }

  // Triumphant Level-Up Fanfare (Rich ascending melodic chord)
  public playLevelUp(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSynthTone(freq, idx < 3 ? 'triangle' : 'sine', 0.02, 0.5, 0.22);
      }, idx * 75);
    });
  }

  // Task Completion Sparkle Chime
  public playTaskComplete(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    const notes = [880.00, 1108.73, 1318.51]; // A5, C#6, E6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSynthTone(freq, 'sine', 0.015, 0.35, 0.25);
      }, idx * 90);
    });
  }

  // Extra Pion Awakening & Selection Resonance
  public playExtraPionSelect(): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    this.playSynthTone(440, 'triangle', 0.02, 0.3, 0.2);
    setTimeout(() => this.playSynthTone(880, 'sine', 0.02, 0.4, 0.25), 80);
    setTimeout(() => this.playSynthTone(1320, 'sine', 0.02, 0.5, 0.18), 160);
  }

  // Distinct Theme Hover & Interaction Sounds
  public playThemeHover(theme: ThemeType): void {
    if (this.isMuted) return;
    this.initOnGesture();
    if (!this.ctx || !this.sfxGain) return;
    if (theme === 'flower') {
      this.playSynthTone(784, 'sine', 0.01, 0.08, 0.16); // Gentle dewy chime
    } else if (theme === 'war') {
      this.playSynthTone(1400, 'square', 0.005, 0.04, 0.12); // Digital laser click
    } else if (theme === 'greek') {
      this.playSynthTone(880, 'triangle', 0.008, 0.1, 0.18); // Golden Olympian Lyre pluck
      setTimeout(() => this.playSynthTone(1320, 'sine', 0.005, 0.12, 0.15), 40); // Celestial spark
    } else {
      this.playSynthTone(220, 'triangle', 0.01, 0.09, 0.18); // Low predator pulse
    }
  }

  private playSynthTone(freq: number, type: OscillatorType, attack: number, decay: number, peakGain: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Boosted peak gain for clear audibility
    const boostedGain = Math.min(0.9, peakGain * 1.8);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(boostedGain, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    this.activeVoices.add(osc);
    osc.onended = () => this.activeVoices.delete(osc);

    osc.start(now);
    osc.stop(now + decay + 0.05);
  }

  private playWhoosh(startF: number, endF: number, duration: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startF, now);
    filter.frequency.exponentialRampToValueAtTime(endF, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.24, now + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
  }

  private playNoiseBurst(duration: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);
  }
}

export const audio = new AudioEngine();
