export type GolfSound = 'putt' | 'snap' | 'bounce' | 'splash' | 'cup';

const MUTE_KEY = 'putt-pocket-muted';

export function makeGolfAudio(button: HTMLButtonElement) {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let noise: AudioBuffer | undefined;
  let muted = false;
  let unlockRequest: Promise<void> | undefined;
  let lastBounce = -Infinity;
  let pullVoice: { tone: OscillatorNode; tremor: OscillatorNode; depth: GainNode; envelope: GainNode } | undefined;
  let lastPull = 0;
  try { muted = localStorage.getItem(MUTE_KEY) === 'true'; } catch { /* Private storage may be disabled. */ }

  function updateButton() {
    button.setAttribute('aria-pressed', String(muted));
    button.title = muted ? 'Unmute sound' : 'Mute sound';
  }

  function unlock() {
    if (muted || context?.state === 'running' || typeof AudioContext === 'undefined') return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.42;
        master.connect(context.destination);
      }
      if (master) master.gain.setTargetAtTime(0.42, context.currentTime, 0.012);
      if (context.state === 'running') return;
      const request = context.resume();
      unlockRequest = request;
      void request.catch(() => {}).finally(() => {
        if (unlockRequest === request) unlockRequest = undefined;
      });
    } catch {
      // Sound is optional. A browser that blocks Web Audio can still run the game.
    }
  }

  function stopPull() {
    lastPull = 0;
    if (!pullVoice || !context) return;
    const { tone, tremor, depth, envelope } = pullVoice;
    pullVoice = undefined;
    const now = context.currentTime;
    envelope.gain.cancelScheduledValues(now);
    envelope.gain.setTargetAtTime(0, now, 0.012);
    tone.onended = () => { depth.disconnect(); envelope.disconnect(); };
    tone.stop(now + 0.060);
    tremor.stop(now + 0.060);
  }

  function pull(power: number) {
    if (power < 0.045) {
      stopPull();
      return;
    }
    if (muted || !master || !context || context.state !== 'running') return;
    const change = Math.abs(power - lastPull);
    if (change < 0.018) return;
    lastPull = power;
    const now = context.currentTime;
    if (!pullVoice) {
      const tone = context.createOscillator();
      const tremor = context.createOscillator();
      const depth = context.createGain();
      const envelope = context.createGain();
      tone.type = 'triangle';
      tone.frequency.value = 100;
      tremor.frequency.value = 20;
      depth.gain.value = 16;
      envelope.gain.value = 0;
      tremor.connect(depth);
      depth.connect(tone.frequency);
      tone.connect(envelope);
      envelope.connect(master);
      tone.start(now);
      tremor.start(now);
      pullVoice = { tone, tremor, depth, envelope };
    }
    const voice = pullVoice;
    voice.tone.frequency.setTargetAtTime(95 + 300 * power ** 1.25, now, 0.024);
    voice.tremor.frequency.setTargetAtTime(16 + 18 * power, now, 0.028);
    voice.depth.gain.setTargetAtTime(16 + 22 * power, now, 0.028);
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setTargetAtTime(Math.min(0.17, 0.042 + change * 0.48 + power * 0.055), now, 0.016);
    // Stretching makes the sound. Holding the aim stays quiet.
    voice.envelope.gain.setTargetAtTime(0, now + 0.075, 0.041);
  }

  function play(kind: GolfSound, ownBall = true) {
    if (muted || !master || !context || (context.state !== 'running' && !unlockRequest)) return;
    const audio = context;
    const output = master;
    const now = audio.currentTime;
    const volume = ownBall ? 1 : 0.42;

    function note(from: number, to: number, duration: number, level: number, shape: OscillatorType, delay = 0) {
      const start = now + delay;
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(level * volume, start + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(output);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
      oscillator.onended = () => envelope.disconnect();
    }

    function rustle(duration: number, startFrequency: number, endFrequency: number, level: number) {
      if (!noise) {
        noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.38), audio.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const envelope = audio.createGain();
      source.buffer = noise;
      filter.type = 'bandpass';
      filter.Q.value = 0.8;
      filter.frequency.setValueAtTime(startFrequency, now);
      filter.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(level * volume, now + 0.013);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(output);
      source.start(now);
      source.stop(now + duration + 0.01);
      source.onended = () => { filter.disconnect(); envelope.disconnect(); };
    }

    switch (kind) {
      case 'putt':
        note(980, 370, 0.075, 0.32, 'triangle');
        rustle(0.056, 2350, 950, 0.19);
        break;
      case 'snap':
        note(690, 145, 0.119, 0.25, 'triangle');
        rustle(0.052, 3200, 830, 0.14);
        break;
      case 'bounce':
        if (now - lastBounce < 0.085) break;
        lastBounce = now;
        note(590, 225, 0.086, 0.22, 'triangle');
        break;
      case 'splash':
        rustle(0.31, 2200, 490, 0.42);
        note(255, 93, 0.23, 0.27, 'sine');
        note(360, 172, 0.16, 0.12, 'sine', 0.063);
        break;
      case 'cup':
        note(310, 134, 0.14, 0.30, 'triangle');
        note(659, 659, 0.22, 0.17, 'sine', 0.09);
        note(880, 880, 0.31, 0.16, 'sine', 0.17);
        break;
    }
  }

  button.addEventListener('click', () => {
    muted = !muted;
    if (muted) stopPull();
    try { localStorage.setItem(MUTE_KEY, String(muted)); } catch { /* The toggle still works for this page. */ }
    if (context && master) master.gain.setTargetAtTime(muted ? 0 : 0.42, context.currentTime, 0.012);
    if (!muted) unlock();
    updateButton();
  });
  updateButton();

  return { unlock, play, pull, stopPull };
}
