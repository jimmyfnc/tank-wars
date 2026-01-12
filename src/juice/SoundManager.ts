// src/juice/SoundManager.ts

import { JUICE_CONFIG } from './JuiceConfig';

/**
 * Sound provider interface for future extensibility.
 * Allows swapping between synth sounds and file-based sounds.
 */
export interface ISoundProvider {
  play(name: string, options?: SoundOptions): void;
  setVolume(volume: number): void;
}

export interface SoundOptions {
  intensity?: number; // 0-1, affects volume and pitch
  x?: number; // For positional audio (optional future use)
}

/**
 * SynthSoundProvider - Procedural sound synthesis using Web Audio API.
 * Generates SNES-style retro sounds without audio files.
 */
class SynthSoundProvider implements ISoundProvider {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: number = 0;
  private maxOscillators: number = 6; // SNES-style limited channels
  private noiseBufferCache: Map<number, AudioBuffer> = new Map(); // Cache noise buffers by duration

  private getContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = JUICE_CONFIG.masterVolume;
      } catch {
        console.warn('Web Audio API not available');
        return null;
      }
    }
    return this.audioContext;
  }

  play(name: string, options: SoundOptions = {}): void {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    // Resume context if suspended (browser autoplay policy).
    // Note: ctx.resume() is async but we intentionally don't await it here.
    // If the context is suspended, sounds will queue and play when resumed.
    // This avoids blocking the game loop while waiting for user interaction.
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Limit simultaneous sounds (SNES style)
    if (this.activeOscillators >= this.maxOscillators) return;

    const intensity = options.intensity ?? 1.0;
    const config = JUICE_CONFIG.sounds[name as keyof typeof JUICE_CONFIG.sounds];
    if (!config) return;

    // Validate config values
    const duration = config.duration > 0 ? config.duration : 0.1;
    const noiseAmount = Math.max(0, Math.min(1, config.noiseAmount));

    const now = ctx.currentTime;

    // Create oscillator for tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'square'; // SNES-style square wave
    osc.frequency.value = config.frequency * (0.95 + Math.random() * 0.1); // ±5% variation

    // Create noise for texture (using cached buffer)
    const noiseBuffer = this.getOrCreateNoiseBuffer(ctx, duration);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = config.frequency * 2;
    noiseFilter.Q.value = 1;

    // Connect oscillator
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // Connect noise
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Set volumes based on noise amount and intensity
    const baseVolume = 0.3 * intensity;
    oscGain.gain.setValueAtTime(baseVolume * (1 - noiseAmount), now);
    noiseGain.gain.setValueAtTime(baseVolume * noiseAmount, now);

    // Envelope: quick attack, decay to zero
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Pitch drop for impact sounds
    if (name === 'explosion' || name === 'hit' || name === 'land') {
      osc.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, now + duration);
    }

    // Start and stop
    this.activeOscillators++;
    osc.start(now);
    noise.start(now);
    osc.stop(now + duration);
    noise.stop(now + duration);

    osc.onended = () => {
      this.activeOscillators--;
      osc.disconnect();
      oscGain.disconnect();
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
  }

  /**
   * Get or create a noise buffer for the given duration.
   * Caches buffers by duration to prevent memory leaks from recreating buffers.
   */
  private getOrCreateNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    // Check cache first
    const cached = this.noiseBufferCache.get(duration);
    if (cached) {
      return cached;
    }

    // Create new buffer
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Cache for reuse
    this.noiseBufferCache.set(duration, buffer);

    return buffer;
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }
}

/**
 * SoundManager - Central audio management.
 * Wraps sound provider for easy swapping between synth and file-based sounds.
 */
export class SoundManager {
  private provider: ISoundProvider;

  constructor() {
    this.provider = new SynthSoundProvider();
  }

  /**
   * Play a sound effect.
   */
  play(name: string, options?: SoundOptions): void {
    if (!JUICE_CONFIG.enableSound) return;
    this.provider.play(name, options);
  }

  /**
   * Set master volume.
   */
  setVolume(volume: number): void {
    JUICE_CONFIG.masterVolume = volume;
    this.provider.setVolume(volume);
  }

  /**
   * Swap to a different sound provider (for future file-based sounds).
   */
  setProvider(provider: ISoundProvider): void {
    this.provider = provider;
  }
}
