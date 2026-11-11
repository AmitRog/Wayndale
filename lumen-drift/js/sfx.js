/* Lumen Drift — synthesized audio (no assets): engine, effects and a small generative soundtrack. */
(function (root) {
  'use strict';
  let ctx = null, master = null, musicBus = null, fxBus = null, eng = null, noiseBuf = null, delay = null;
  let muted = false, musicOn = false, sector = 0, step = 0, nextT = 0, timer = null;

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // chord roots + qualities per sector (4 bars each)
  const SONGS = [
    { bpm: 112, chords: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']] },
    { bpm: 124, chords: [[50, 'm'], [46, 'M'], [43, 'm'], [45, 'M']] },
    { bpm: 100, chords: [[48, 'M7'], [57, 'm7'], [53, 'M7'], [55, 'M']] },
  ];
  const TONES = { m: [0, 3, 7, 12, 15], M: [0, 4, 7, 12, 16], M7: [0, 4, 7, 11, 14], m7: [0, 3, 7, 10, 14] };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
      fxBus = ctx.createGain(); fxBus.gain.value = 0.8; fxBus.connect(master);
      delay = ctx.createDelay(1); delay.delayTime.value = 0.32;
      const fb = ctx.createGain(); fb.gain.value = 0.38;
      const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
      delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // engine: two detuned oscillators through a moving low-pass
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 9;
      f.type = 'lowpass'; f.Q.value = 5; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(fxBus); o1.start(); o2.start();
      eng = { o1, o2, f, g };
      timer = setInterval(schedule, 60);
    } catch (e) { ctx = null; }
  }

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(type, f0, f1, dur, vol, dest, t) {
    if (!ctx) return;
    t = t || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, vol, dur);
    o.connect(g); g.connect(dest || fxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, f0, f1, type, q) {
    if (!ctx) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type || 'lowpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(fxBus); s.start(t); s.stop(t + dur + 0.05);
  }

  const FX = {
    jump: () => tone('sine', 260, 620, 0.16, 0.25),
    pad: () => { tone('sine', 200, 1100, 0.4, 0.3); noise(0.4, 0.15, 400, 5000, 'bandpass', 2); },
    land: () => { noise(0.14, 0.3, 500, 90); tone('sine', 110, 55, 0.14, 0.3); },
    bump: () => { noise(0.2, 0.4, 900, 100); tone('square', 90, 45, 0.2, 0.2); },
    bonk: () => tone('triangle', 180, 90, 0.12, 0.3),
    scrape: () => noise(0.12, 0.12, 2500, 900, 'bandpass', 3),
    crash: () => { noise(0.9, 0.9, 5000, 60); tone('sawtooth', 160, 28, 0.8, 0.5); tone('sine', 70, 30, 0.9, 0.6); },
    fall: () => { tone('sine', 500, 50, 1.0, 0.35); noise(0.9, 0.2, 2000, 100); },
    shard: () => { const t = ctx.currentTime; tone('sine', 1319, 1319, 0.12, 0.22, fxBus, t); tone('sine', 1976, 1976, 0.25, 0.2, fxBus, t + 0.07); },
    boost: () => { noise(0.6, 0.3, 300, 6000, 'bandpass', 1.5); tone('sawtooth', 110, 440, 0.5, 0.12); },
    recharge: () => { const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.18, 0.2, fxBus, t + i * 0.06)); },
    finish: () => { const t = ctx.currentTime; [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone('triangle', f, f, 0.5, 0.22, fxBus, t + i * 0.09)); },
    ui: () => tone('sine', 660, 880, 0.07, 0.12),
  };
  function play(name) { if (ctx && !muted && FX[name]) { try { FX[name](); } catch (e) {} } }

  function engine(speed, on, boosting) {   // speed 0..~1.4
    if (!eng) return;
    const t = ctx.currentTime;
    eng.o1.frequency.setTargetAtTime(48 + speed * 70, t, 0.08);
    eng.o2.frequency.setTargetAtTime(96.5 + speed * 141, t, 0.08);
    eng.f.frequency.setTargetAtTime(220 + speed * 1100 + (boosting ? 900 : 0), t, 0.1);
    eng.g.gain.setTargetAtTime(on ? 0.05 + speed * 0.06 : 0, t, 0.12);
  }

  function schedule() {
    if (!ctx || !musicOn || ctx.state !== 'running') return;
    const song = SONGS[sector % SONGS.length], sp = 60 / song.bpm / 4;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 16) % 4, s = step % 16, [rootN, q] = song.chords[bar], tones = TONES[q], t = nextT;
      if (s === 0) {            // pad
        for (const iv of [tones[0], tones[1], tones[2]]) for (const det of [-6, 6]) {
          const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = mtof(rootN + iv); o.detune.value = det;
          f.type = 'lowpass'; f.frequency.value = 700;
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + sp * 5); g.gain.linearRampToValueAtTime(0.0001, t + sp * 17);
          o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + sp * 17.5);
        }
      }
      if ([0, 3, 6, 8, 11, 14].includes(s)) {   // bass
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = mtof(rootN - 24 + (s === 11 ? 12 : 0));
        f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(140, t + sp * 1.8);
        env(g, t, 0.01, 0.22, sp * 2);
        o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + sp * 2.2);
      }
      if (s % 2 === 0 || s === 7 || s === 13) {  // arp
        const idx = [0, 2, 4, 3, 1, 3, 4, 2][(step >> 1) % 8];
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = mtof(rootN + 12 + tones[idx]);
        env(g, t, 0.005, s % 4 === 0 ? 0.11 : 0.07, sp * 1.6);
        o.connect(g); g.connect(musicBus); g.connect(delay); o.start(t); o.stop(t + sp * 2);
      }
      if (s % 4 === 2) {        // hat
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
        env(g, t, 0.002, 0.05, 0.05);
        src.connect(f); f.connect(g); g.connect(musicBus); src.start(t, Math.random() * 0.5, 0.08);
      }
      step++; nextT += sp;
    }
  }

  root.SFX = {
    init, play, engine,
    music(on, sec) { musicOn = on; if (sec !== undefined && sec !== sector) { sector = sec; step = 0; } },
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); },
    isMuted: () => muted,
  };
})(window);
