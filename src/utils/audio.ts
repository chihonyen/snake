// Simple 8-bit sound effects using Web Audio API

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  return isMuted;
}

export function getMuteState(): boolean {
  return isMuted;
}

export function playEatSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio error', e);
  }
}

export function playGoldenEatSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.2); // C6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn('Audio error', e);
  }
}

export function playChiliEatSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio error', e);
  }
}

export function playCollisionSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    // Use low white/brown noise for explosion/crash or a rapidly sliding down sawtooth
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Audio error', e);
  }
}

export function playMoveSound() {
  // Silent or very subtle tick
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);

    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch (e) {
    console.warn('Audio error', e);
  }
}

export function playNewHighScoreSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gain.gain.setValueAtTime(0.15, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.01, now + index * 0.08 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.2);
    });
  } catch (e) {
    console.warn('Audio error', e);
  }
}
