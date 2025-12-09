// Simple synth-based audio generator to avoid external asset dependencies

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
const ctx = new AudioContext();

const playTone = (freq: number, type: OscillatorType, duration: number, delay = 0, vol = 0.1) => {
  if (ctx.state === 'suspended') ctx.resume();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
};

const playNoise = (duration: number, vol = 0.05) => {
    if (ctx.state === 'suspended') ctx.resume();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
};

export const playSound = (type: 'win' | 'loss' | 'card' | 'slot-reel' | 'dice-shake' | 'jackpot') => {
  try {
      switch (type) {
        case 'win':
          // Bright Arcade Win
          playTone(523.25, 'sine', 0.1, 0, 0.1); // C5
          playTone(659.25, 'sine', 0.1, 0.1, 0.1); // E5
          playTone(783.99, 'square', 0.2, 0.2, 0.05); // G5
          break;
        case 'jackpot':
           // Long celebration
           [0, 0.1, 0.2, 0.3, 0.4].forEach((d, i) => {
               playTone(523.25 + (i*100), 'triangle', 0.2, d, 0.1);
           });
           break;
        case 'loss':
          playTone(150, 'sawtooth', 0.3, 0, 0.1);
          playTone(100, 'sawtooth', 0.4, 0.2, 0.1);
          break;
        case 'card':
          // Crisp snap
          playTone(1200, 'triangle', 0.05, 0, 0.02);
          playNoise(0.03, 0.05); 
          break;
        case 'slot-reel':
          // Mechanical Clack/Blip
          // High pitch short blip + mechanical noise
          playTone(800, 'square', 0.05, 0, 0.03); 
          playNoise(0.05, 0.04);
          break;
        case 'dice-shake':
          // Rattle
          playNoise(0.1, 0.08);
          playTone(600, 'square', 0.05, 0.02, 0.02);
          break;
      }
  } catch (e) {
      console.error("Audio playback failed", e);
  }
};